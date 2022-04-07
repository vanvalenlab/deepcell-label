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
    Loads data into a DeepCell Label project file
    """

    def __init__(self, image_file, label_file=None):
        self._image_file = image_file
        self._label_file = image_file if label_file is None else label_file
        with tempfile.TemporaryFile() as project_file:
            with zipfile.ZipFile(project_file, 'w', zipfile.ZIP_DEFLATED) as zip:
                self.zip = zip
                self.load()
            project_file.seek(0)
            self.data = project_file.read()

    @property
    def image_file(self):
        self._image_file.seek(0)
        return self._image_file

    @property
    def label_file(self):
        self._label_file.seek(0)
        return self._label_file

    def load(self):
        """Extracts data from input files and writes standardized data to output zip."""
        # Load data from input files
        X = self.load_images()
        y = self.load_segmentation()
        spots = self.load_spots()

        # Write standardized data to output zip
        if X is not None:
            # Rescale data before casting to uint8
            X = (X - np.min(X)) / (np.max(X) - np.min(X)) * 255
            X = X.astype(np.uint8)
            self.write_images(X)
        else:
            raise ValueError('No images found in files')

        if y is not None:
            if y.shape[:-1] != X.shape[:-1]:
                raise ValueError(
                    'Segmentation shape %s is incompatible with image shape %s'
                    % (y.shape, X.shape)
                )
            # TODO: check if float vs int matters
            self.write_segmentation(y.astype(np.uint32))
            # Write cells in segmentation
            cells = LabelInfoMaker(y).cell_info
            self.write_cells(cells)

        if spots is not None:
            self.write_spots(spots)

    def write_images(self, X):
        """Writes raw images to output zip."""
        images = io.BytesIO()
        with TiffWriter(images, ome=True) as tif:
            tif.save(np.moveaxis(X, -1, 0), metadata={'axes': 'CZYX'})
        images.seek(0)
        self.zip.writestr('X.ome.tiff', images.read())
        print('Wrote images')

    def write_segmentation(self, y):
        """Writes segmentation to output zip."""
        segmentation = io.BytesIO()
        with TiffWriter(segmentation, ome=True) as tif:
            tif.save(np.moveaxis(y, -1, 0), metadata={'axes': 'CZYX'})
        segmentation.seek(0)
        self.zip.writestr('y.ome.tiff', segmentation.read())
        print('Wrote segmentation')

    def write_spots(self, spots):
        """Writes spots to output zip."""
        buffer = io.BytesIO()
        buffer.write(spots)
        buffer.seek(0)
        self.zip.writestr('spots.csv', buffer.read())
        print('Wrote spots')

    def write_cells(self, cells):
        """Writes cells.json to output zip."""
        self.zip.writestr('cells.json', json.dumps(cells))
        print('Wrote cells')

    def load_images(self):
        """Extracts raw images from input image file."""
        X = load_zip(self.image_file)
        if X is None:
            X = load_npy(self.image_file)
        if X is None:
            X = load_tiff(self.image_file)
        if X is None:
            X = load_png(self.image_file)
        return X

    def load_segmentation(self):
        """Extracts segmentation from input label file."""
        if zipfile.is_zipfile(self.label_file):
            label_zip = zipfile.ZipFile(self.label_file, 'r')
            y = load_zip_numpy(label_zip, name='y')
            if y is None:
                y = load_zip_tiffs(label_zip)
            return y

    def load_spots(self):
        """Extracts spots from input label file."""
        if zipfile.is_zipfile(self.label_file):
            label_zip = zipfile.ZipFile(self.label_file, 'r')
            return load_zip_csv(label_zip)


def load_zip_numpy(zf, name='X'):
    """
    Loads a numpy array from the zip file, if it exists.
    If loading from an NPZ with multiple arrays, use name parameter to pick one.
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
    Returns an array with all tiff image data in the zip file, if any.
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
    Returns the image data array for the first PNG image in the zip file, if it exists.
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
    """
    for name in z.namelist():
        with z.open(name) as f:
            if 'CSV text' in magic.from_buffer(f.read(2048)):
                f.seek(0)
                return f.read()


def load_zip(f):
    """Loads image data from a zip file by loading from the npz, tiff, or png files in the archive."""
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        X = load_zip_numpy(zf)
        if X is None:
            X = load_zip_tiffs(zf)
        if X is None:
            X = load_zip_png(zf)
        return X


def load_npy(f):
    """Loads image data from a npy file"""
    if 'NumPy data file' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        npy = np.load(f)
        return npy


def load_tiff(f):
    """Loads image data from a tiff file"""
    if 'TIFF image data' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        return TiffFile(f).asarray()


def load_png(f):
    """Loads image data from a png file"""
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
