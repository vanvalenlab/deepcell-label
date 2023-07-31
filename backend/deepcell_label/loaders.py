"""
Class to load data into a DeepCell Label project file
Loads both raw image data and labels
"""

import io
import itertools
import json
import re
import tarfile
import tempfile
import zipfile
from xml.etree import ElementTree as ET

import magic
import numpy as np
from PIL import Image
from tifffile import TiffFile, TiffWriter

from deepcell_label.utils import convert_lineage, reshape


class Loader:
    """
    Loads and writes data into a DeepCell Label project zip.
    """

    def __init__(self, image_file=None, label_file=None, axes=None):
        """
        Args:
            image_file: file zip object containing a png, zip, tiff, or npz file
            label_file: file like object containing a zip
            axes: dimension order of the image data
        """
        self.X = None
        self.y = None
        self.spots = None
        self.divisions = None
        self.cellTypes = None
        self.cells = None
        self.channels = []
        self.embeddings = None

        self.image_file = image_file
        self.label_file = label_file if label_file else image_file
        self.axes = axes

        with tempfile.TemporaryFile() as project_file:
            with zipfile.ZipFile(project_file, 'w', zipfile.ZIP_DEFLATED) as zip:
                self.zip = zip
                self.load()
                self.write()
            project_file.seek(0)
            self.data = project_file.read()

    def load(self):
        """Loads data from input files."""
        self.X = load_images(self.image_file, self.axes)
        self.y = load_segmentation(self.label_file)
        self.spots = load_spots(self.label_file)
        self.divisions = load_divisions(self.label_file)
        self.cellTypes = load_cellTypes(self.label_file)
        self.cells = load_cells(self.label_file)
        self.channels = load_channels(self.image_file)
        self.embeddings = load_embeddings(self.label_file)

        if self.y is None:
            shape = (*self.X.shape[:-1], 1)
            self.y = np.zeros(shape)

    def write(self):
        """Writes loaded data to zip."""
        self.write_images()
        self.write_segmentation()
        self.write_spots()
        self.write_divisions()
        self.write_cellTypes()
        self.write_cells()
        self.write_embeddings()

    def write_images(self):
        """
        Writes raw images to X.ome.tiff in the output zip.

        Raises:
            ValueError: no image data has been loaded to write
        """
        X = self.X
        if X is not None:
            # Move channel axis
            X = np.moveaxis(X, -1, 1)
            images = io.BytesIO()
            channels = []
            for i in range(len(self.channels)):
                channels.append({'Name': self.channels[i]})
            with TiffWriter(images, ome=True) as tif:
                tif.write(
                    X,
                    compression='zlib',
                    metadata={'axes': 'ZCYX', 'Pixels': {'Channel': channels}},
                )
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
            tif.write(y, compression='zlib', metadata={'axes': 'ZCYX'})
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

    def write_cellTypes(self):
        """Writes cell types to cellTypes.json in the output zip."""
        self.zip.writestr('cellTypes.json', json.dumps(self.cellTypes))

    def write_embeddings(self):
        """Writes embeddings to embeddings.json in the output zip."""
        self.zip.writestr('embeddings.json', json.dumps(self.embeddings))

    def write_cells(self):
        """Writes cells to cells.json in the output zip."""
        if self.cells is None:
            cells = []
            for t in range(self.y.shape[0]):
                for c in range(self.y.shape[-1]):
                    for value in np.unique(self.y[t, :, :, c]):
                        if value != 0:
                            cells.append(
                                {
                                    'cell': int(value),
                                    'value': int(value),
                                    't': int(t),
                                    'c': int(c),
                                }
                            )
            self.cells = cells
        self.zip.writestr('cells.json', json.dumps(self.cells))


