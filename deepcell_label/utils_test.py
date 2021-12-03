"""Tests for utils.py"""

import pytest

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
        1: {'frame_div': 1, 'frame_div_parent': None, 'parent': None, 'daughters': [2]},
        2: {'frame_div': None, 'frame_div_parent': 1, 'parent': 1, 'daughters': []},
    }
    reformated = utils.reformat_cell_info(cell_info)
    expected = {
        1: {'divisionFrame': 1, 'parentDivisionFrame': None, 'parent': None, 'daughters': [2]},
        2: {'divisionFrame': None, 'parentDivisionFrame': 1, 'parent': 1, 'daughters': []},
    }
    assert reformated == expected


def test_add_frame_div_parent():
    """Tests add_frame_div_parent"""
    cell_info = {
        1: {'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
        2: {'frame_div': None, 'parent': 1, 'daughters': []},
        3: {'frame_div': None, 'parent': 1, 'daughters': []},
    }
    added_info = utils.add_frame_div_parent(cell_info)
    expected = {
        1: {'frame_div_parent': None, 'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
        2: {'frame_div_parent': 1, 'frame_div': None, 'parent': 1, 'daughters': []},
        3: {'frame_div_parent': 1, 'frame_div': None, 'parent': 1, 'daughters': []},
    }
    assert added_info == expected
