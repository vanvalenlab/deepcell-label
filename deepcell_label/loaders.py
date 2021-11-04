"""
Classes to load external data from URLs into a DeepCell Label Project.
Loads or creates raw_array, label_array, cell_ids, and cell_info.
"""

import pathlib

import requests
import numpy as np

from deepcell_label.imgutils import reshape
from deepcell_label.labelmaker import LabelInfoMaker
from deepcell_label.config import REGISTRY_PATH
from deepcell_label.load_utils import is_npz, is_trk, is_png, is_tiff, is_zip
from deepcell_label.load_utils import load_npz, load_png, load_tiff, load_zip
from deepcell_label.load_utils import load_raw_npz, load_labeled_npz
from deepcell_label.load_utils import load_raw_trk, load_labeled_trk, load_lineage_trk


DCL_AXES = 'ZYXC'


class Loader():
    """
    Interface for loading files into DeepCell Label.
    """

    def __init__(self):
        self.path = ''
        self.labeled_path = ''
        self.raw_array = None
        self.label_array = None
        self.cell_info = None
        self.cell_ids = None

        self.input_axes = DCL_AXES
        self.output_axes = DCL_AXES

    @property
    def is_tracking(self):
        """Tracking project when either the labels or raw are .trk."""
        return (self.labeled_path and is_trk(self.labeled_path)) or is_trk(self.path)

    def add_semantic_labels(self):
        label_maker = LabelInfoMaker(self.label_array, tracking=True)
        self.cell_ids = label_maker.cell_ids
        if self.cell_info is None:
            self.cell_info = label_maker.cell_info

    def load_combined(self, data):
        """
        Loads image data into the Loader based on the file extension.
        """
        label_array = None
        # Load arrays
        if is_npz(self.path):
            raw_array = load_raw_npz(data)
            label_array = load_labeled_npz(data)
        elif is_trk(self.path):
            raw_array = load_raw_trk(data)
            label_array = load_labeled_trk(data)
        elif is_png(self.path):
            raw_array = load_png(data)
        elif is_tiff(self.path):
            raw_array = load_tiff(data)
        elif is_zip(self.path):
            raw_array = load_zip(data)
        else:
            ext = pathlib.Path(self.path).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))

        # Reshape or create arrays
        raw_array = reshape(raw_array, self.input_axes, self.output_axes)
        if label_array is None:
            # Substitute channels dimension with one feature
            shape = (*raw_array.shape[:-1], 1)
            label_array = np.zeros(shape)
        else:
            label_array = reshape(label_array, self.input_axes, self.output_axes)

        self.raw_array = raw_array
        self.label_array = label_array

    def load_raw(self, data):
        if is_npz(self.path):
            raw_array = load_raw_npz(data)
        elif is_trk(self.path):
            raw_array = load_raw_trk(data)
        elif is_png(self.path):
            raw_array = load_png(data)
        elif is_tiff(self.path):
            raw_array = load_tiff(data)
        elif is_zip(self.path):
            raw_array = load_zip(data)
        else:
            ext = pathlib.Path(self.path).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))

        self.raw_array = reshape(raw_array, self.input_axes, self.output_axes)

    def load_labeled(self, data):
        if is_npz(self.labeled_path):
            label_array = load_labeled_npz(data)
            if label_array is None:
                label_array = load_npz(data)
        elif is_trk(self.labeled_path):
            label_array = load_labeled_trk(data)
        elif is_png(self.labeled_path):
            label_array = load_png(data)
        elif is_tiff(self.labeled_path):
            label_array = load_tiff(data)
        elif is_zip(self.labeled_path):
            label_array = load_zip(data)
        else:
            ext = pathlib.Path(self.labeled_path).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))

        self.label_array = reshape(label_array, 'CZYX', self.output_axes)


