"""
Utility functions to load projects.
"""

import io
import json
import pathlib
import tempfile
import tarfile
import zipfile

import numpy as np
from PIL import Image
from tifffile import TiffFile


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


def is_dvc(url):
    return pathlib.Path(url).suffix.lower() in {'.dvc'}


def load_npz(data):
    """Returns the first array in an npz."""
    npz = np.load(io.BytesIO(data))
    return npz[npz.files[0]]


def load_raw_npz(data):
    """
    Returns raw image array from an NPZ file.
    """
    npz = np.load(io.BytesIO(data))

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
    npz = np.load(io.BytesIO(data))

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
        temp.write(data)
        with tarfile.open(temp.name, 'r') as trks:
            with io.BytesIO() as array_file:
                array_file.write(trks.extractfile('raw.npy').read())
                array_file.seek(0)
                return np.load(array_file)


def load_labeled_trk(data):
    """Load a labeled image data from a .trk file."""
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(data)
        with tarfile.open(temp.name, 'r') as trks:
            with io.BytesIO() as array_file:
                array_file.write(trks.extractfile('tracked.npy').read())
                array_file.seek(0)
                return np.load(array_file)


def load_lineage_trk(data):
    """Loads a lineage JSON from a .trk file."""
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(data)
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
    image = Image.open(io.BytesIO(data), formats=['PNG'])
    # Luminance should add channel dimension at end
    if image.mode == 'L':
        array = np.array(image)
        array = np.expand_dims(array, -1)
    else:
        # Create three RGB channels
        # Handles RGB, RGBA, P modes
        array = np.array(image.convert('RGB'))
    # Add frame dimension at start
    array = np.expand_dims(array, 0)
    return array


def load_tiff(data):
    """Returns image array from a TIFF file."""
    # return np.asarray(imageio.imread(data))
    return TiffFile(io.BytesIO(data)).asarray()


def load_zip(data):
    """
    Loads a series of image arrays from a zip of TIFFs.
    Treats separate TIFFs as channels.
    """
    zip_file = zipfile.ZipFile(io.BytesIO(data), 'r')
    channels = [
        load_tiff(zip_file.open(item).read())
        for item in zip_file.filelist
        if not str(item.filename).startswith('__MACOSX/') and is_tiff(str(item.filename))
    ]
    return np.array(channels)
