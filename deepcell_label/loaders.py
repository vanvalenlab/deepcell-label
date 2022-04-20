"""
Class to load data into a DeepCell Label project file
Loads both raw image data and labels
"""

import io
import json
import tempfile
import zipfile

import magic
import numpy as np
from PIL import Image
from tifffile import TiffFile, TiffWriter

from deepcell_label.labelmaker import LabelInfoMaker


class Loader:
    """
    Loads and writes data into a DeepCell Label project zip.
    """

    def __init__(self, image_file=None, label_file=None):
        self.X = None
        self.y = None
        self.cells = None
        self.spots = None

        self.image_file = image_file
        self.label_file = label_file if label_file else image_file

        with tempfile.TemporaryFile() as project_file:
            with zipfile.ZipFile(project_file, 'w', zipfile.ZIP_DEFLATED) as zip:
                self.zip = zip
                self.load()
                self.write()
            project_file.seek(0)
            self.data = project_file.read()

    def load(self):
        """Loads data from input files."""
        self.X = load_images(self.image_file)
        self.y = load_segmentation(self.label_file)
        self.spots = load_spots(self.label_file)

        if self.y is None:
            shape = (*self.X.shape[:-1], 1)
            self.y = np.zeros(shape)

    def write(self):
        """Writes loaded data to zip."""
        self.write_images()
        self.write_segmentation()
        self.write_cells()
        self.write_spots()

    def write_images(self):
        """
        Writes raw images to X.ome.tiff in the output zip.

        Raises:
            ValueError: no image data has been loaded to write
        """
        X = self.X
        if X is not None:
            # Rescale data
            max, min = np.max(X), np.min(X)
            X = (X - min) / (max - min if max - min > 0 else 1) * 255
            X = X.astype(np.uint8)
            # Move channel axis
            X = np.moveaxis(X, -1, 1)
            images = io.BytesIO()
            with TiffWriter(images, ome=True) as tif:
                tif.save(X, metadata={'axes': 'ZCYX'})
            images.seek(0)
            self.zip.writestr('X.ome.tiff', images.read())
        # else:
        #     raise ValueError('No images found in files')

    def write_segmentation(self):
        """Writes segmentation to y.ome.tiff in the output zip."""
        y = self.y
        if y.shape[:-1] != self.X.shape[:-1]:
            raise ValueError(
                'Segmentation shape %s is incompatible with image shape %s'
                % (y.shape, self.X.shape)
            )
        # TODO: check if float vs int matters
        y = y.astype(np.int32)
        # Move channel axis
        y = np.moveaxis(y, -1, 1)

        segmentation = io.BytesIO()
        with TiffWriter(segmentation, ome=True) as tif:
            tif.save(y, metadata={'axes': 'ZCYX'})
        segmentation.seek(0)
        self.zip.writestr('y.ome.tiff', segmentation.read())

    def write_spots(self):
        """Writes spots to spots.csv in the output zip."""
        if self.spots is not None:
            buffer = io.BytesIO()
            buffer.write(self.spots)
            buffer.seek(0)
            self.zip.writestr('spots.csv', buffer.read())

    def write_cells(self):
        """Writes cells to cells.json in the output zip."""
        cells = LabelInfoMaker(self.y).cell_info
        self.zip.writestr('cells.json', json.dumps(cells))


def load_images(image_file):
    """
    Loads image data from image file.

    Args:
        image_file: zip, npy, tiff, or png file object containing image data

    Returns:
        numpy array or None if no image data found
    """
    X = load_zip(image_file)
    if X is None:
        X = load_npy(image_file)
    if X is None:
        X = load_tiff(image_file)
    if X is None:
        X = load_png(image_file)
    return X


def load_segmentation(f):
    """
    Loads segmentation array from label file.

    Args:
        label_file: file with zipped npy or tiff containing segmentation data

    Returns:
        numpy array or None if no segmentation data found
    """
    f.seek(0)
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        y = load_zip_numpy(zf, name='y')
        if y is None:
            y = load_zip_tiffs(zf)
        return y


