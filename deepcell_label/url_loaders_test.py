"""
Tests for loading files in url_loaders.
"""

import io
import pytest
import numpy as np
import responses
from PIL import Image
from skimage.external.tifffile import TiffWriter
import zipfile

from deepcell_label.url_loaders import URLLoader, FileLoader


@responses.activate
def test_load_raw_npz():
    """Load NPZ file with just a raw array."""
    expected = np.zeros((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected)
    npz.seek(0)
    url = 'http://example.com/mocked/raw.npz'
    responses.add(responses.GET, url, body=io.BufferedReader(npz))

    loader = URLLoader({'url': url})

    np.testing.assert_array_equal(loader.raw_array, expected)
    np.testing.assert_array_equal(loader.label_array, expected)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_raw_and_labeled_npz():
    """Loads NPZ file with both a raw and labeled array."""
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_labeled = np.ones((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected_raw, y=expected_labeled)
    npz.seek(0)
    url = 'http://example.com/mocked/raw_and_labeled.npz'
    responses.add(responses.GET, url, body=io.BufferedReader(npz))

    loader = URLLoader({'url': url})

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_labeled)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_separate_url_npz():
    """Loads raw and labeled arrays from separate responses."""
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_labeled = np.ones((1, 1, 1, 1))

    def create_npz():
        npz = io.BytesIO()
        np.savez(npz, X=expected_raw, y=expected_labeled)
        npz.seek(0)
        return io.BufferedReader(npz)

    url = 'http://example.com/mocked/raw.npz'
    labeled_url = 'http://example.com/mocked/labeled.npz'
    responses.add(responses.GET, url, body=create_npz())
    responses.add(responses.GET, labeled_url, body=create_npz())

    loader = URLLoader({'url': url, 'labeled_url': labeled_url})

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_labeled)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_raw_tiff():
    """Load raw array from tiff file."""
    expected = np.zeros((1, 1, 1, 1))
    tifffile = io.BytesIO()
    with TiffWriter(tifffile) as writer:
        writer.save(expected)
        tifffile.seek(0)
    url = 'http://example.com/mocked/raw.tiff'
    responses.add(responses.GET, url, body=io.BufferedReader(tifffile))

    loader = URLLoader({'url': url})

    np.testing.assert_array_equal(loader.raw_array, expected)
    np.testing.assert_array_equal(loader.label_array, expected)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_raw_and_labeled_tiff():
    """Load raw and labeled array from separate tiff files."""
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_labeled = np.ones((1, 1, 1, 1))
    raw = io.BytesIO()
    labeled = io.BytesIO()
    with TiffWriter(raw) as writer:
        writer.save(expected_raw)
        raw.seek(0)
    with TiffWriter(labeled) as writer:
        writer.save(expected_labeled)
        labeled.seek(0)
    url = 'http://example.com/mocked/raw.tiff'
    labeled_url = 'http://example.com/mocked/labeled.tiff'
    responses.add(responses.GET, url, body=io.BufferedReader(raw))
    responses.add(responses.GET, labeled_url, body=io.BufferedReader(labeled))

    loader = URLLoader({'url': url, 'labeled_url': labeled_url})

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_labeled)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_raw_png():
    """Load raw array from png file."""
    expected = np.zeros((1, 1, 1, 1))
    raw = io.BytesIO()
    img = Image.fromarray(np.zeros((1, 1)), mode='L')
    img.save(raw, format="png")
    raw.seek(0)
    url = 'http://example.com/mocked/raw.png'
    responses.add(responses.GET, url, body=io.BufferedReader(raw))

    loader = URLLoader({'url': url})

    np.testing.assert_array_equal(loader.raw_array, expected)
    np.testing.assert_array_equal(loader.label_array, expected)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_raw_zip():
    """Load raw array from zip of tiff files."""
    expected_raw = np.array([1, 2]).reshape((1, 1, 1, 2))
    expected_labeled = np.array([0]).reshape((1, 1, 1, 1))
    raw = io.BytesIO()

    def make_tiff(array):
        tiff = io.BytesIO()
        with TiffWriter(tiff) as writer:
            writer.save(array)
            tiff.seek(0)
        return tiff.read()

    with zipfile.ZipFile(raw, mode='w') as zf:
        with zf.open('channel0.tiff', 'w') as tiff:
            channel_0 = make_tiff(np.array([1]).reshape((1, 1)))
            tiff.write(channel_0)
        with zf.open('channel1.tiff', 'w') as tiff:
            channel_1 = make_tiff(np.array([2]).reshape((1, 1)))
            tiff.write(channel_1)
    raw.seek(0)

    url = 'http://example.com/mocked/raw.zip'
    responses.add(responses.GET, url, body=io.BufferedReader(raw))

    loader = URLLoader({'url': url, 'axes': 'CYX'})

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_labeled)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


@responses.activate
def test_load_labeled_zip():
    """Load labeled array from zip of tiff files."""
    expected_raw = np.array([1, 2]).reshape((1, 1, 1, 2))
    expected_labeled = np.array([3, 4]).reshape((1, 1, 1, 2))
    raw = io.BytesIO()
    labeled = io.BytesIO()

    def make_tiff(array):
        tiff = io.BytesIO()
        with TiffWriter(tiff) as writer:
            writer.save(array)
            tiff.seek(0)
        return tiff.read()

    with zipfile.ZipFile(raw, mode='w') as zf:
        with zf.open('channel0.tiff', 'w') as tiff:
            channel_0 = make_tiff(np.array([1]).reshape((1, 1)))
            tiff.write(channel_0)
        with zf.open('channel1.tiff', 'w') as tiff:
            channel_1 = make_tiff(np.array([2]).reshape((1, 1)))
            tiff.write(channel_1)
    raw.seek(0)

    with zipfile.ZipFile(labeled, mode='w') as zf:
        with zf.open('feature0.tiff', 'w') as tiff:
            feature_0 = make_tiff(np.array([3]).reshape((1, 1)))
            tiff.write(feature_0)
        with zf.open('feature1.tiff', 'w') as tiff:
            feature_1 = make_tiff(np.array([4]).reshape((1, 1)))
            tiff.write(feature_1)
    labeled.seek(0)

    url = 'http://example.com/mocked/raw.zip'
    labeled_url = 'http://example.com/mocked/labeled.zip'
    responses.add(responses.GET, url, body=io.BufferedReader(raw))
    responses.add(responses.GET, labeled_url, body=io.BufferedReader(labeled))

    loader = URLLoader({'url': url, 'labeled_url': labeled_url, 'axes': 'CYX'})

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_labeled)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None