class PathLoader(Loader):
    """
    Loader implementation for files sent in a request, like a drag-and-dropped file.
    """

    def __init__(self, request):
        super(PathLoader, self).__init__()
        form = request.form
        self.source = 'lfs'
        self.path = form['file']
        self.input_axes = 'BZYXC'
        with open(pathlib.Path(REGISTRY_PATH, self.path), 'rb') as f:
            self.data = f.read()
        self.load()

    def load(self):
        label_array = None
        # Load arrays
        if is_npz(self.path):
            raw_array = load_raw_npz(self.data)
            label_array = load_labeled_npz(self.data)
        elif is_png(self.path):
            raw_array = load_png(self.data)
        elif is_tiff(self.path):
            raw_array = load_tiff(self.data)
        elif is_trk(self.path):
            raw_array = load_raw_trk(self.data)
            label_array = load_labeled_trk(self.data)
            self.cell_info = load_lineage_trk(self.data)
        else:
            ext = pathlib.Path(self.path).suffix
            raise InvalidExtension('Invalid file extension: {}'.format(ext))

        # Reshape or create arrays
        raw_array = reshape(raw_array, self.input_axes, self.output_axes)
        if label_array is None:
            # Substitute channels dimension with one feature
            shape = (*raw_array.shape[:-1], 1)
            label_array = np.zeros(shape)
        else:
            label_array = reshape(label_array, self.input_axes, self.output_axes)

        self.raw_array = raw_array
        self.label_array = label_array

        self.add_semantic_labels()


class FileLoader(Loader):
    """
    Loader implementation for files sent in a request, like a drag-and-dropped file.
    """

    def __init__(self, request):
        super(FileLoader, self).__init__()
        file_ = request.files.get('file')
        self.input_axes = request.form['axes'] if 'axes' in request.form else DCL_AXES
        self.output_axes = DCL_AXES
        self.data = file_.stream.read()
        self.path = file_.filename
        self.source = 'dropped'
        self.load()

    def load(self):
        label_array = None
        # Load arrays
        if is_npz(self.path):
            raw_array = load_raw_npz(self.data)
            label_array = load_labeled_npz(self.data)
        elif is_png(self.path):
            raw_array = load_png(self.data)
        elif is_tiff(self.path):
            raw_array = load_tiff(self.data)
        elif is_trk(self.path):
            raw_array = load_raw_trk(self.data)
            label_array = load_labeled_trk(self.data)
            self.cell_info = load_lineage_trk(self.data)
        else:
            ext = pathlib.Path(self.path).suffix
            raise InvalidExtension('Invalid file extension: {}'.format(ext))

        # Reshape or create arrays
        raw_array = reshape(raw_array, self.input_axes, self.output_axes)
        if label_array is None:
            # Substitute channels dimension with one feature
            shape = (*raw_array.shape[:-1], 1)
            label_array = np.zeros(shape)
        else:
            label_array = reshape(label_array, self.input_axes, self.output_axes)

        self.raw_array = raw_array
        self.label_array = label_array

        self.add_semantic_labels()


class URLLoader(Loader):
    """
    Loader implementation for downloading files from URLs.
    """

    def __init__(self, url_form):
        super(URLLoader, self).__init__()
        self.source = 's3'
        self.path = url_form['url']
        self.labeled_path = url_form['labeled_url'] if 'labeled_url' in url_form else None
        self.input_axes = url_form['axes'] if 'axes' in url_form else DCL_AXES
        self.output_axes = DCL_AXES

        self.load()

    def load(self):
        data = requests.get(self.path).content
        if self.labeled_path is None:
            self.load_combined(data)
            if is_trk(self.path):
                self.cell_info = load_lineage_trk(data)
        else:
            labeled_data = requests.get(self.labeled_path).content
            self.load_raw(data)
            self.load_labeled(labeled_data)
            if is_trk(self.labeled_path):
                self.cell_info = load_lineage_trk(labeled_data)

        self.add_semantic_labels()


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
        rv['error'] = self.message
        return rv
