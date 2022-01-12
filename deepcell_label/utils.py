"""Utility functions for DeepCell Label"""

import re

import numpy as np


def add_frame_div_parent(cell_info):
    """
    Adds the frame a cells parent divides on to cell info.

    Args:
        cell_info (dict): dict that maps cells to cell info
    Returns:
        dict: cell info with added frame_div_parent
    """
    new_info = cell_info.copy()
    for info in new_info.values():
        if info['parent']:
            parent = info['parent']
            info['frame_div_parent'] = new_info[parent]['frame_div']
        else:
            info['frame_div_parent'] = None
    return new_info


def snakecase_to_camelcase(name):
    snake_pattern = re.compile(r'_([a-z])')
    return snake_pattern.sub(lambda x: x.group(1).upper(), name)


def reformat_cell_info(cell_info):
    """
    Reformats snake case to camel case and renames frame_div to divisionFrame.
    """
    reformated = {}
    for cell, info in cell_info.items():
        reformated[cell] = {}
        for key in info:
            if key == 'frame_div':
                reformated[cell]['divisionFrame'] = info[key]
            elif key == 'frame_div_parent':
                reformated[cell]['parentDivisionFrame'] = info[key]
            else:
                reformated[cell][snakecase_to_camelcase(key)] = info[key]
    return reformated


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
        print(
            f'input axis order {input_axes} '
            f'has more dimensions than array with shape {array.shape}'
        )
        print(f'truncating input axis order {input_axes} to {input_axes[:array.ndim]}')
        input_axes = input_axes[: array.ndim]
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
    extra_axes = tuple(
        slice(None) if axis in output_axes else 0 for i, axis in enumerate(input_axes)
    )
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
    missing_axes = tuple(
        i for i, axis in enumerate(output_axes) if axis not in input_axes
    )
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
