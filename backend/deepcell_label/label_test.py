"""Test for File classes"""

import numpy as np
import pytest

from deepcell_label.label import Edit


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(app, db_session):
    db_session.autoflush = False


# Bypasses loading data from a zip file
class DummyEdit(Edit):
    def __init__(
        self,
        labels=None,
        cells=None,
        action=None,
        args=None,
        raw=None,
        write_mode='overlap',
    ):
        self.labels = labels
        self.cells = cells
        self.action = action
        self.args = args
        self.raw = raw
        self.write_mode = write_mode
        super().__init__(labels_zip=None)

    def load(self, labels_zip):
        pass


def cells_equal(a, b):
    for cell in a:
        if cell not in b:
            return False
    for cell in b:
        if cell not in a:
            return False
    return True


class TestEdit:
    def test_action_flood_holes(self, app):
        """Flooding holes does not spread to diagonal areas."""
        # fmt: off
        labels = np.array([
            [0, 1, 0],
            [1, 0, 1],
            [0, 1, 0],
        ], dtype=np.int32)
        expected_labels = np.array([
            [0, 1, 0],
            [1, 2, 1],
            [0, 1, 0],
        ], dtype=np.int32)
        # fmt: on
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]
        action = 'flood'
        args = {'foreground': 2, 'background': 0, 'x': 1, 'y': 1}

        with app.app_context():
            edit = DummyEdit(labels=labels, cells=cells, action=action, args=args)
            np.testing.assert_array_equal(edit.labels, expected_labels)

    def test_action_flood_label(self, app):
        """Flooding a label does spread to diagonal areas."""
        # 3 x 3 frame with label in diamond shape
        # fmt: off
        labels = np.array([
            [0, 1, 0],
            [1, 0, 1],
            [0, 1, 0],
        ], dtype=np.int32)
        expected_labels = np.array([
            [0, 2, 0],
            [2, 0, 2],
            [0, 2, 0],
        ], dtype=np.int32)
        # fmt: on
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]
        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='flood',
                args={'foreground': 2, 'background': 1, 'x': 1, 'y': 0},
                write_mode='overwrite',
            )
            np.testing.assert_array_equal(edit.labels, expected_labels)

    def test_action_draw_remove_label(self, app):
        """Erasing a label with by drawing over it."""
        labels = np.array([[1]], dtype=np.int32)
        expected = np.array([[0]], dtype=np.int32)
        cells = [{'cell': 1, 'value': 1}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='draw',
                args={'trace': '[[0, 0]]', 'brush_size': 1, 'cell': 1, 'erase': True},
            )
            np.testing.assert_array_equal(edit.labels, expected)

    def test_action_handle_draw_add_label(self, app):
        """Adding a label with by drawing it in."""
        labels = np.array([[0]], dtype=np.int32)
        expected = np.array([[1]], dtype=np.int32)
        cells = [{'cell': 1, 'value': 1}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='draw',
                args={'trace': '[[0, 0]]', 'brush_size': 1, 'cell': 1, 'erase': False},
            )
            np.testing.assert_array_equal(edit.labels, expected)

    def test_action_active_contour_other_labels_unchanged(self, app):
        """
        Tests that other labels not affected by active contouring a label
        """
        # top half 1, bottom half 2
        labels = np.ones((10, 10), dtype=np.int32)
        labels[5:, :] = 2
        initial_labels = labels.copy()
        raw = np.identity(10)
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='active_contour',
                args={'cell': 1},
                raw=raw,
            )
            np.testing.assert_array_equal(initial_labels == 2, edit.labels == 2)

    # TODO: active contouring has no effect in this test; find out what correct behavior is
    # def test_action_active_contour_label_too_small(self, app):
    #     """
    #     Tests that label smaller than the raw object is made larger by active contouring.
    #     """
    #     raw = np.zeros((10, 10))
    #     labels = np.zeros((10, 10), dtype=np.int32)
    #     labels[4:6, 4:6] = 1
    #     raw[2:8, 2:8] = 1
    #     cells = [{ 'cell': 1, 'value': 1}]
    #     edit = Edit(labels, raw, cells=cells)

    #     with app.app_context():
    #         edit.action_active_contour(1)
    #         assert int((edit.labels == 1).sum()) > (labels[project.frame] == 1).sum()

    def test_action_active_contour_label_too_large(self, app):
        """Tests that a label that is larger than the raw objects is made
        smaller by active contouring."""
        raw = np.zeros((10, 10))
        raw[3:6, 3:6] = 1
        labels = np.ones((10, 10), dtype=np.int32)
        labels[:, 0] = 0
        labels[:, -1] = 0
        labels[0, :] = 0
        labels[-1, :] = 0
        initial_labels = labels.copy()
        cells = [{'cell': 1, 'value': 1}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='active_contour',
                args={'cell': 1, 'min_pixels': 1},
                raw=raw,
            )
            assert int((edit.labels == 1).sum()) < int((initial_labels == 1).sum())

    def test_action_erode_delete_label(self, app):
        """Tests that a label is correctly removed when eroding deletes all of its pixels."""
        labels = np.zeros((3, 3), dtype=np.int32)
        labels[1, 1] = 1
        cells = [{'cell': 1, 'value': 1}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='erode',
                args={'cell': 1},
            )
            assert 1 not in edit.labels

    def test_action_erode_other_labels_unchanged(self, app):
        """Tests that other labels not affected by eroding a label."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        initial_labels = labels.copy()
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='erode',
                args={'cell': 1},
            )
            np.testing.assert_array_equal(initial_labels == 2, edit.labels == 2)

    def test_action_dilate_overlapping(self, app):
        """Dilating a label creates a new overlap value when write_mode is overlap."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = np.array([[1, 1], [3, 3]], dtype=np.int32)
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]
        expected_cells = [
            {'cell': 1, 'value': 1},
            {'cell': 1, 'value': 3},
            {'cell': 2, 'value': 3},
        ]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='dilate',
                args={'cell': 1},
                write_mode='overlap',
            )
            np.testing.assert_array_equal(edit.labels, expected_labels)
            assert cells_equal(edit.cells, expected_cells)

    def test_action_dilate_overwrite(self, app):
        """Dilating a label removes other labels when write_mode is overwrite."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = np.array([[1, 1], [1, 1]], dtype=np.int32)
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='dilate',
                args={'cell': 1},
                write_mode='overwrite',
            )
            np.testing.assert_array_equal(edit.labels, expected_labels)

    def test_action_dilate_exclude(self, app):
        """Dilating label does not affect other labels when write_mode is exclude."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = labels.copy()
        cells = [{'cell': 1, 'value': 1}, {'cell': 2, 'value': 2}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='dilate',
                args={'cell': 1},
                write_mode='exclude',
            )
            np.testing.assert_array_equal(expected_labels, edit.labels)

    def test_clean_labels(self, app):
        """Tests that labels are properly removed for values with no corresponding cell."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = np.array([[0, 0], [2, 2]], dtype=np.int32)
        cells = [{'cell': 1, 'value': 3}, {'cell': 2, 'value': 2}]

        with app.app_context():
            edit = DummyEdit(
                labels=labels,
                cells=cells,
                action='draw',
                args={'trace': '[]', 'brush_size': 0, 'cell': 2, 'erase': False},
                write_mode='exclude',
            )
            np.testing.assert_array_equal(edit.labels, expected_labels)
