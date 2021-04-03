"""Utilities for handling images"""
import io

import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
from skimage.segmentation import find_boundaries
import numpy as np

from PIL import Image


def pngify(imgarr, vmin, vmax, cmap=None):
    out = io.BytesIO()

    if cmap:
        cmap = plt.get_cmap(cmap)
        imgarr = Normalize(vmin=vmin, vmax=vmax)(imgarr)
        # apply the colormap
        imgarr = cmap(imgarr, bytes=True)

    img = Image.fromarray(imgarr)
    img.save(out, format="png")
    out.seek(0)
    return out


def add_outlines(frame):
    """
    Shows the frame with each label outlined with negative label values.
    For example, label 2 is outlined with -2.

    Args:
        frame (np.array): 2d array with labels

    Returns:
        np.array: array with negative borders around labels
    """
    # this is sometimes int 32 but may be uint, convert to
    # int16 to ensure negative numbers and smaller payload than int32
    frame = frame.astype(np.int16)
    boundary_mask = find_boundaries(frame, mode='inner')
    outlined_frame = np.where(boundary_mask == 1, -frame, frame)
    return outlined_frame
