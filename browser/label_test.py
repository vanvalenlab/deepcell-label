"""Test for File classes"""

from copy import deepcopy
import itertools

import pytest
import numpy as np

import label
import models
from conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(app, db_session):
    db_session.autoflush = False

# Tests can mock a actions different frames/features/channels
# by setting edit.project.frame/feature/channel within the test


class TestChangeDisplay():

    def test_change_channel(self, app):
        raw = np.zeros((1, 1, 1, 3))
        project = models.Project.create(DummyLoader(raw=raw))
        change_display = label.ChangeDisplay(project)

        with app.app_context():
            for channel in range(3):
                change_display.change('channel', channel)
                assert change_display.project.channel == channel
            with pytest.raises(ValueError):
                change_display.change('channel', -1)
            with pytest.raises(ValueError):
                change_display.change('channel', 3)

    def test_change_feature(self, app):
        labels = np.zeros((1, 1, 1, 3))
        project = models.Project.create(DummyLoader(labels=labels))
        change_display = label.ChangeDisplay(project)

        with app.app_context():
            for feature in range(3):
                change_display.change('feature', feature)
                assert change_display.project.feature == feature
            with pytest.raises(ValueError):
                change_display.change('feature', -1)
            with pytest.raises(ValueError):
                change_display.change('feature', 3)

    def test_change_frame(self, app):
        raw = np.zeros((3, 1, 1, 1))
        project = models.Project.create(DummyLoader(raw=raw))
        change_display = label.ChangeDisplay(project)

        with app.app_context():
            for frame in range(3):
                change_display.change('frame', frame)
                assert change_display.project.frame == frame
            with pytest.raises(ValueError):
                change_display.change('frame', -1)
            with pytest.raises(ValueError):
                change_display.change('frame', 3)


