"""Utilities for handling images"""
import io

import matplotlib.pyplot as plt
from PIL import Image


def pngify(imgarr, vmin, vmax, cmap):
    out = io.BytesIO()
    if cmap is None:
        img = Image.fromarray(imgarr)
        img.save(out, format="png")
    else:
        plt.imsave(out, imgarr,
                   vmin=vmin,
                   vmax=vmax,
                   cmap=cmap,
                   format="png")
    out.seek(0)
    return out
