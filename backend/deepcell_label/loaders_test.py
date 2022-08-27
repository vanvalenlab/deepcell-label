"""
Tests for loading files in loaders.
"""

import io
import json
import os
import tempfile
import zipfile

import numpy as np
from PIL import Image
from tifffile import TiffFile, TiffWriter, imwrite

from deepcell_label.config import DELETE_TEMP
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
    with tempfile.NamedTemporaryFile() as images:
        np.savez(images, X=expected)
        images.seek(0)
        loader = Loader(images)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_two_channel_npz():
    """Load npz with image data with two channels."""
    expected = np.zeros((1, 100, 100, 2))
    with tempfile.NamedTemporaryFile() as images:
        np.savez(images, X=expected)
        images.seek(0)
        loader = Loader(images)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_npz_with_segmentation():
    """Loads npz with image and segmentation."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    with tempfile.NamedTemporaryFile() as images:
        np.savez(images, X=expected_image, y=expected_segmentation)
        images.seek(0)
        loader = Loader(images)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_separate_npz():
    """Loads image and segmentation from separate npz."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    with tempfile.NamedTemporaryFile() as images, tempfile.NamedTemporaryFile() as labels:
        np.savez(images, X=expected_image)
        np.savez(labels, y=expected_segmentation)
        loader = Loader(images, labels)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_image_tiff():
    """Load image from tiff file."""
    expected = np.zeros((1, 1, 1, 1))
    with tempfile.NamedTemporaryFile(delete=DELETE_TEMP) as images:
        with TiffWriter(images) as writer:
            writer.write(expected)
            images.seek(0)

        loader = Loader(images)
    if not DELETE_TEMP:
        images.close()
        os.remove(images.name)

    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_image_and_segmentation_tiff():
    """Load image from a tiff and labeled array a zipped tiff."""
    expected_image = np.zeros((1, 1, 1, 1))
    expected_segmentation = np.ones((1, 1, 1, 1))
    with tempfile.NamedTemporaryFile() as images, tempfile.NamedTemporaryFile() as labels:
        with TiffWriter(images) as writer:
            writer.write(expected_image)
            images.seek(0)
        with zipfile.ZipFile(labels, mode='w') as zf:
            tiff = io.BytesIO()
            with TiffWriter(tiff) as writer:
                writer.write(np.array([[1]]))
                tiff.seek(0)
            zf.writestr('feature0.tiff', tiff.read())

        loader = Loader(images, labels)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_image_png():
    """Load image array from png file."""
    expected = np.zeros((1, 1, 1, 1))
    with tempfile.NamedTemporaryFile(delete=DELETE_TEMP) as images:
        img = Image.fromarray(np.zeros((1, 1)), mode='L')
        img.save(images, format='png')
        images.seek(0)
        loader = Loader(images)
    if not DELETE_TEMP:
        images.close()
        os.remove(images.name)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected)


def test_load_image_zip():
    """Load image array from zip of tiff files."""
    expected_image = np.zeros((1, 100, 100, 2))
    with tempfile.NamedTemporaryFile() as images:

        def make_tiff(array):
            tiff = io.BytesIO()
            with TiffWriter(tiff) as writer:
                writer.write(array)
                tiff.seek(0)
            return tiff.read()

        with zipfile.ZipFile(images, mode='w') as zf:
            with zf.open('channel0.tiff', 'w') as tiff:
                channel_0 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(channel_0)
            with zf.open('channel1.tiff', 'w') as tiff:
                channel_1 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(channel_1)
        images.seek(0)
        loader = Loader(images)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)


def test_load_segmentation_zip():
    """Load labeled array from zip of tiff files."""
    expected_image = np.zeros((1, 100, 100, 2))
    expected_segmentation = np.zeros((1, 100, 100, 2))
    with tempfile.NamedTemporaryFile() as images, tempfile.NamedTemporaryFile() as labels:

        def make_tiff(array):
            tiff = io.BytesIO()
            with TiffWriter(tiff) as writer:
                writer.write(array)
                tiff.seek(0)
            return tiff.read()

        with zipfile.ZipFile(images, mode='w') as zf:
            with zf.open('channel_0.tiff', 'w') as tiff:
                channel_0 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(channel_0)
            with zf.open('channel_1.tiff', 'w') as tiff:
                channel_1 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(channel_1)
        images.seek(0)

        with zipfile.ZipFile(labels, mode='w') as zf:
            with zf.open('feature_0.tiff', 'w') as tiff:
                feature_0 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(feature_0)
            with zf.open('feature_1.tiff', 'w') as tiff:
                feature_1 = make_tiff(np.zeros((1, 100, 100)))
                tiff.write(feature_1)
        labels.seek(0)

        loader = Loader(images, labels)
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)


def test_load_batches():
    """Load labeled array from zip of tiff files with multiple batches."""
    expected_image = np.zeros((2, 100, 100, 1))
    expected_segmentation = np.zeros((2, 100, 100, 1))
    expected_segmentation[1, :, :, :] = 1
    with tempfile.NamedTemporaryFile() as images, tempfile.NamedTemporaryFile() as labels:

        def make_tiff(array):
            tiff = io.BytesIO()
            imwrite(tiff, array)
            tiff.seek(0)
            return tiff.read()

        images.write(make_tiff(np.zeros((2, 100, 100, 1))))
        images.seek(0)

        with zipfile.ZipFile(labels, mode='w') as zf:
            with zf.open('batch_0_feature_0.tiff', 'w') as tiff:
                tiff.write(make_tiff(np.zeros((100, 100))))
            with zf.open('batch_1_feature_0.tiff', 'w') as tiff:
                tiff.write(make_tiff(np.zeros((100, 100)) + 1))
        labels.seek(0)

        loader = Loader(images, labels, 'BYXC')
    loaded_zip = zipfile.ZipFile(io.BytesIO(loader.data))
    assert_image(loaded_zip, expected_image)
    assert_segmentation(loaded_zip, expected_segmentation)
