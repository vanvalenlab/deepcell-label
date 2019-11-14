import io
import matplotlib.pyplot as plt
import numpy as np

def pngify(imgarr, vmin, vmax, cmap):
    out = io.BytesIO()
    plt.imsave(out, imgarr,
               vmin=vmin,
               vmax=vmax,
               cmap=cmap,
               format="png")
    out.seek(0)
    return out

