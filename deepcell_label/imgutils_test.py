"""Tests for imgutils.py"""

import os

from skimage.io import imread
import numpy as np

from deepcell_label import imgutils
from deepcell_label import models
from deepcell_label.conftest import DummyLoader


def test_pngify(tmpdir):
    outfile = os.path.join(str(tmpdir), "output.png")
    imgarr = np.random.randint(0, 255, size=(32, 32), dtype="uint16")

    # test vmin, vmax, and cmap all None
    out = imgutils.pngify(imgarr, None, None, cmap=None)
    with open(outfile, "wb") as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr, loaded_image)

    # test vmin, vmax
    out = imgutils.pngify(imgarr, 0, imgarr.max(), cmap=None)
    with open(outfile, "wb") as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr, loaded_image)

    # test vmin, vmax and cmap
    cmap = "cubehelix"
    out = imgutils.pngify(imgarr, 0, imgarr.max(), cmap=cmap)
    with open(outfile, "wb") as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    print(imgarr.shape, loaded_image.shape)
    np.testing.assert_equal(imgarr.shape, loaded_image.shape[:-1])


def test_greyscale_pngify(tmpdir):
    outfile = os.path.join(str(tmpdir), "output.png")
    imgarr = np.random.randint(0, 255, size=(32, 32), dtype="uint16")

    out = imgutils.grayscale_pngify(imgarr)
    with open(outfile, "wb") as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr.shape, loaded_image.shape)


def test_add_outlines(db_session):
    db_session.autoflush = False
    labels = np.identity(10)
    # Add frame and channel dimensions
    labels = np.expand_dims(labels, (0, -1))
    assert labels.shape == (1, 10, 10, 1)
    project = models.Project.create(DummyLoader(labels=labels))

    frame = 0
    feature = 0

    label_array = project.label_frames[frame].frame[..., feature]
    outlined = imgutils.add_outlines(label_array)
    assert (outlined[outlined >= 0] == label_array[outlined >= 0]).all()
    assert (outlined[outlined < 0] == -label_array[outlined < 0]).all()


def test_reshape_out_of_order():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((3, 1, 2))
    input_axes = "XYZ"
    output_axes = "ZXY"

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_more_dimensions():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((1, 2, 3, 1))
    input_axes = "XYZ"
    output_axes = "XYZC"

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_fewer_dimensions():
    array = np.zeros((1, 2, 3, 4))
    expected = np.zeros((1, 2, 4))
    input_axes = "XYZC"
    output_axes = "XYC"

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_too_many_input_dimensions():
    array = np.zeros((1, 2))
    expected = np.zeros((1, 2, 1, 1, 1))
    input_axes = "XYZCT"
    output_axes = "XYZCT"

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)
