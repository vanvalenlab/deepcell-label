"""Tests for loaders.py"""

import io
import json
import tempfile
import tarfile

import pytest
import numpy as np
from PIL import Image

import loaders


def test_load_raw_npz():
    """Creates a dummy NPZ file with just a raw array and loads it."""
    expected = np.zeros((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected)
    npz.seek(0)

    loader = loaders.Loader()
    loader._load_npz(npz)

    np.testing.assert_array_equal(loader.raw_array, expected)
    np.testing.assert_array_equal(loader.label_array, expected)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_combined_npz():
    """Creates a dummy NPZ file with both a raw array and a label array and loads it."""
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.ones((1, 1, 1, 1))
    npz = io.BytesIO()
    np.savez(npz, X=expected_raw, y=expected_label)
    npz.seek(0)

    loader = loaders.Loader()
    loader._load_npz(npz)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_trk():
    """Creates a dummy TRK file and loads it."""
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.ones((1, 1, 1, 1))
    expected_tracks = {1: {'frame_div': None,
                           'daughters': [],
                           'frames': [0],
                           'label': '1',
                           'capped': False,
                           'parent': None}}

    trk = io.BytesIO()
    with tarfile.open(fileobj=trk, mode='w') as trks:
        with tempfile.NamedTemporaryFile('w') as lineage_file:
            json.dump(expected_tracks, lineage_file, indent=1)
            lineage_file.flush()
            trks.add(lineage_file.name, 'lineage.json')

        with tempfile.NamedTemporaryFile() as raw_file:
            np.save(raw_file, expected_raw)
            raw_file.flush()
            trks.add(raw_file.name, 'raw.npy')

        with tempfile.NamedTemporaryFile() as tracked_file:
            np.save(tracked_file, expected_label)
            tracked_file.flush()
            trks.add(tracked_file.name, 'tracked.npy')
    trk.seek(0)

    loader = loaders.Loader()
    loader._load_trk(trk)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info == {0: expected_tracks}


def test_load_trk_no_lineage():
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.ones((1, 1, 1, 1))

    trk = io.BytesIO()
    with tarfile.open(fileobj=trk, mode='w') as trks:

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, expected_raw)
                raw_file.flush()
                trks.add(raw_file.name, 'raw.npy')

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, expected_label)
                tracked_file.flush()
                trks.add(tracked_file.name, 'tracked.npy')
    trk.seek(0)

    loader = loaders.Loader()
    with pytest.raises(ValueError):
        loader._load_trk(trk)


def test_load_trk_multiple_lineages():
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.ones((1, 1, 1, 1))
    expected_tracks = 2 * [{1: {'frame_div': None,
                                'daughters': [],
                                'frames': [0],
                                'label': '1',
                                'capped': False,
                                'parent': None}}]

    trk = io.BytesIO()
    with tarfile.open(fileobj=trk, mode='w') as trks:
        with tempfile.NamedTemporaryFile('w') as lineage_file:
            json.dump(expected_tracks, lineage_file, indent=1)
            lineage_file.flush()
            trks.add(lineage_file.name, 'lineage.json')

        with tempfile.NamedTemporaryFile() as raw_file:
            np.save(raw_file, expected_raw)
            raw_file.flush()
            trks.add(raw_file.name, 'raw.npy')

        with tempfile.NamedTemporaryFile() as tracked_file:
            np.save(tracked_file, expected_label)
            tracked_file.flush()
            trks.add(tracked_file.name, 'tracked.npy')
    trk.seek(0)

    loader = loaders.Loader()
    with pytest.raises(ValueError):
        loader._load_trk(trk)


def test_load_png():
    """Creates a dummy PNG file with three channels and loads it."""
    out = io.BytesIO()
    image = Image.new('RGB', (1, 1))
    image.save(out, format='png')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 3))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_png(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_png_no_channels():
    """Creates a dummy PNG file with no channels and loads it."""
    out = io.BytesIO()
    image = Image.new('L', (1, 1))
    image.save(out, format='png')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_png(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_png_four_channels():
    """Creates a dummy PNG file with four channels and loads it."""
    out = io.BytesIO()
    image = Image.new('RGBA', (1, 1))
    image.save(out, format='png')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 3))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_png(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_tiff():
    """Creates a dummy TIFF file with 3 channels and loads it."""
    out = io.BytesIO()
    image = Image.new('RGB', (1, 1))
    image.save(out, format='tiff')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 3))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_tiff(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None


def test_load_tiff_no_channels():
    """Creates a dummy TIFF file with no channels and loads it."""
    out = io.BytesIO()
    # 'L' for luminance mode in greyscale; no channel dimension
    image = Image.new('L', (1, 1))
    image.save(out, format='tiff')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 1))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_tiff(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None

def test_load_tiff_four_channels():
    """Creates a dummy TIFF file with more than 3 channels and loads it."""
    out = io.BytesIO()
    # 'L' for luminance mode in greyscale; no channel dimension
    image = Image.new('RGBA', (1, 1))
    image.save(out, format='tiff')
    out.seek(0)
    expected_raw = np.zeros((1, 1, 1, 4))
    expected_label = np.zeros((1, 1, 1, 1))

    loader = loaders.Loader()
    loader._load_tiff(out)

    np.testing.assert_array_equal(loader.raw_array, expected_raw)
    np.testing.assert_array_equal(loader.label_array, expected_label)
    assert loader.cell_ids is not None
    assert loader.cell_info is not None