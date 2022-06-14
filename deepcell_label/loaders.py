"""
Class to load data into a DeepCell Label project file
Loads both raw image data and labels
"""

import io
import json
import tarfile
import tempfile
import zipfile

import magic
import numpy as np
from PIL import Image
from tifffile import TiffFile, TiffWriter

from deepcell_label.utils import convert_lineage, reshape


class Loader:
    """
    Loads and writes data into a DeepCell Label project zip.
    """

    def __init__(self, image_file=None, label_file=None):
        self.X = None
        self.y = None
        self.spots = None
        self.divisions = None
        self.cells = None

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
        self.divisions = load_divisions(self.label_file)
        self.cells = load_cells(self.label_file)

        if self.y is None:
            shape = (*self.X.shape[:-1], 1)
            self.y = np.zeros(shape)

    def write(self):
        """Writes loaded data to zip."""
        self.write_images()
        self.write_segmentation()
        self.write_spots()
        self.write_divisions()
        self.write_cells()

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

    def write_divisions(self):
        """Writes divisions to divisions.json in the output zip."""
        self.zip.writestr('divisions.json', json.dumps(self.divisions))

    def write_cells(self):
        """Writes cells to cells.json in the output zip."""
        if self.cells is None:
            cells = []
            for t in range(self.y.shape[0]):
                for value in np.unique(self.y[t]):
                    if value != 0:
                        cells.append(
                            {'cell': int(value), 'value': int(value), 't': int(t)}
                        )
            self.cells = cells
        self.zip.writestr('cells.json', json.dumps(self.cells))


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
    if X is None:
        X = load_trk(image_file, filename='raw.npy')
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
            y = load_zip_tiffs(zf, filename='y.ome.tiff')
        return y
    if tarfile.is_tarfile(f.name):
        return load_trk(f, filename='tracked.npy')


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


def load_divisions(f):
    """
    Load divisions from divisions.json in project archive

    Loading from lineage.json from .trk file is supported, but deprecated.

    Args:
        zf: zip file with divisions.json
            or tarfile with lineage.json

    Returns:
        dict or None if divisions.json not found
    """
    f.seek(0)
    divisions = None
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        divisions = load_zip_json(zf, filename='divisions.json')
    elif tarfile.is_tarfile(f.name):
        lineage = load_trk(f, filename='lineage.json')
        divisions = convert_lineage(lineage)
    if divisions is None:
        return []
    return divisions


def load_cells(f):
    """
    Load cells from label file.

    Args:
        zf: zip file with cells json

    Returns:
        dict or None if no json in zip
    """
    f.seek(0)
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        return load_zip_json(zf, filename='cells.json')


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


def load_zip_tiffs(zf, filename):
    """
    Returns an array with all tiff image data in the zip file

    Args:
        zf: a ZipFile containing tiffs to load

    Returns:
        numpy array or None if no png in zip
    """
    if filename in zf.namelist():
        with zf.open(filename) as f:
            if 'TIFF image data' in magic.from_buffer(f.read(2048)):
                f.seek(0)
                tiff = TiffFile(f)
                # TODO: check when there are multiple series
                axes = tiff.series[0].axes
                array = reshape(tiff.asarray(), axes, 'ZYXC')
                return array
            else:
                print(f'{filename} is not a tiff file.')
    else:
        print(f'{filename} not found in zip.')
    print('Loading all tiffs in zip.')
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
        # Add t axis
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


def load_zip_csv(zf):
    """
    Returns the binary data for the first CSV file in the zip file, if it exists.

    Args:
        zf: a ZipFile with a CSV

    Returns:
        bytes or None if not a csv file
    """
    for name in zf.namelist():
        if name.endswith('.csv'):
            with zf.open(name) as f:
                return f.read()


def load_zip_json(zf, filename=None):
    """
    Returns a dicstion json file in the zip file, if it exists.

    Args:
        zf: a ZipFile with a CSV

    Returns:
        bytes or None if not a csv file
    """
    if filename in zf.namelist():
        with zf.open(filename) as f:
            try:
                f.seek(0)
                return json.load(f)
            except json.JSONDecodeError as e:
                print(f'Warning: Could not load {filename} as JSON. {e.msg}')
                return
    print(f'Warning: JSON file {filename} not found.')


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
            X = load_zip_tiffs(zf, filename='X.ome.tiff')
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


def load_tiff(f, axes=None):
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
        tiff = TiffFile(io.BytesIO(f.read()))
        # Load array
        if tiff.is_imagej:
            X = tiff.asarray()
            # TODO: use axes to know which axes to add and permute
            # TODO: handle tiffs with multiple series
            axes = tiff.series[0].axes
            if len(axes) != len(X.shape):
                print(
                    f'Warning: TIFF has shape {X.shape} and axes {axes} in ImageJ metadata'
                )
        elif tiff.is_ome:
            # TODO: use DimensionOrder from OME-TIFF metadata to know which axes to add and permute
            X = tiff.asarray(squeeze=False)
        else:
            X = tiff.asarray(squeeze=False)
        # Reshape array
        if X.ndim == 2:
            # Add C and T axes
            return X[np.newaxis, ..., np.newaxis]
        if X.ndim == 3:
            # TODO: more general axis handling
            if axes[0] == 'C':  # Move C to last axis and add T axis
                X = np.moveaxis(X, 0, -1)
                return X[np.newaxis, ...]
            else:  # Add C axis
                return X[..., np.newaxis]
        if X.ndim == 4:
            return X
        if X.ndim > 4:
            raise ValueError('Tiff file has more than 4 dimensions')


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
        # Add T axis at start
        X = np.expand_dims(X, 0)
        return X


def load_trk(f, filename='raw.npy'):
    f.seek(0)
    if tarfile.is_tarfile(f.name):
        with tarfile.open(fileobj=f) as trks:
            if filename == 'raw.npy' or filename == 'tracked.npy':
                # numpy can't read these from disk...
                with io.BytesIO() as array_file:
                    array_file.write(trks.extractfile(filename).read())
                    array_file.seek(0)
                    return np.load(array_file)
            if filename == 'lineage.json':
                return json.loads(
                    trks.extractfile(trks.getmember('lineage.json')).read().decode()
                )
