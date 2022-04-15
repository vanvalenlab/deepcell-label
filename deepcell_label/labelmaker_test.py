"""Tests for labelmaker.py"""

import numpy as np

from deepcell_label.labelmaker import LabelInfoMaker


class TestLabelInfoMaker:
    def test_empty(self):
        labels = np.zeros((1, 1, 1, 1))
        expected_info = {0: {}}
        labeler = LabelInfoMaker(labels)

        assert labeler.cell_info == expected_info

    def test_one_cell(self):
        labels = np.ones((1, 1, 1, 1))
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
        labeler = LabelInfoMaker(labels)

        assert labeler.cell_info == expected_info

    def test_two_features_no_labels(self):
        labels = np.zeros((1, 1, 1, 2))
        labeler = LabelInfoMaker(labels)
        expected_info = {0: {}, 1: {}}

        assert labeler.cell_info == expected_info

    def test_two_features_one_label(self):
        labels = np.ones((1, 1, 1, 2))
        labeler = LabelInfoMaker(labels)
        expected_track = {
            'label': 1,
            'frames': [0],
            'frame_div': None,
            'daughters': [],
            'capped': False,
            'parent': None,
        }
        expected_info = {0: {1: expected_track}, 1: {1: expected_track}}

        assert labeler.cell_info == expected_info

    def test_two_features_two_labels(self):
        labels = np.reshape([1, 2], (1, 1, 1, 2))
        labeler = LabelInfoMaker(labels)
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

        assert labeler.cell_info == expected_info