def load_images(image_file, axes=None):
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
        X = load_tiff(image_file, axes)
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
        f: file with zipped csv containing spots data

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
        f: zip file with divisions.json
            or tarfile with lineage.json

    Returns:
        dict or None if divisions.json not found
    """
    f.seek(0)
    divisions = None
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        divisions = load_zip_json(zf, filename='divisions.json')
        lineage = load_zip_json(zf, filename='lineage.json')
        if lineage:
            divisions = convert_lineage(lineage)
    elif tarfile.is_tarfile(f.name):
        lineage = load_trk(f, filename='lineage.json')
        divisions = convert_lineage(lineage)
    if divisions is None:
        return []
    return divisions


def load_cellTypes(f):
    """
    Load cell types from cellTypes.json in project archive

    Args:
        f: zip file with cellTypes.json

    Returns:
        dict or None if cellTypes.json not found
    """
    f.seek(0)
    cellTypes = None
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        cellTypes = load_zip_json(zf, filename='cellTypes.json')
    if cellTypes is None:
        return []
    return cellTypes


def load_embeddings(f):
    """
    Load embeddings from embeddings.json in project archive

    Args:
        f: zip file with embeddings.json

    Returns:
        dict or None if embeddings.json not found
    """
    f.seek(0)
    embeddings = None
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        embeddings = load_zip_json(zf, filename='embeddings.json')
    return embeddings


def load_cells(f):
    """
    Load cells from label file.

    Args:
        f: zip file with cells json

    Returns:
        dict or None if no json in zip
    """
    f.seek(0)
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        return load_zip_json(zf, filename='cells.json')


def load_channels(f):
    """
    Load channels from raw file.

    Args:
        f: X.ome.tiff or zip with X.ome.tiff with channel metadata

    Returns:
        list or None if no channel metadata
    """
    f.seek(0)
    channels = []
    if zipfile.is_zipfile(f):
        zf = zipfile.ZipFile(f, 'r')
        for filename in zf.namelist():
            if filename == 'X.ome.tiff':
                with zf.open(filename) as X:
                    tiff = TiffFile(X)
                    if tiff.is_ome:
                        root = ET.fromstring(tiff.ome_metadata)
                        for child in root.iter():
                            if child.tag.endswith('Channel') and 'Name' in child.attrib:
                                channels.append(child.attrib['Name'])
    return channels


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
        numpy array or None if no tiffs in zip
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
    tiffs = {}
    for name in zf.namelist():
        with zf.open(name) as f:
            if 'TIFF image data' in magic.from_buffer(f.read(2048)):
                f.seek(0)
                tiff = TiffFile(f).asarray()
                tiffs[name] = tiff
    if len(tiffs) > 0:
        regex = r'(.*)batch_(\d*)_feature_(\d*)\.tif'

        def get_batch(filename):
            match = re.match(regex, filename)
            if match:
                return int(match.group(2))

        def get_feature(filename):
            match = re.match(regex, filename)
            if match:
                return int(match.group(3))

        filenames = list(tiffs.keys())
        all_have_batch = all(map(lambda x: x is not None, map(get_batch, filenames)))
        if all_have_batch:  # Use batches as Z dimension
            batches = {}
            for batch, batch_group in itertools.groupby(filenames, get_batch):
                # Stack features on last axis
                features = [
                    tiffs[filename]
                    for filename in sorted(list(batch_group), key=get_feature)
                ]
                batches[batch] = np.stack(features, axis=-1)
            # Stack batches on first axis
            batches = map(lambda x: x[1], sorted(batches.items()))
            array = np.stack(list(batches), axis=0)
            return array
        else:  # Use each tiff as a channel and stack on the last axis
            y = np.stack(list(tiffs.values()), axis=-1)
            # Add Z axis
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
        ValueError: tiff has less than 2 or more than 4 dimensions
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
        # Standardize dimensions
        if X.ndim == 0:
            raise ValueError('Loaded image has no data')
        elif X.ndim == 1:
            raise ValueError('Loaded tiff is 1 dimensional')
        elif X.ndim == 2:
            # Add Z and C axes
            return X[np.newaxis, ..., np.newaxis]
        elif X.ndim == 3:
            if axes[0] == 'B':
                return X[..., np.newaxis]
            elif axes[-1] == 'B':
                X = np.moveaxis(X, -1, 0)
                return X[..., np.newaxis]
            elif axes[0] == 'C':
                X = np.moveaxis(X, 0, -1)
                return X[np.newaxis, ...]
            elif axes[-1] == 'C':
                return X[np.newaxis, ...]
            else:  # Add channel axis by default
                return X[..., np.newaxis]
        elif X.ndim == 4:
            if axes == 'BXYC':
                return X
            elif axes == 'CXYB':
                X = np.moveaxis(X, (0, -1), (-1, 0))
                return X
            else:
                print(
                    f'Warning: tiff with shape {X.shape} has 4 dimensions, '
                    f'but axes is {axes}. Assuming BXYC.'
                )
                return X
        else:
            raise ValueError(
                f'Loaded tiff with shape {X.shape} has more than 4 dimensions.'
            )


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
        # Add channel dimension at end to single channel images
        if image.mode == 'L':  # uint8
            X = np.array(image)
            X = np.expand_dims(X, -1)
        # TODO: support higher bit raw images
        # Currently all images are converted to uint8
        elif image.mode == 'I' or image.mode == 'F':  # int32 and float32
            # Rescale data
            max, min = np.max(image), np.min(image)
            X = (image - min) / (max - min if max - min > 0 else 1) * 255
            X = X.astype(np.uint8)
            X = np.expand_dims(X, -1)
        else:  # P, RGB, RGBA, CMYK,YCbCr
            # Create three RGB channels
            # Handles RGB, RGBA, P modes
            X = np.array(image.convert('RGB'))
        # Add T axis at start
        X = np.expand_dims(X, 0)
        return X


def load_trk(f, filename='raw.npy'):
    """
    Loads image data from a .trk file containing raw.npy, tracked.npy, and lineage.json

    Args:
        f: file object containing a .trk file
        filename: name of the file within the .trk to load

    Returns:
        numpy array (for raw.npy or tracked.npy) or dictionary (for lineage.json)
    """
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
