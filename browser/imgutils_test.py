"""Tests for helpers.py"""

import os

from skimage.io import imread
import numpy as np
import matplotlib.pyplot as plt

import pytest

import imgutils


def test_pngify(tmpdir):
    outfile = os.path.join(str(tmpdir), 'output.png')
    imgarr = np.random.randint(0, 255, size=(32, 32), dtype='uint16')

    # test vmin, vmax, and cmap all None
    out = imgutils.pngify(imgarr, None, None, cmap=None)
    with open(outfile, 'wb') as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr, loaded_image)

    # test vmin, vmax
    out = imgutils.pngify(imgarr, 0, imgarr.max(), cmap=None)
    with open(outfile, 'wb') as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    np.testing.assert_equal(imgarr, loaded_image)

    # test vmin, vmax and cmap
    cmap = 'cubehelix'
    out = imgutils.pngify(imgarr, 0, imgarr.max(), cmap=cmap)
    with open(outfile, 'wb') as f:
        f.write(out.getbuffer())

    loaded_image = np.uint16(imread(outfile))
    print(imgarr.shape, loaded_image.shape)
    np.testing.assert_equal(imgarr.shape, loaded_image.shape[:-1])
