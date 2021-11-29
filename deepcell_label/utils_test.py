"""Tests for utils.py"""

import pytest

from deepcell_label import utils


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
