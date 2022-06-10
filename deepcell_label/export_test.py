import unittest

import numpy as np

from deepcell_label.export import rewrite_segmentation


def test_rewrite_segmentation_swapped_cells():
    """
    Test that the segmentation is rewritten correctly when cells are swapped.
    """
    case = unittest.TestCase()
    segmentation = np.array([1, 2]).reshape((1, 1, 1, 2))
    cells = [
        {'value': 2, 'cell': 1, 't': 0},
        {'value': 1, 'cell': 2, 't': 0},
    ]
    expected_segmentation = np.array([2, 1]).reshape((1, 1, 1, 2))
    expected_cells = [
        {'value': 1, 'cell': 1, 't': 0},
        {'value': 2, 'cell': 2, 't': 0},
    ]

    new_segmentation, new_cells = rewrite_segmentation(segmentation, cells)
    np.testing.assert_array_equal(new_segmentation, expected_segmentation)
    case.assertCountEqual(new_cells, expected_cells)


def test_rewrite_segmentation_with_low_value_overlap():
    case = unittest.TestCase()
    segmentation = np.array([1, 2, 3]).reshape((1, 1, 1, 3))
    cells = [
        {'value': 2, 'cell': 1, 't': 0},
        {'value': 3, 'cell': 2, 't': 0},
        {'value': 1, 'cell': 1, 't': 0},
        {'value': 1, 'cell': 2, 't': 0},
    ]
    expected_segmentation = np.array([3, 1, 2]).reshape((1, 1, 1, 3))
    expected_cells = [
        {'value': 1, 'cell': 1, 't': 0},
        {'value': 2, 'cell': 2, 't': 0},
        {'value': 3, 'cell': 1, 't': 0},
        {'value': 3, 'cell': 2, 't': 0},
    ]

    new_segmentation, new_cells = rewrite_segmentation(segmentation, cells)
    np.testing.assert_array_equal(new_segmentation, expected_segmentation)
    case.assertCountEqual(new_cells, expected_cells)
