"""
Class to load data into a DeepCell Label project file
Loads both raw image data and labels
"""

import io
import tempfile
import zipfile

import magic
import numpy as np
from PIL import Image
from tifffile import TiffFile


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
        self.load_images()
        self.load_segmentation()
        self.load_spots()

    def write_images(self, X):
        raw = io.BytesIO()
        np.savez_compressed(raw, X=X)
        raw.seek(0)
        self.zip.writestr('X.npz', raw.read())
        print('Images loaded')

    def write_segmentation(self, y):
        segmentation = io.BytesIO()
        np.savez_compressed(segmentation, y=y)
        segmentation.seek(0)
        self.zip.writestr('y.npz', segmentation.read())
        print('Segmentation loaded')

    def write_spots(self, spots):
        buffer = io.BytesIO()
        buffer.write(spots)
        buffer.seek(0)
        self.zip.writestr('spots.csv', buffer.read())
        print('Spots loaded')

    def load_images(self):
        f = self.image_file
        X = load_zip(f) or load_tiff(f) or load_png(f)
        if X is not None:
            self.write_images(X)
        else:
            raise ValueError('No images found in files')

    def load_segmentation(self):
        if zipfile.is_zipfile(self.label_file):
            label_zip = zipfile.ZipFile(self.label_file, 'r')
            return load_zip_numpy(label_zip) or load_zip_tiffs(label_zip)

    def load_spots(self):
        if zipfile.is_zipfile(self.label_file):
            label_zip = zipfile.ZipFile(self.label_file, 'r')
            return load_zip_csv(label_zip)


def load_zip_numpy(zf, name='X'):
    """
    Loads a numpy array from the zip file, if it exists.
    If loading from an NPZ with multiple arrays, use name parameter to pick one.
    """
    for filename in zf.namelist():
        if filename.endswith('.npy'):
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
        y = np.stack(tiffs, axis=-1)
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
    """Loads image data from a zip file"""
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        return load_zip_numpy(zf) or load_zip_tiffs(zf) or load_zip_png(zf)


def load_tiff(f):
    if 'TIFF image data' in magic.from_buffer(f.read(2048)):
        f.seek(0)
        return TiffFile(f).asarray()


def load_png(f):
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
