"""Tests for labelmaker.py"""

import numpy as np
import pytest

from deepcell_label.labelmaker import LabelInfoMaker


class TestLabelInfoMaker():

    def compare_cell_ids(self, first, second):
        """Return whether two dicts of arrays are exactly equal"""
        if first.keys() != second.keys():
            return False
        return all(np.array_equal(first[key], second[key]) for key in first)

    def test_empty_labels(self):
        labels = np.zeros((1, 1, 1, 1))
        expected_ids = {0: np.array([])}
        expected_info = {0: {}}
        labeler = LabelInfoMaker(labels)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_one_label(self):
        labels = np.ones((1, 1, 1, 1))
        expected_ids = {0: np.array([1])}
        expected_info = {0: {1: {'label': '1', 'frames': [0], 'slices': ''}}}
        labeler = LabelInfoMaker(labels)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_frames_with_one_label(self):
        labels = np.ones((2, 1, 1, 1))
        expected_ids = {0: np.array([1])}
        expected_info = {0: {1: {'label': '1', 'frames': [0, 1], 'slices': ''}}}
        labeler = LabelInfoMaker(labels)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_frames_with_two_labels(self):
        labels = np.array([[[[1]]], [[[2]]]])
        expected_ids = {0: np.array([1, 2])}
        expected_info = {0: {1: {'label': '1', 'frames': [0], 'slices': ''},
                             2: {'label': '2', 'frames': [1], 'slices': ''}}}
        labeler = LabelInfoMaker(labels)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_features(self):
        labels = np.zeros((1, 1, 1, 2))
        expected_ids = {0: np.array([]), 1: np.array([])}
        expected_info = {0: {}, 1: {}}
        labeler = LabelInfoMaker(labels)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_tracking_empty(self):
        labels = np.zeros((1, 1, 1, 1))
        expected_ids = {0: np.array([])}
        expected_info = {0: {}}
        labeler = LabelInfoMaker(labels, tracking=True)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_tracking_one_cell(self):
        labels = np.ones((1, 1, 1, 1))
        expected_ids = {0: np.array([1])}
        expected_info = {0: {1: {
            'label': '1',
            'frames': [0],
            'frame_div': None,
            'daughters': [],
            'capped': False,
            'parent': None
        }}}
        labeler = LabelInfoMaker(labels, tracking=True)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_tracking_two_features(self):
        labels = np.ones((1, 1, 1, 2))
        with pytest.raises(ValueError):
            labeler = LabelInfoMaker(labels, tracking=True)