class TestBaseEdit():

    def test_del_cell_info_last_frame(self):
        labels = np.ones((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.TrackEdit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        feature = 0
        cell = 1
        frame = 0

        # Remove the label completely (only remaining frame)
        edit.del_cell_info(cell, frame)
        assert cell not in cell_ids[feature]
        assert cell not in cell_info[feature]
        assert edit.y_changed
        assert edit.labels_changed
        np.testing.assert_array_equal(cell_ids[feature], np.array([]))
        assert edit.labels.cell_info[feature] == {}

    def test_def_cell_info_one_frame(self):
        labels = np.ones((2, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.TrackEdit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        feature = 0
        cell = 1
        frame = 1

        # Remove from second frame only
        edit.del_cell_info(cell, frame)
        assert cell in cell_ids[feature]
        assert cell in cell_info[feature]
        assert frame not in cell_info[feature][frame]['frames']
        assert edit.y_changed
        assert edit.labels_changed

    def test_action_new_single_cell(self, app):
        labels = np.ones((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.TrackEdit(project)

        cell = 1
        feature = 0
        expected_new_label = 2
        frame = 0

        with app.app_context():
            edit.action_new_single_cell(cell)
            assert expected_new_label in edit.frame[..., feature]
            assert cell not in edit.frame[..., feature]
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_delete_mask(self, app):
        labels = np.ones((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.TrackEdit(project)

        cell = 1
        feature = 0

        with app.app_context():
            edit.action_delete_mask(cell)
            assert cell not in edit.frame[..., feature]
            assert edit.labels_changed
            assert edit.y_changed

    def test_action_swap_single_frame(self, app):
        # single 2 x 2 frame with one feature; cell 1 in top row, cell 2 in bottom row
        labels = np.array([[[[1], [1]], [[2], [2]]]])
        assert labels.shape == (1, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.TrackEdit(project)

        cell1 = 1
        cell2 = 2
        feature = 0
        expected_swap = np.array([[2, 2], [1, 1]])

        with app.app_context():
            edit.action_swap_single_frame(cell1, cell2)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_swap)
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_active_contour_other_labels_unchanged(self, app):
        """
        Tests that other labels not affected by active contouring a label
        """
        labels = np.ones((1, 10, 10, 1))
        labels[:, 5:, :, :] = 2
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_active_contour(cell)
            np.testing.assert_array_equal(labels[project.frame] == other_cell,
                                          edit.frame == other_cell)

    # TODO: active contouring has no effect in this test; find out what correct behavior is
    # def test_action_active_contour_label_too_small(self, app):
    #     """
    #     Tests that label smaller than the raw object is made larger by active contouring.

    #     """
    #     raw = np.zeros((1, 10, 10, 1))
    #     labels = np.zeros((1, 10, 10, 1))
    #     labels[0, 4:6, 4:6, 0] = 1
    #     raw[0, 2:8, 2:8, 0] = 1
    #     project = models.Project.create(DummyLoader(raw=raw, labels=labels))
    #     edit = label.ZStackEdit(project)

    #     cell = 1

    #     with app.app_context():
    #         edit.action_active_contour(cell)
    #         assert int((edit.frame == 1).sum()) > (labels[project.frame] == 1).sum()

    def test_action_active_contour_label_too_large(self, app):
        """Tests that a label that is larger than the raw objects is made
        smaller by active contouring."""
        raw = np.zeros((1, 10, 10, 1))
        labels = np.ones((1, 10, 10, 1))
        raw[0, 3:6, 3:6, 0] = 1
        project = models.Project.create(DummyLoader(raw=raw, labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1

        with app.app_context():
            edit.action_active_contour(cell)
            assert int((edit.frame == 1).sum()) < (labels[project.frame] == 1).sum()

    def test_action_erode_delete_label(self, app):
        """Tests that a label is correctly removed when eroding deletes all of its pixels."""
        labels = np.zeros((1, 3, 3, 1))
        labels[0, 1, 1, 0] = 1
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1

        with app.app_context():
            edit.action_erode(cell)
            assert cell not in edit.frame
            assert cell not in project.labels.cell_ids[project.feature]
            assert cell not in project.labels.cell_info[project.feature]

    def test_action_erode_other_labels_unchanged(self, app):
        """Tests that other labels not affected by eroding a label."""
        labels = np.array([[[[1], [1]], [[2], [2]]]])
        assert labels.shape == (1, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_erode(cell)
            np.testing.assert_array_equal(labels[project.frame] == other_cell,
                                          edit.frame == other_cell)

    def test_action_dilate_other_labels_unchanged(self, app):
        """Tests that other labels not affected by dilating a label."""
        labels = np.array([[[[1], [1]], [[2], [2]]]])
        assert labels.shape == (1, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_dilate(cell)
            np.testing.assert_array_equal(labels[project.frame] == other_cell,
                                          edit.frame == other_cell)


class TestZStackEdit():

    def test_zstack_add_cell_info(self):
        labels = np.zeros((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        cell = 1
        frame = 0
        feature = 0

        # Add new label to first frame
        edit.add_cell_info(cell, frame)
        assert cell in cell_ids[feature]
        assert cell_info[feature][cell] == {'label': '1',
                                            'frames': [frame],
                                            'slices': ''}
        assert edit.y_changed
        assert edit.labels_changed

    def test_add_cell_info_multiple_frames(self):
        num_frames = 5
        labels = np.zeros((num_frames, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        cell = 1
        feature = 0

        # Add new label to all frames
        for frame in range(num_frames):
            edit.add_cell_info(cell, frame)
            assert cell in cell_ids[feature]
            assert cell_info[feature][cell] == {'label': '1',
                                                'frames': list(range(frame + 1)),
                                                'slices': ''}
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_new_cell_stack(self, app):
        labels = np.ones((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)

        cell = 1
        feature = 0
        expected_new_cell = 2

        with app.app_context():
            edit.action_new_cell_stack(cell)
            assert cell not in edit.frame[..., feature]
            assert expected_new_cell in edit.frame[..., feature]

    def test_action_replace_single(self, app):
        # single 2 x 2 frame with two labels: 1s in top row, 2s in bottom
        labels = np.array([[[[1], [1]],
                            [[2], [2]]]])
        assert labels.shape == (1, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)
        expected_labels = np.array([[[1], [1]],
                                    [[1], [1]]])

        cell1 = 1
        cell2 = 2
        with app.app_context():
            edit.action_replace_single(cell1, cell2)
            np.testing.assert_array_equal(edit.frame, expected_labels)

    def test_action_replace(self, app):
        # three 2 x 2 frame with two labels: 1s in top row, 2s in bottom
        frame = np.array([[[1], [1]],
                          [[2], [2]]])
        labels = np.array([frame] * 3)
        assert labels.shape == (3, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)
        expected_frame = np.array([[[1], [1]],
                                   [[1], [1]]])
        expected_labels = np.array(3 * [expected_frame])

        cell1 = 1
        cell2 = 2
        frame = 1  # Replace on the middle frame
        edit.project.frame = frame

        with app.app_context():
            edit.action_replace(cell1, cell2)
            np.testing.assert_array_equal(edit.project.label_array, expected_labels)

    def test_action_swap_all_frame(self, app):
        # three 2 x 2 frame with two labels: 1s in top row, 2s in bottom
        frame = np.array([[[1], [1]],
                          [[2], [2]]])
        labels = np.array([frame] * 3)
        assert labels.shape == (3, 2, 2, 1)
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.ZStackEdit(project)
        expected_frame = np.array([[[2], [2]],
                                   [[1], [1]]])
        expected_labels = np.array(3 * [expected_frame])

        cell1 = 1
        cell2 = 2
        frame = 1  # Replace on the middle frame

        with app.app_context():
            edit.project.frame = frame
            edit.action_swap_all_frame(cell1, cell2)
            np.testing.assert_array_equal(edit.project.label_array, expected_labels)
            assert edit.y_changed


class TestTrackEdit():

    def test_track_add_cell_info(self):
        labels = np.zeros((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        edit = label.TrackEdit(project)
        tracks = edit.labels.tracks

        cell = 1
        frame = 0

        # Add new label to first frame
        edit.add_cell_info(cell, frame)
        assert tracks[cell] == {
            'label': '1',
            'frames': [frame],
            'daughters': [],
            'frame_div': None,
            'parent': None,
            'capped': False,
        }
        assert edit.y_changed
        assert edit.labels_changed

    def test_add_cell_info_multiple_frames(self):
        num_frames = 5
        labels = np.zeros((num_frames, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        edit = label.TrackEdit(project)
        tracks = edit.labels.tracks

        cell = 1

        # Add new label to all frames
        for frame in range(num_frames):
            edit.add_cell_info(cell, frame)
            assert tracks[cell] == {
                'label': '1',
                'frames': list(range(frame + 1)),
                'daughters': [],
                'frame_div': None,
                'parent': None,
                'capped': False,
            }
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_new_track_first_frame_of_track(self, app):
        """A new track on the first frame a label appears does nothing."""
        # two 1x1 frames with one feature; cell starts on second frame
        labels = np.array([[[[0]]],
                           [[[1]]]])
        assert labels.shape == (2, 1, 1, 1)
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        edit = label.TrackEdit(project)
        tracks = edit.labels.tracks

        cell = 1
        frame = 1
        feature = 0
        prev_track = tracks[cell].copy()
        with app.app_context():
            edit.project.frame = frame
            edit.action_new_track(cell)
            assert cell in edit.frame[..., feature]
            assert prev_track == tracks[cell]

    def test_action_new_track(self, app):
        """A new track on the first frame a label appears does nothing."""
        # two 1x1 frames with one feature; cell starts on second frame
        labels = np.array([[[[1]]],
                           [[[1]]]])
        assert labels.shape == (2, 1, 1, 1)
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        edit = label.TrackEdit(project)
        tracks = edit.labels.tracks

        cell = 1
        frame = 1
        feature = 0
        expected_new_cell = 2
        prev_track = tracks[cell].copy()
        with app.app_context():
            edit.project.frame = frame
            edit.action_new_track(cell)
            assert cell not in edit.frame[..., feature]
            assert expected_new_cell in edit.frame[..., feature]
            assert expected_new_cell in edit.labels.cell_ids[feature]
            assert prev_track['frames'] == (tracks[cell]['frames'] +
                                            tracks[expected_new_cell]['frames'])
