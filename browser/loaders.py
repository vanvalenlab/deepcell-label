"""
Classes to load external data into a DeepCell Label Project.
Provides access to raw_array, label_array, cell_ids, and cell_info
while creating a Project.
"""

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
from skimage.external import tifffile

from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_INPUT_BUCKET
from labelmaker import LabelInfoMaker


class Loader():
    """
    Interface for loading files into DeepCell Label.
    """

    def __init__(self):
        self._raw_array = None
        self._label_array = None
        self._label_maker = None
        self.path = ''
        self._tracking = False

    @property
    def tracking(self):
        if pathlib.Path(self.path).suffix in {'.trk', '.trks'}:
            self._tracking = True
        return self._tracking

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
        return self.label_maker.cell_ids

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
        return self.label_maker.cell_info

    @property
    def label_maker(self):
        if self._label_maker is None:
            self._label_maker = LabelInfoMaker(self.label_array, self.tracking)
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
        path = pathlib.Path(self.path)
        if path.suffix in {'.npz'}:
            load_fn = self._load_npz
        elif path.suffix in {'.trk', '.trks'}:
            load_fn = self._load_trk
        elif path.suffix in {'.png'}:
            load_fn = self._load_png
        elif path.suffix in {'.tiff', '.tif'}:
            load_fn = self._load_tiff
        else:
            raise InvalidExtension('Cannot load file: {}'.format(path))
        return load_fn

    def _load_npz(self, data):
        """
        Loads a NPZ file into the Loader.
        """
        npz = np.load(data)

        # standard names for image (X) and labeled (y)
        if 'X' in npz.files:
            self._raw_array = npz['X']
        # alternate names 'raw' and 'annotated'
        elif 'raw' in npz.files:
            self._raw_array = npz['raw']
        # if filenames are different, try to load them anyways
        else:
            self._raw_array = npz[npz.files[0]]

        # Look for label filenames independently of raw names
        if 'y' in npz.files:
            self._label_array = npz['y']
        elif 'annotated' in npz.files:
                self._label_array = npz['annotated']
        elif len(npz.files) > 1:
                self._label_array = npz[npz.files[1]]

    def _load_trk(self, data):
        """
        Load a .trk file into the Loader.
        """
        self._tracking = True
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
        img = Image.open(data)
        img = np.array(img)
        # Dimensions are height, width, channels
        assert (len(img.shape) == 3)
        if img.shape[-1] > 3:
            img = img[..., :3]
        # Add frame dimension
        img = np.expand_dims(img, axis=0)
        self._raw_array = img

    # TODO: expose channel_first option to front-end
    def _load_tiff(self, data, channels_first=False):
        """Loads a tiff file into a raw image array."""
        img = tifffile.imread(data)
        # DeepCell Label expects channels to be the last dimension
        if channels_first:
            img = np.moveaxis(img, 0, -1)
        # Add frame dimension if missing
        if img.ndim == 3:
            img = np.expand_dims(img, axis=0)
        self._raw_array = img


class S3Loader(Loader):
    """
    Loader implmentation for S3 buckets.
    """

    def __init__(self, path, bucket):
        super(S3Loader, self).__init__()
        # full path to file within bucket, including filename
        self.path = path.replace('__', '/')
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
        load_fn = self._get_load()

        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=self.bucket, Key=str(self.path))

        data = io.BytesIO(response['Body'].read())
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
        self.path = path.replace('__', '/')
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
        self.path = f.filename
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
        loader = S3Loader(request.args.get('path'), request.args.get('bucket'))
    elif source == 'lfs':
        loader = LocalFileSystemLoader(request.args.get('path'))
    else:
        raise ValueError('invalid source: choose from "dropped", "s3", and "lfs"')
    return loader


class InvalidExtension(Exception):
    status_code = 415

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv
