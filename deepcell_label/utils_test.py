"""Tests for utils.py"""

import numpy as np

from deepcell_label import utils


def test_snakecase_to_camelcase():
    """Tests snakecase_to_camelcase"""
    snakecase = 'snake_case'
    camelcase = utils.snakecase_to_camelcase(snakecase)
    assert camelcase == 'snakeCase'


def test_snakecase_to_camelcase_empty():
    """Tests snakecase_to_camelcase with empty string"""
    snakecase = ''
    camelcase = utils.snakecase_to_camelcase(snakecase)
    assert camelcase == ''


def test_snakecase_to_camelcase_no_underscores():
    """Tests snakecase_to_camelcase with no underscores"""
    snakecase = 'snakeCase'
    camelcase = utils.snakecase_to_camelcase(snakecase)
    assert camelcase == 'snakeCase'


def test_snakecase_to_camelcase_only_underscores():
    """Tests snakecase_to_camelcase with only underscores"""
    snakecase = '___'
    camelcase = utils.snakecase_to_camelcase(snakecase)
    assert camelcase == '___'


def test_reformat_cell_info():
    """Tests reformat_cell_info"""
    cell_info = {
        1: {'frame_div': 1, 'parent': None, 'daughters': [2]},
        2: {'frame_div': None, 'parent': 1, 'daughters': []},
    }
    reformated = utils.reformat_cell_info(cell_info)
    expected = {
        1: {
            'divisionFrame': 1,
            'parent': None,
            'daughters': [2],
        },
        2: {
            'divisionFrame': None,
            'parent': 1,
            'daughters': [],
        },
    }
    assert reformated == expected


def test_add_parent_division_frame():
    """Tests add_parent_division_frame"""
    cell_info = {
        1: {'divisionFrame': 1, 'parent': None, 'daughters': [2, 3]},
        2: {'divisionFrame': None, 'parent': 1, 'daughters': []},
        3: {'divisionFrame': None, 'parent': 1, 'daughters': []},
    }
    added_info = utils.add_parent_division_frame(cell_info)
    expected = {
        1: {
            'parentDivisionFrame': None,
            'divisionFrame': 1,
            'parent': None,
            'daughters': [2, 3],
        },
        2: {
            'parentDivisionFrame': 1,
            'divisionFrame': None,
            'parent': 1,
            'daughters': [],
        },
        3: {
            'parentDivisionFrame': 1,
            'divisionFrame': None,
            'parent': 1,
            'daughters': [],
        },
    }
    assert added_info == expected


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
