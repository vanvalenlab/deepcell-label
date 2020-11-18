import pathlib

import boto3

from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_INPUT_BUCKET

class CalibanLoader():
    """
    Interface for loading files into Caliban.
    """

    def __init__(self):
        self._raw_array = None
        self._label_array = None
        self._cell_ids = None
        self._cell_info = None
        self._label_maker = None

        self._load()

    @property
    def raw_array(self):
        """
        Returns:
            ndarray: raw image data
        """
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
            self._label_array = np.zeroes(shape)
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
            self._label_maker = LabelMaker(self.label_array)
        return self._label_maker

    def _load(self):
        """
        Loads image data into the Loader.
        To be implemented by implementations of CalibanLoader interface.
        """
        raise NotImplementedError

    def _get_load(self):
        """
        Simple factory to get the right
        Returns:
            function: loads a response body from S3
        """
        if is_npz_file(filename):
            load_fn = load_npz
        elif is_trk_file(filename):
            load_fn = load_trks
        elif is_png_file(filename):
            load_fn = load_png
        elif is_tiff_file(filename):
            load_fn = load_tiff
        else:
            raise ValueError('Cannot load file: {}'.format(filename))
        return load_fn

    def _load_npz(self, path):
        """
        Loads a NPZ file into the Loader.

        Args:
            path: full path to the file including .npz extension
        """
        data = io.BytesIO(path)
        npz = np.load(data)

        # standard nomenclature for image (X) and labeled (y)
        if 'y' in npz.files:
            raw_stack = npz['X']
            labeled_stack = npz['y']

        # some files may have alternate names 'raw' and 'annotated'
        elif 'raw' in npz.files:
            raw_stack = npz['raw']
            labeled_stack = npz['annotated']

        # if files are named something different, give it a try anyway
        else:
            raw_stack = npz[npz.files[0]]
            labeled_stack = npz[npz.files[1]]
        
        self._raw_array = raw_stack
        self._label_array = labeled_stack

    def _load_trk(self, path):
        """
        Load a .trk file into the Loader.

        Args:
            path (str): full path to the file including .trk/.trks
        """
        with tempfile.NamedTemporaryFile() as temp:
            temp.write(path)
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
            self._cell_info = {0: trial['lineages'][0]}

    def _load_png(self):
        """Loads a png file into a raw image array."""
        pass


    def _load_tiff(self):
        """Loads a tiff file into a raw image array."""
        pass


class S3Loader(CalibanLoader):
    """
    Implementation of CalibanLoader interface for S3 buckets.
    """

    def __init__(self, path, bucket=S3_INPUT_BUCKET):
        super(ZStackEdit, self).__init__()
        self.path = path  # full path to the file within the bucket, including the filename
        self.bucket = bucket  # bucket to pull file from on S3
        self.filename = str(pathlib.Path(path).name)

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
        response = s3.get_object(Bucket=self.input_bucket, Key=self.path)
        
        load_fn = get_load(self.filename)
        load_fn(response['Body'].read())
        
        logger.debug('Loaded file %s from S3 in %s s.',
                     self.filename, timeit.default_timer() - start)


class LocalFileSystemLoader():
    """
    CalibanLoader implementation for local file systems.
    """
    def __init__(self, path):
        # path to file including filename
        self.path = pathlib.Path(path)
        # filename for getting appropriate load/upload functions
        self.filename = self.path.name

    def _load():
        load_fn = get_load(self.filename)
        with open(self.path , 'rb') as f:
            load_fn(f)


class AttachmentLoader():
    """
    CalibanLoader implementation for dragging and dropping image files onto a Caliban webpage.
    """

    def __init__(self, filename):
        self.filename = filename

    def _load():


def load_png(filename):
    """
    Loads a png file into a raw image array
    and makes an empty label array to pair with it.
    """

    return raw_array, label_array

def load_tiff(filename):
    """
    Loads a tiff file into a raw image array
    and makes an empty label array to pair with it.
    """
    return raw_array, label_array

