"""
TEST MODULE; exploring loading only from URLs instead of file input & paths to S3 buckets
Classes to load external data from URLs into a DeepCell Label Project.
Loads or creates raw_array, label_array, cell_ids, and cell_info.
"""

import io
import json
import pathlib
from sys import path
from flask.globals import request
import requests
import timeit
import tempfile
import tarfile
import zipfile

import boto3
import imageio
import numpy as np
from PIL import Image
from skimage.external.tifffile import TiffFile

from imgutils import reshape
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_INPUT_BUCKET
from labelmaker import LabelInfoMaker

DCL_AXES = 'ZYXC'


class Loader():
    """
    Interface for loading files into DeepCell Label.
    """

    def __init__(self, url_form):
        self.url = url_form['url']
        self.labeled_url = url_form['labeled_url'] if 'labeled_url' in url_form else None
        self.input_axes = url_form['axes'] if 'axes' in url_form else DCL_AXES
        self.output_axes = DCL_AXES

        if self.labeled_url is None:
            self.load()
            tracking = is_trk(self.url)
        else:
            self.load_raw()
            self.load_labeled()
            tracking = is_trk(self.labeled_url)

        label_maker = LabelInfoMaker(self.label_array, tracking)
        self.cell_ids = label_maker.cell_ids
        self.cell_info = label_maker.cell_info

    def load(self):
        """
        Loads image data into the Loader based on the file extension.
        """
        url = self.url
        r = requests.get(url)
        data = io.BytesIO(r.content)
        # if r.status_code !== 200:
        #     raise ValueError(r.status_code)
        if is_npz(url):
            raw_array = load_raw_npz(data)
            label_array = load_labeled_npz(data)
        elif is_trk(url):
            raw_array = load_raw_trk(data)
            label_array = load_labeled_trk(data)
            self._cell_info = load_lineage_trk(data)
        elif is_png(url):
            raw_array = load_png(data)
            label_array = np.zeros(raw_array.shape)
        elif is_tiff(url):
            raw_array = load_tiff(data)
            label_array = np.zeros(raw_array.shape)
        else:
            ext = pathlib.Path(url).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))

        if label_array is None:
            label_array = np.zeros(raw_array.shape)

        self.raw_array = reshape(raw_array, self.input_axes, self.output_axes)
        self.label_array = reshape(label_array, self.input_axes, self.output_axes)

    def load_raw(self):
        url = self.url
        r = requests.get(url)
        data = io.BytesIO(r.content)
        # if r.status_code !== 200:
        #     raise ValueError(r.status_code)
        if is_npz(url):
            raw_array = load_raw_npz(data)
        elif is_trk(url):
            raw_array = load_raw_trk(data)
        elif is_png(url):
            raw_array = load_png(data)
        elif is_tiff(url):
            raw_array = load_tiff(data)
        else:
            ext = pathlib.Path(url).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))
        self.raw_array = reshape(raw_array, self.input_axes, self.output_axes)

    def load_labeled(self):
        url = self.labeled_url
        r = requests.get(url)
        data = io.BytesIO(r.content)
        # if r.status_code !== 200:
        #     raise ValueError(r.status_code)
        if is_npz(url):
            label_array = load_labeled_npz(data)
            if label_array is None:
                label_array = load_npz(data)
        elif is_trk(url):
            label_array = load_labeled_trk(data)
            # self._cell_info = load_lineage_trk(data)
        elif is_png(url):
            label_array = load_png(data)
        elif is_tiff(url):
            label_array = load_tiff(data)
        elif is_zip(url):
            label_array = load_zip(data)
        else:
            ext = pathlib.Path(url).suffix
            raise InvalidExtension('invalid file extension: {}'.format(ext))
        self.label_array = reshape(label_array, 'CZYX', self.output_axes)


def is_npz(url):
    return pathlib.Path(url).suffix in {'.npz'}


def is_trk(url):
    return pathlib.Path(url).suffix in {'.trk', '.trks'}


def is_png(url):
    return pathlib.Path(url).suffix in {'.png'}


def is_tiff(url):
    return pathlib.Path(url).suffix in {'.tiff', '.tif'}


def is_zip(url):
    return pathlib.Path(url).suffix in {'.zip'}


def load_npz(data):
    """Returns the first array in an npz."""
    npz = np.load(data)
    return npz[npz.files[0]]

def load_raw_npz(data):
    """
    Returns raw image array from an NPZ file.
    """
    npz = np.load(data)

    # standard names for image (X) and labeled (y)
    if 'X' in npz.files:
        return npz['X']
    # alternate names 'raw' and 'annotated'
    elif 'raw' in npz.files:
        return npz['raw']
    # if filenames are different, try to load them anyways
    else:
        return npz[npz.files[0]]


def load_labeled_npz(data):
    """
    Returns labeled image array from an NPZ file.
    Returns None when the labeled image array is not present.
    """
    npz = np.load(data)

    # Look for label filenames
    if 'y' in npz.files:
        return npz['y']
    elif 'annotated' in npz.files:
        return npz['annotated']
    elif len(npz.files) > 1:
        return npz[npz.files[1]]


def load_raw_trk(data):
    """Load a raw image data from a .trk file."""
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(data.read())
        with tarfile.open(temp.name, 'r') as trks:
            with io.BytesIO() as array_file:
                array_file.write(trks.extractfile('raw.npy').read())
                array_file.seek(0)
                return np.load(array_file)


def load_labeled_trk(data):
    """Load a labeled image data from a .trk file."""
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(data.read())
        with tarfile.open(temp.name, 'r') as trks:
            with io.BytesIO() as array_file:
                array_file.write(trks.extractfile('tracked.npy').read())
                array_file.seek(0)
                return np.load(array_file)


def load_lineage_trk(data):
    """Loads a lineage JSON from a .trk file."""
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(data.read())
        with tarfile.open(temp.name, 'r') as trks:
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
            return {0: lineages[0]}


def load_png(data):
    """Returns image array from a PNG file."""
    return np.array(Image.open(data))


def load_tiff(data):
    """Returns image array from a TIFF file."""
    # return np.asarray(imageio.imread(data))
    return TiffFile(data).asarray()


def load_zip(data):
    """Loads a series of image arrays from a zip of TIFF files."""
    zf = zipfile.ZipFile(data, 'r')
    channels = [load_tiff(io.BytesIO(zf.open(info).read())) for info in zf.filelist]
    return np.array(channels)


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
