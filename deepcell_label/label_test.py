"""Test for File classes"""

import numpy as np
import pytest

from deepcell_label.label import Edit


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(app, db_session):
    db_session.autoflush = False


class TestEdit:
    def test_action_flood_background(self, app):
        """Flooding background does no spread to diagonal areas."""
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
        overlaps = np.array([
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 1]])
        # fmt: on
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_flood(2, 0, 1, 1)
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
        overlaps = np.array([
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 1]])
        # fmt: on
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_flood(2, 1, 1, 0)
            np.testing.assert_array_equal(edit.labels, expected_labels)

    def test_action_draw_remove_label(self, app):
        """Erasing a label with by drawing over it."""
        labels = np.array([[1]], dtype=np.int32)
        expected = np.array([[0]], dtype=np.int32)
        overlaps = np.array([[0, 0], [0, 1]])
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_draw([(0, 0)], 1, 1, True)
            np.testing.assert_array_equal(edit.labels, expected)

    def test_action_handle_draw_add_label(self, app):
        """Adding a label with by drawing it in."""
        labels = np.array([[0]], dtype=np.int32)
        expected = np.array([[1]], dtype=np.int32)
        overlaps = np.array([[0, 0], [0, 1]])
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_draw([(0, 0)], 1, 1, False)
            np.testing.assert_array_equal(edit.labels, expected)

    def test_action_replace(self, app):
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected = np.array([[1, 1], [1, 1]], dtype=np.int32)
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_replace(1, 2)
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
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        edit = Edit(labels, raw, overlaps=overlaps)

        with app.app_context():
            edit.action_active_contour(1)
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
    #     overlaps = np.array([[0, 0], [0, 1]])
    #     edit = Edit(labels, raw, overlaps=overlaps)

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
        overlaps = np.array([[0, 0], [0, 1]])
        edit = Edit(labels, raw, overlaps=overlaps)

        with app.app_context():
            edit.action_active_contour(1, min_pixels=1)
            assert int((edit.labels == 1).sum()) < int((initial_labels == 1).sum())

    def test_action_erode_delete_label(self, app):
        """Tests that a label is correctly removed when eroding deletes all of its pixels."""
        labels = np.zeros((3, 3), dtype=np.int32)
        labels[1, 1] = 1
        overlaps = np.array([[0, 0], [0, 1]])
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_erode(1)
            assert 1 not in edit.labels

    def test_action_erode_other_labels_unchanged(self, app):
        """Tests that other labels not affected by eroding a label."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        initial_labels = labels.copy()
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        edit = Edit(labels, overlaps=overlaps)

        with app.app_context():
            edit.action_erode(1)
            np.testing.assert_array_equal(initial_labels == 2, edit.labels == 2)

    def test_action_dilate_overlapping(self, app):
        """Tests dilating a label when write_mode is overlap."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = np.array([[1, 1], [3, 3]], dtype=np.int32)
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        expected_overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1]])
        edit = Edit(labels, overlaps=overlaps, write_mode='overlap')

        with app.app_context():
            edit.action_dilate(1)
            np.testing.assert_array_equal(edit.labels, expected_labels)
            np.testing.assert_array_equal(edit.overlaps, expected_overlaps)

    def test_action_dilate_overwrite(self, app):
        """Tests that a dilated label does not affect other labels when write_mode is exclude."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = np.array([[1, 1], [1, 1]], dtype=np.int32)
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        edit = Edit(labels, overlaps=overlaps, write_mode='overwrite')

        with app.app_context():
            edit.action_dilate(1)
            np.testing.assert_array_equal(labels, expected_labels)

    def test_action_dilate_exclude(self, app):
        """Tests that a dilated label does not affect other labels when write_mode is exclude."""
        labels = np.array([[1, 1], [2, 2]], dtype=np.int32)
        expected_labels = labels.copy()
        overlaps = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 1]])
        edit = Edit(labels, overlaps=overlaps, write_mode='exclude')

        with app.app_context():
            edit.action_dilate(1)
            np.testing.assert_array_equal(expected_labels, edit.labels)
