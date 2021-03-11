"""Tests for imgutils.py"""

import os

from skimage.io import imread
import numpy as np
import matplotlib.pyplot as plt
import pytest

import imgutils
import models
from conftest import DummyLoader


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
