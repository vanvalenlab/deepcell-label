"""Utilities for handling images"""
import io

import matplotlib.pyplot as plt
from matplotlib.colors import Normalize

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
