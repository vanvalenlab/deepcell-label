"""Tests for imgutils.py"""

import os

import numpy as np
from skimage.io import imread

from deepcell_label import imgutils


def test_greyscale_pngify(tmpdir):
    outfile = os.path.join(str(tmpdir), 'output.png')
    imgarr = np.random.randint(0, 255, size=(32, 32), dtype='uint16')

    out = imgutils.grayscale_pngify(imgarr)
    with open(outfile, 'wb') as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr.shape, loaded_image.shape)


def test_reshape_out_of_order():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((3, 1, 2))
    input_axes = 'XYZ'
    output_axes = 'ZXY'

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_more_dimensions():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((1, 2, 3, 1))
    input_axes = 'XYZ'
    output_axes = 'XYZC'

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_fewer_dimensions():
    array = np.zeros((1, 2, 3, 4))
    expected = np.zeros((1, 2, 4))
    input_axes = 'XYZC'
    output_axes = 'XYC'

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_too_many_input_dimensions():
    array = np.zeros((1, 2))
    expected = np.zeros((1, 2, 1, 1, 1))
    input_axes = 'XYZCT'
    output_axes = 'XYZCT'

    reshaped = imgutils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)
