"""Tests for labelmaker.py"""

import numpy as np

from deepcell_label.labelmaker import LabelInfoMaker


class TestLabelInfoMaker:
    def test_empty(self):
        labels = np.zeros((1, 1, 1, 1))
        expected_ids = {0: np.array([])}
        expected_info = {0: {}}
        labeler = LabelInfoMaker(labels, tracking=True)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_one_cell(self):
        labels = np.ones((1, 1, 1, 1))
        expected_ids = {0: np.array([1])}
        expected_info = {
            0: {
                1: {
                    'label': 1,
                    'frames': [0],
                    'frame_div': None,
                    'daughters': [],
                    'capped': False,
                    'parent': None,
                }
            }
        }
        labeler = LabelInfoMaker(labels, tracking=True)

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_features_no_labels(self):
        labels = np.zeros((1, 1, 1, 2))
        labeler = LabelInfoMaker(labels, tracking=True)
        expected_ids = {0: np.array([]), 1: np.array([])}
        expected_info = {0: {}, 1: {}}

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_features_one_label(self):
        labels = np.ones((1, 1, 1, 2))
        labeler = LabelInfoMaker(labels, tracking=True)
        expected_track = {
            'label': 1,
            'frames': [0],
            'frame_div': None,
            'daughters': [],
            'capped': False,
            'parent': None,
        }
        expected_ids = {0: np.array([1]), 1: np.array([1])}
        expected_info = {0: {1: expected_track}, 1: {1: expected_track}}

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info

    def test_two_features_two_labels(self):
        labels = np.reshape([1, 2], (1, 1, 1, 2))
        labeler = LabelInfoMaker(labels, tracking=True)
        expected_ids = {0: np.array([1]), 1: np.array([2])}
        expected_info = {
            0: {
                1: {
                    'label': 1,
                    'frames': [0],
                    'frame_div': None,
                    'daughters': [],
                    'capped': False,
                    'parent': None,
                }
            },
            1: {
                2: {
                    'label': 2,
                    'frames': [0],
                    'frame_div': None,
                    'daughters': [],
                    'capped': False,
                    'parent': None,
                }
            },
        }

        assert self.compare_cell_ids(labeler.cell_ids, expected_ids)
        assert labeler.cell_info == expected_info
