"""Tests for utils.py"""

import numpy as np

from deepcell_label import utils


def test_convert_lineage_with_no_cells():
    assert utils.convert_lineage({}) == []


def test_convert_lineage_with_no_divisions():
    lineage = {'1': {'frame_div': None, 'parent': None, 'daughters': []}}
    assert utils.convert_lineage(lineage) == []


def test_convert_lineage_with_one_division():
    lineage = {
        '1': {'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
        '2': {'frame_div': None, 'parent': 1, 'daughters': []},
        '3': {'frame_div': None, 'parent': 1, 'daughters': []},
    }
    assert utils.convert_lineage(lineage) == [
        {'parent': 1, 'daughters': [2, 3], 't': 1}
    ]


def test_convert_lineage_with_chained_divisions():
    lineage = {
        '1': {'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
        '2': {'frame_div': 2, 'parent': 1, 'daughters': [4, 5]},
        '3': {'frame_div': None, 'parent': 1, 'daughters': []},
        '4': {'frame_div': None, 'parent': 2, 'daughters': []},
        '5': {'frame_div': None, 'parent': 2, 'daughters': []},
    }
    assert utils.convert_lineage(lineage) == [
        {'parent': 1, 'daughters': [2, 3], 't': 1},
        {'parent': 2, 'daughters': [4, 5], 't': 2},
    ]


def test_convert_lineage_with_missing_frame_div():
    lineage = {
        '1': {'frame_div': None, 'parent': None, 'daughters': [2, 3]},
        '2': {'frame_div': None, 'parent': 1, 'daughters': []},
        '3': {'frame_div': None, 'parent': 1, 'daughters': []},
    }
    # TODO: assert ValueError
    try:
        utils.convert_lineage(lineage)
    except Exception:
        pass


def test_convert_lineage_with_missing_parent():
    lineage = {
        '1': {'frame_div': None, 'parent': None, 'daughters': [2, 3]},
        '2': {'frame_div': None, 'parent': 1, 'daughters': []},
        '3': {'frame_div': None, 'parent': None, 'daughters': []},
    }
    # TODO: assert ValueError
    try:
        utils.convert_lineage(lineage)
    except Exception:
        pass


def test_convert_lineage_with_missing_daughter():
    lineage = {
        '1': {'frame_div': None, 'parent': None, 'daughters': [2]},
        '2': {'frame_div': None, 'parent': 1, 'daughters': []},
        '3': {'frame_div': None, 'parent': 1, 'daughters': []},
    }
    # TODO: assert ValueError
    try:
        utils.convert_lineage(lineage)
    except Exception:
        pass


def test_reshape_out_of_order():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((3, 1, 2))
    input_axes = 'XYZ'
    output_axes = 'ZXY'

    reshaped = utils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_more_dimensions():
    array = np.zeros((1, 2, 3))
    expected = np.zeros((1, 2, 3, 1))
    input_axes = 'XYZ'
    output_axes = 'XYZC'

    reshaped = utils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_fewer_dimensions():
    array = np.zeros((1, 2, 3, 4))
    expected = np.zeros((1, 2, 4))
    input_axes = 'XYZC'
    output_axes = 'XYC'

    reshaped = utils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)


def test_reshape_too_many_input_dimensions():
    array = np.zeros((1, 2))
    expected = np.zeros((1, 2, 1, 1, 1))
    input_axes = 'XYZCT'
    output_axes = 'XYZCT'

    reshaped = utils.reshape(array, input_axes, output_axes)
    np.testing.assert_array_equal(reshaped, expected)
