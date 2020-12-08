import io
import json
import pathlib
import timeit
import tempfile
import tarfile

import boto3
import imageio
import numpy as np
from PIL import Image

from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_INPUT_BUCKET
from labelmaker import LabelInfoMaker


class Loader():
    """
    Interface for loading files into DeepCell Label.
    """

    def __init__(self):
        self._raw_array = None
        self._label_array = None
        self._cell_ids = None
        self._cell_info = None
        self._label_maker = None

        self._path = None

    @property
    def path(self):
        assert self._path is not None
        return str(self._path)

    @property
    def raw_array(self):
        """
        Returns:
            ndarray: raw image data
        """
        if self._raw_array is None:
            self._load()
            assert self._raw_array is not None
        # Add frame dimension
        if self._raw_array.ndim == 3:
            self._raw_array = np.expand_dims(self._raw_array, axis=0)
        return self._raw_array

    @property
    def label_array(self):
        """
        Returns:
            ndarray: label image data
        """
        if self._label_array is None:
            # Replace the channels dimension with 1 feature
            # NOTE: ImageJ loads channels first
            # may need to ask users if the channels are first or last
            # think more carefully about handling the shape
            # may not be channels for PNG
            shape = (*self.raw_array.shape[:-1], 1)
            self._label_array = np.zeros(shape)
        # Add frame dimension
        if self._label_array.ndim == 3:
            self._label_array = np.expand_dims(self._label_array, axis=0)
        return self._label_array

    @property
    def cell_ids(self):
        """
        Returns:
            dict: contains a dict for each feature, which contains a 1D ndarray
                  with the labels present in that feature
        """
        if self._cell_ids is None:
            self._cell_ids = self.label_maker.cell_ids
        return self._cell_ids

    @property
    def cell_info(self):
        """
        Returns:
            dict: contains a dict for each feature, each with a dict for each label
                  each label dict has
                  'label': a string version of the label
                  'frames': a list of frames the label is present in
                  'slices': empty string, to be filled in with the readable frames (e.g. [0-20])
        """
        if self._cell_info is None:
            self._cell_info = self.label_maker.cell_info
        return self._cell_info

    @property
    def label_maker(self):
        if self._label_maker is None:
            self._label_maker = LabelInfoMaker(self.label_array)
        return self._label_maker

    def _load(self):
        """
        Loads image data into the Loader.
        To be implemented by implementations of Loader interface.
        """
        raise NotImplementedError

    def _get_load(self):
        """
        Simple factory to get the right
        Returns:
            function: loads a response body from S3
        """
        if self._path.suffix in {'.npz'}:
            load_fn = self._load_npz
        elif self._path.suffix in {'.trk', '.trks'}:
            load_fn = self._load_trk
        elif self._path.suffix in {'.png'}:
            load_fn = self._load_png
        elif self._path.suffix in {'.tiff'}:
            load_fn = self._load_tiff
        else:
            raise ValueError('Cannot load file: {}'.format(self.path))
        return load_fn

    def _load_npz(self, data):
        """
        Loads a NPZ file into the Loader.
        """
        npz = np.load(data)

        # standard nomenclature for image (X) and labeled (y)
        if 'X' in npz.files:
            self._raw_array = npz['X']
            if 'y' in npz.files:
                self._label_array = npz['y']

        # some files may have alternate names 'raw' and 'annotated'
        elif 'raw' in npz.files:
            self._raw_array = npz['raw']
            if 'annotated' in npz.files:
                self._label_array = npz['annotated']

        # if files are named something different, give it a try anyway
        else:
            self._raw_array = npz[npz.files[0]]
            if len(npz.files > 1):
                self._label_array = npz[npz.files[1]]

    def _load_trk(self, data):
        """
        Load a .trk file into the Loader.
        """
        with tempfile.NamedTemporaryFile() as temp:
            temp.write(data.read())
            with tarfile.open(temp.name, 'r') as trks:

                # numpy can't read these from disk...
                array_file = io.BytesIO()
                array_file.write(trks.extractfile('raw.npy').read())
                array_file.seek(0)
                self._raw_array = np.load(array_file)
                array_file.close()

                array_file = io.BytesIO()
                array_file.write(trks.extractfile('tracked.npy').read())
                array_file.seek(0)
                self._label_array = np.load(array_file)
                array_file.close()

                try:
                    trk_data = trks.getmember('lineages.json')
                except KeyError:
                    try:
                        trk_data = trks.getmember('lineage.json')
                    except KeyError:
                        raise ValueError('Invalid .trk file, no lineage data found.')

                lineages = json.loads(trks.extractfile(trk_data).read().decode())
                lineages = lineages if isinstance(lineages, list) else [lineages]

                # JSON only allows strings as keys, so convert them back to ints
                for i, tracks in enumerate(lineages):
                    lineages[i] = {int(k): v for k, v in tracks.items()}

            # Track files have only one feature and one lineage
            if len(lineages) != 1:
                raise ValueError('Input file has multiple trials/lineages.')
            self._cell_info = {0: lineages[0]}

    def _load_png(self, data):
        """Loads a png file into a raw image array."""
        im = Image.open(data)
        im = np.array(im)
        # Dimensions are height, width, channels
        assert (len(im.shape) == 3)
        if im.shape[-1] > 3:
            im = im[..., :3]
        # Add frame dimension
        im = np.expand_dims(im, axis=0)
        self._raw_array = im

    def _load_tiff(self, data):
        """Loads a tiff file into a raw image array."""
        im = Image.open(data)
        im = np.array(im)
        # TODO: dimension checking
        self._raw_array = im


class S3Loader(Loader):
    """
    Loader implmentation for S3 buckets.
    """

    def __init__(self, path, bucket=S3_INPUT_BUCKET):
        super(S3Loader, self).__init__()
        # full path to file within bucket, including filename
        self._path = pathlib.Path(path.replace('__', '/'))
        # bucket to pull file from on S3
        self.bucket = bucket
        self.source = 's3'

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def _load(self):
        """
        Load a file from the S3 input bucket.
        """
        start = timeit.default_timer()

        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=self.bucket, Key=str(self.path))

        data = io.BytesIO(response['Body'].read())
        load_fn = self._get_load()
        load_fn(data)

        # logger.debug('Loaded file %s from S3 in %s s.',
        #              self.path, timeit.default_timer() - start)


class LocalFileSystemLoader(Loader):
    """
    Loader implementation for local file systems.
    """
    def __init__(self, path):
        super(LocalFileSystemLoader, self).__init__()
        # path to file including filename
        self._path = pathlib.Path(path.replace('__', '/'))
        self.source = 'lfs'

    def _load(self):
        load_fn = self._get_load()
        with open(self.path, 'rb') as data:
            load_fn(data)


class DroppedLoader(Loader):
    """
    Loader implementation for dragging and dropping image files onto DeepCell Label.
    """

    def __init__(self, f):
        super(DroppedLoader, self).__init__()
        self._data = f
        self._path = pathlib.Path(f.filename)
        self.source = 'dropped'

    def _load(self):
        load_fn = self._get_load()
        load_fn(self._data)


def get_loader(request):
    """
    Simple factory for Loaders.

    Args:
        request (flask.Request): request to /load

    Returns:
        Loader
    """
    source = request.args.get('source')
    if source == 'dropped':
        loader = DroppedLoader(request.files.get('file'))
    elif source == 's3':
        loader = S3Loader(request.args.get('path'))
    elif source == 'lfs':
        loader = LocalFileSystemLoader(request.args.get('path'))
    else:
        raise ValueError('invalid source: choose from "dropped", "s3", and "lfs"')
    return loader
