"""Tests for labelmaker.py"""

import numpy as np

from deepcell_label.cells import Cells


class TestCells:
    def test_empty(self):
        labels = np.zeros((1, 1, 1, 1))
        expected_cells = {0: {}}
        labeler = Cells(labels)

        assert labeler.cells == expected_cells

    def test_one_cell(self):
        labels = np.ones((1, 1, 1, 1))
        expected_cells = {
            0: {
                1: {
                    'label': 1,
                    'frames': [0],
                }
            }
        }
        labeler = Cells(labels)

        assert labeler.cells == expected_cells

    def test_two_features_no_labels(self):
        labels = np.zeros((1, 1, 1, 2))
        labeler = Cells(labels)
        expected_cells = {0: {}, 1: {}}

        assert labeler.cells == expected_cells

    def test_two_features_one_label(self):
        labels = np.ones((1, 1, 1, 2))
        labeler = Cells(labels)
        expected_cell = {
            'label': 1,
            'frames': [0],
        }
        expected_cells = {0: {1: expected_cell}, 1: {1: expected_cell}}

        assert labeler.cells == expected_cells

    def test_two_features_two_labels(self):
        labels = np.reshape([1, 2], (1, 1, 1, 2))
        labeler = Cells(labels)
        expected_cells = {
            0: {
                1: {
                    'label': 1,
                    'frames': [0],
                }
            },
            1: {
                2: {
                    'label': 2,
                    'frames': [0],
                }
            },
        }

        assert labeler.cells == expected_cells
