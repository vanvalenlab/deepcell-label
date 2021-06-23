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


def grayscale_pngify(imgarr):
    out = io.BytesIO()
    imgarr = Normalize(vmin=0)(imgarr)
    imgarr = np.clip(imgarr, 0, 1)
    imgarr = (imgarr * 255).astype('uint8')
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


def reshape(array, input_axes, output_axes):
    """
    Reshapes an array with input_axes axis order to output_axes axis order.
    Axes order should be a string like 'ZYXCT'.

    Arguments:
        array (ndarray): array to reshape
        input_axes (string): dimension order of input array
        output_axes (string): dimension order after reshaping

    Returns:
        ndarray: reshaped array
    """
    if array.ndim != len(input_axes):
        print(f'input axis order {input_axes} '
              f'has more dimensions than array with shape {array.shape}')
        print(f'truncating input axis order {input_axes} to {input_axes[:array.ndim]}')
        input_axes = input_axes[:array.ndim]
    dropped, input_axes = drop_axes(array, input_axes, output_axes)
    expanded, input_axes = expand_axes(dropped, input_axes, output_axes)
    permuted = permute_axes(expanded, input_axes, output_axes)
    assert len(permuted.shape) == len(output_axes)
    return permuted


def drop_axes(array, input_axes, output_axes):
    """
    Drops the dimensions in input_axes that are not in output_axes.
    Takes the first slice (index 0) of the dropped axes.

    Arguments:
        array (ndarray): array to drop
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: expanded array
        string: input_axes with axes not in output_axes removed
    """
    extra_axes = tuple(slice(None) if axis in output_axes else 0 for i,
                       axis in enumerate(input_axes))
    axes = ''.join(char for char in input_axes if char in output_axes)
    return array[extra_axes], axes


def expand_axes(array, input_axes, output_axes):
    """
    Adds the dimensions in output_axes that are not in input_axes.

    Arguments:
        array (ndarray): array to expand
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: expanded array
        axes: inpit axis order with missing dimensions inserted
    """
    missing_axes = tuple(i for i, axis in enumerate(output_axes) if axis not in input_axes)
    axes = input_axes
    for i in missing_axes:
        axes = axes[:i] + output_axes[i] + axes[i:]
    return np.expand_dims(array, axis=missing_axes), axes


def permute_axes(array, input_axes, output_axes):
    """
    Transpose the array with input_axes axis order to match output_axes axis order.
    Assumes that array has all the dimensions in output_axes,
    just in different orders, and drops/adds dims to the input axis order.

    Arguments:
        array (ndarray): array to transpose
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: transposed array
    """
    permutation = tuple(input_axes.find(dim) for dim in output_axes)
    return array.transpose(permutation)
