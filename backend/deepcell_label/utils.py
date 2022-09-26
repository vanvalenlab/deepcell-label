"""Utility functions for DeepCell Label"""

import io
import zipfile

import numpy as np
from tifffile import TiffFile, TiffWriter


def combine_zips(DCL_zip, S3_zip):
    """
    Combines the edited zip from DCL with a zip from S3
    containing the original raw image.

    Args:
        DCL_zip (data): data for the edited DCL zip
        S3_zip (data): data for the S3 zip with original raw

    Returns:
        output (data): data for combined zip with everything
            in the DCL zip but with raw.dat replaced with
            the original raw X.ome.tiff

    """
    zf_dcl = zipfile.ZipFile(DCL_zip)
    zf_s3 = zipfile.ZipFile(S3_zip)
    output = io.BytesIO()
    
    with zipfile.ZipFile(output, 'w') as export_zf:
        # Read X.ome.tiff from S3
        X_data = zf_s3.read('X.ome.tiff')
        export_zf.writestr('X.ome.tiff', X_data)

        # Writes all other files to export zip
        for item in zf_dcl.infolist():
            if item.filename in [
                'dimensions.json',
                'labeled.dat',
                'cells.json',
                'spots.csv',
                'divisions.json'
            ]:
                buffer = zf_dcl.read(item.filename)
                export_zf.writestr(item, buffer)

    zf_dcl.close()
    zf_s3.close()
    output.seek(0)

    return output


def rescale_raw_data(data):
    """
    Rescales the X.ome.tiff to 0-255 uint8 for rendering
    on the frontend.

    Args:
        data: data for the project zip file with
              (X.ome.tiff, y.ome.tiff, cells.json, 
               divisions.json, (spots.csv))

    Returns:
        reshaped (data): data equivalent to input zip but with
            X.ome.tiff rescaled and changed to uint8

    """
    zf = zipfile.ZipFile(data)
    reshaped = io.BytesIO()

    with zipfile.ZipFile(reshaped, 'w') as new_zf:
        # Read, reshape, change to uint8 for X.ome.tiff
        X_data = zf.read('X.ome.tiff')
        X_bytes = io.BytesIO(X_data)
        X = np.squeeze(TiffFile(X_bytes).asarray(squeeze=False), (0, 5))
        max, min = np.max(X), np.min(X)
        X = (X - min) / (max - min if max - min > 0 else 1) * 255
        X = X.astype(np.uint8)

        # Write reshaped X to new_zf
        X_ome = io.BytesIO()
        with TiffWriter(X_ome, ome=True) as tif:
            tif.write(X, compression='zlib', metadata={'axes': 'ZCYX'})
        X_ome.seek(0)
        new_zf.writestr('X.ome.tiff', X_ome.read())

        # Write all other files to export zip
        for item in zf.infolist():
            if item.filename in [
                'y.ome.tiff',
                'cells.json',
                'divisions.json',
                'spots.csv'
            ]:
                buffer = zf.read(item.filename)
                new_zf.writestr(item, buffer)

    zf.close()
    reshaped.seek(0)
    return reshaped


def convert_lineage(lineage):
    """
    Converts a lineage from .trk files into a list of divisions.

    Args:
        lineage (dict): dict that maps cells to lineage info
            e.g. {
                '1': {'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
                '2': {'frame_div': None, 'parent': 1, 'daughters': []},
                '3': {'frame_div': None, 'parent': 1, 'daughters': []},
            }

    Returns:
        list: divisions derived from lineage
            e.g. [{ 'parent': 1, 'daughters': [2, 3], 't': 1 }]

    """
    divisions = []
    lineage = {int(k): v for k, v in lineage.items()}
    for cell, info in lineage.items():
        parent, daughters, frame_div = (
            info['parent'],
            info['daughters'],
            info['frame_div'],
        )
        # Check for missing daughters
        if parent is not None:
            if cell not in lineage[parent]['daughters']:
                raise ValueError(
                    f'cell {cell} with parent {parent} not in daughters {lineage[parent]["daughters"]}'
                )
        if len(daughters) > 0:
            # Check for missing frame_div
            if frame_div is None:
                raise ValueError(f'cell {cell} missing frame_div')
            # Check for missing parent
            for d in daughters:
                if lineage[d]['parent'] != cell:
                    raise ValueError(
                        f'cell {cell} divides into cell {d} but parent of {d} is {lineage[d]["parent"]}'
                    )
            divisions.append({'parent': cell, 'daughters': daughters, 't': frame_div})
    return divisions


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