def load_spots(f):
    """
    Load spots data from label file.

    Args:
        zf: file with zipped csv containing spots data

    Returns:
        bytes read from csv in zip or None if no csv in zip
    """
    f.seek(0)
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        return load_zip_csv(zf)


def load_zip_numpy(zf, name='X'):
    """
    Loads a numpy array from the zip file
    If loading an NPZ with multiple arrays, name selects which one to load

    Args:
        zf: a ZipFile with a npy or npz file
        name (str): name of the array to load

    Returns:
        numpy array or None if no png in zip
    """
    for filename in zf.namelist():
        if filename == f'{name}.npy':
            with zf.open(filename) as f:
                return np.load(f)
        if filename.endswith('.npz'):
            with zf.open(filename) as f:
                npz = np.load(f)
                return npz[name] if name in npz.files else npz[npz.files[0]]


def load_zip_tiffs(zf):
    """
    Returns an array with all tiff image data in the zip file

    Args:
        zf: a ZipFile containing tiffs to load

    Returns:
        numpy array or None if no png in zip
    """
    tiffs = []
    for name in zf.namelist():
        with zf.open(name) as f:
            if 'TIFF image data' in magic.from_buffer(f.read(2048)):
                f.seek(0)
                tiff = TiffFile(f).asarray()
                tiffs.append(tiff)
    if len(tiffs) > 0:
        # Stack channels on last axis
        y = np.stack(tiffs, axis=-1)
        # Add frame axis
        if y.ndim == 3:
            y = y[np.newaxis, ...]
        return y


def load_zip_png(zf):
    """
    Returns the image data array for the first PNG image in the zip file

    Args:
        zf: a ZipFile with a PNG

    Returns:
        numpy array or None if no png in zip
    """
    for name in zf.namelist():
        with zf.open(name) as f:
            if 'PNG image data' in magic.from_buffer(f.read(2048)):
                f.seek(0)
                png = Image.open(f)
                return np.array(png)


def load_zip_csv(z):
    """
    Returns the binary data for the first CSV file in the zip file, if it exists.

    Args:
        f: a ZipFile with a CSV

    Returns:
        bytes or None if not a csv file
    """
    for name in z.namelist():
        if name.endswith('.csv'):
            with z.open(name) as f:
                f.seek(0)
                return f.read()


def load_zip(f):
    """
    Loads image data from a zip file by loading from the npz, tiff, or png files in the archive

    Args:
        f: file object

    Returns:
        numpy array or None if not a zip file
    """
    f.seek(0)
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        X = load_zip_numpy(zf)
        if X is None:
            X = load_zip_tiffs(zf)
        if X is None:
            X = load_zip_png(zf)
        return X


def load_npy(f):
    """
    Loads image data from a npy file

    Args:
        f: file object

    Returns:
        numpy array or None if not a npy file
    """
    f.seek(0)
    if 'NumPy data file' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        npy = np.load(f)
        return npy


def load_tiff(f):
    """
    Loads image data from a tiff file

    Args:
        f: file object

    Returns:
        numpy array or None if not a tiff file

    Raises:
        ValueError: loaded image data is more than 4 dimensional
    """
    f.seek(0)
    if 'TIFF image data' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        X = TiffFile(io.BytesIO(f.read())).asarray(squeeze=False)
        if X.ndim == 2:
            # Add channel and frame axes
            X = X[np.newaxis, ..., np.newaxis]
        if X.ndim == 3:
            # TODO: use dimension order to know whether to add frame or channel axis
            X = X[np.newaxis, ...]
        if X.ndim > 4:
            raise ValueError('Tiff file has more than 4 dimensions')
        return X


def load_png(f):
    """
    Loads image data from a png file

    Args:
        f: file object

    Returns:
        numpy array or None if not a png file
    """
    f.seek(0)
    if 'PNG image data' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        image = Image.open(f, formats=['PNG'])
        # Luminance should add channel dimension at end
        if image.mode == 'L':
            X = np.array(image)
            X = np.expand_dims(X, -1)
        else:
            # Create three RGB channels
            # Handles RGB, RGBA, P modes
            X = np.array(image.convert('RGB'))
        # Add frame dimension at start
        X = np.expand_dims(X, 0)
        return X
