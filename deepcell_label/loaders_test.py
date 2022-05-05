"""
Tests for loading files in loaders.
"""

import io
import json
import zipfile

import numpy as np
from PIL import Image
from tifffile import TiffFile, TiffWriter

from deepcell_label.loaders import Loader


def assert_image(archive, expected):
    """Assert that image is as expected."""
    # TZCYXS dimension order with squeeze=False
    image = TiffFile(archive.open('X.ome.tiff')).asarray(squeeze=False)
    # Drop the T and S dimension and move C to last dimension
    image = image[0, :, :, :, :, 0]
    image = np.moveaxis(image, 1, -1)
    np.testing.assert_array_equal(image, expected)


def assert_segmentation(archive, expected):
    """Assert that segmentation is as expected."""
    segmentation = TiffFile(archive.open('y.ome.tiff')).asarray(squeeze=False)
    # Drop the T and S dimension and move C to last dimension
    segmentation = segmentation[0, :, :, :, :, 0]
    segmentation = np.moveaxis(segmentation, 1, -1)
    np.testing.assert_array_equal(segmentation, expected)
    assert json.loads(archive.open('cells.json').read()) is not None


def test_load_npz():
    """Load npz with image data."""
    expected = np.zeros((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected)
    npz.seek(0)

    loader = Loader(npz)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_two_channel_npz():
    """Load npz with image data with two channels."""
    expected = np.zeros((1, 100, 100, 2))
    npz = io.BytesIO()
    np.savez(npz, X=expected)
    npz.seek(0)

    loader = Loader(npz)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_npz_with_segmentation():
    """Loads npz with image and segmentation."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected_image, y=expected_segmentation)
    npz.seek(0)

    loader = Loader(npz)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_separate_npz():
    """Loads image and segmentation from separate npz."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    image_npz = io.BytesIO()
    label_npz = io.BytesIO()
    np.savez(image_npz, X=expected_image)
    np.savez(label_npz, y=expected_segmentation)

    loader = Loader(image_npz, label_npz)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_image_tiff():
    """Load image from tiff file."""
    expected = np.zeros((1, 1, 1, 1))
    tifffile = io.BytesIO()
    with TiffWriter(tifffile) as writer:
        writer.save(expected)
        tifffile.seek(0)

    loader = Loader(tifffile)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_image_and_segmentation_tiff():
    """Load image from a tiff and labeled array a zipped tiff."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    image_tiff = io.BytesIO()
    zipped_segmentation = io.BytesIO()
    with TiffWriter(image_tiff) as writer:
        writer.save(expected_image)
        image_tiff.seek(0)
    with zipfile.ZipFile(zipped_segmentation, mode='w') as zf:
        tiff = io.BytesIO()
        with TiffWriter(tiff) as writer:
            writer.save(np.array([[1]]))
            tiff.seek(0)
        zf.writestr('feature0.tiff', tiff.read())

    loader = Loader(image_tiff, zipped_segmentation)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_image_png():
    """Load image array from png file."""
    expected = np.zeros((1, 1, 1, 1))
    png = io.BytesIO()
    img = Image.fromarray(np.zeros((1, 1)), mode='L')
    img.save(png, format='png')
    png.seek(0)

    loader = Loader(png)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_image_zip():
    """Load image array from zip of tiff files."""
    expected_image = np.zeros((1, 100, 100, 2))
    zipped_tiffs = io.BytesIO()

    def make_tiff(array):
        tiff = io.BytesIO()
        with TiffWriter(tiff) as writer:
            writer.save(array)
            tiff.seek(0)
        return tiff.read()

    with zipfile.ZipFile(zipped_tiffs, mode='w') as zf:
        with zf.open('channel0.tiff', 'w') as tiff:
            channel_0 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(channel_0)
        with zf.open('channel1.tiff', 'w') as tiff:
            channel_1 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(channel_1)
    zipped_tiffs.seek(0)

    loader = Loader(zipped_tiffs)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)


def test_load_segmentation_zip():
    """Load labeled array from zip of tiff files."""
    expected_image = np.zeros((1, 100, 100, 2))
    expected_segmentation = np.zeros((1, 100, 100, 2))
    zipped_image = io.BytesIO()
    zipped_segmentation = io.BytesIO()

    def make_tiff(array):
        tiff = io.BytesIO()
        with TiffWriter(tiff) as writer:
            writer.save(array)
            tiff.seek(0)
        return tiff.read()

    with zipfile.ZipFile(zipped_image, mode='w') as zf:
        with zf.open('channel0.tiff', 'w') as tiff:
            channel_0 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(channel_0)
        with zf.open('channel1.tiff', 'w') as tiff:
            channel_1 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(channel_1)
    zipped_image.seek(0)

    with zipfile.ZipFile(zipped_segmentation, mode='w') as zf:
        with zf.open('feature0.tiff', 'w') as tiff:
            feature_0 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(feature_0)
        with zf.open('feature1.tiff', 'w') as tiff:
            feature_1 = make_tiff(np.zeros((1, 100, 100)))
            tiff.write(feature_1)
    zipped_segmentation.seek(0)

    loader = Loader(zipped_image, zipped_segmentation)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)
