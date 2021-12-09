"""Test for File classes"""

import numpy as np
import pytest

from deepcell_label import label, models
from deepcell_label.conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(app, db_session):
    db_session.autoflush = False


# Tests can mock a actions different frames/features/channels
# by setting edit.project.frame/feature/channel within the test


class TestEdit:
    def test_del_cell_info_last_frame(self):
        labels = np.ones((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)
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
        edit = label.Edit(project)
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

    def test_action_swap_single_frame(self, app):
        # single 2 x 2 frame with one feature; cell 1 in top row, cell 2 in bottom row
        labels = np.reshape([1, 1, 2, 2], (1, 2, 2, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell1 = 1
        cell2 = 2
        feature = 0
        expected_swap = np.array([[2, 2], [1, 1]])

        with app.app_context():
            edit.action_swap_single_frame(cell1, cell2)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_swap)
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_swap_single_frame_with_label_not_in_frame(self, app):
        """Tests that swapping with a cell not in frame updates the cell info."""
        labels = np.reshape([1], (1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell1 = 1
        cell2 = 2
        expected_labels = np.reshape([2], (1, 1, 1, 1))

        with app.app_context():
            edit.action_swap_single_frame(cell1, cell2)
            np.testing.assert_array_equal(project.label_array, expected_labels)
            assert edit.y_changed
            assert edit.labels_changed
            assert cell2 in edit.tracks
            assert cell1 not in edit.tracks

    def test_action_flood_background(self, app):
        """Flooding background does NOT spread to diagonal areas."""
        # 3 x 3 frame with label in diamond shape
        labels = np.reshape([0, 1, 0, 1, 0, 1, 0, 1, 0], (1, 3, 3, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        flood_label, x_loc, y_loc = 2, 1, 1
        feature = 0
        expected_flood = np.reshape([0, 1, 0, 1, 2, 1, 0, 1, 0], (3, 3))

        with app.app_context():
            edit.action_flood(flood_label, x_loc, y_loc)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_flood)
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_flood_label(self, app):
        """Flooding a label does spread to diagonal areas."""
        # 3 x 3 frame with label in diamond shape
        labels = np.reshape([[0, 1, 0], [1, 0, 1], [0, 1, 0]], (1, 3, 3, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        flood_label, x_loc, y_loc = 2, 1, 0
        feature = 0
        expected_flood = np.reshape([[0, 2, 0], [2, 0, 2], [0, 2, 0]], (3, 3))

        with app.app_context():
            edit.action_flood(flood_label, x_loc, y_loc)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_flood)
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_handle_draw_remove_label(self, app):
        """Erasing a label with by drawing over it."""
        labels = np.reshape([1], (1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        feature = 0
        project.feature = 0
        edit = label.Edit(project)

        trace, foreground, background, brush_size = [(0, 0)], 0, 1, 1
        expected_draw = np.reshape([0], (1, 1))

        with app.app_context():
            edit.action_handle_draw(trace, foreground, background, brush_size)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_draw)
            assert background not in edit.labels.cell_info[feature]
            assert background not in edit.labels.cell_ids[feature]

    def test_action_handle_draw_add_label(self, app):
        """Adding a label with by drawing it in."""
        labels = np.reshape([0], (1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        trace, foreground, background, brush_size = [(0, 0)], 1, 0, 1
        feature = 0
        expected_draw = np.reshape([1], (1, 1))

        with app.app_context():
            edit.action_handle_draw(trace, foreground, background, brush_size)
            np.testing.assert_array_equal(edit.frame[..., feature], expected_draw)
            assert foreground in edit.labels.cell_info[feature]
            assert foreground in edit.labels.cell_ids[feature]

    def test_zstack_add_cell_info(self):
        labels = np.zeros((1, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        cell = 1
        frame = 0
        feature = 0

        # Add new label to first frame
        edit.add_cell_info(cell, frame)
        assert cell in cell_ids[feature]
        assert cell_info[feature][cell] == {
            'label': 1,
            'frames': [frame],
            'parent': None,
            'frame_div': None,
            'daughters': [],
            'capped': False,
        }
        assert edit.y_changed
        assert edit.labels_changed

    def test_add_cell_info_multiple_frames(self):
        num_frames = 5
        labels = np.zeros((num_frames, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)
        cell_ids = edit.labels.cell_ids
        cell_info = edit.labels.cell_info

        cell = 1
        feature = 0

        # Add new label to all frames
        for frame in range(num_frames):
            edit.add_cell_info(cell, frame)
            assert cell in cell_ids[feature]
            assert cell_info[feature][cell] == {
                'label': 1,
                'frames': list(range(frame + 1)),
                'parent': None,
                'frame_div': None,
                'daughters': [],
                'capped': False,
            }
            assert edit.y_changed
            assert edit.labels_changed

    def test_action_replace_single(self, app):
        # single 2 x 2 frame with two labels: 1s in top row, 2s in bottom
        labels = np.reshape([1, 1, 2, 2], (1, 2, 2, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)
        expected_labels = np.array([[[1], [1]], [[1], [1]]])

        cell1 = 1
        cell2 = 2
        with app.app_context():
            edit.action_replace_single(cell1, cell2)
            np.testing.assert_array_equal(edit.frame, expected_labels)
            assert 2 not in edit.tracks

    def test_action_active_contour_other_labels_unchanged(self, app):
        """
        Tests that other labels not affected by active contouring a label
        """
        labels = np.ones((1, 10, 10, 1))
        labels[:, 5:, :, :] = 2
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_active_contour(cell)
            np.testing.assert_array_equal(
                labels[project.frame] == other_cell, edit.frame == other_cell
            )

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
    #     edit = label.Edit(project)

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
        edit = label.Edit(project)

        cell = 1

        with app.app_context():
            edit.action_active_contour(cell)
            assert int((edit.frame == 1).sum()) < (labels[project.frame] == 1).sum()

    def test_action_erode_delete_label(self, app):
        """Tests that a label is correctly removed when eroding deletes all of its pixels."""
        labels = np.zeros((1, 3, 3, 1))
        labels[0, 1, 1, 0] = 1
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell = 1

        with app.app_context():
            edit.action_erode(cell)
            assert cell not in edit.frame
            assert cell not in project.labels.cell_ids[project.feature]
            assert cell not in project.labels.cell_info[project.feature]

    def test_action_erode_other_labels_unchanged(self, app):
        """Tests that other labels not affected by eroding a label."""
        labels = np.reshape([1, 1, 2, 2], (1, 2, 2, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_erode(cell)
            np.testing.assert_array_equal(
                labels[project.frame] == other_cell, edit.frame == other_cell
            )

    def test_action_dilate_other_labels_unchanged(self, app):
        """Tests that other labels not affected by dilating a label."""
        labels = np.reshape([1, 1, 2, 2], (1, 2, 2, 1))
        project = models.Project.create(DummyLoader(labels=labels))
        edit = label.Edit(project)

        cell = 1
        other_cell = 2

        with app.app_context():
            edit.action_dilate(cell)
            np.testing.assert_array_equal(
                labels[project.frame] == other_cell, edit.frame == other_cell
            )

    def test_replace_with_parent_with_overlap(self, app):
        """
        Replaces daughter with parent when the daughter exists before the div.
        """
        labels = np.reshape([1, 2, 1, 2], (2, 2, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2],
                    'parent': None,
                    'frames': [0, 1],
                },
                2: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [0, 1],
                },
            }
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        edit = label.Edit(project)

        daughter = 2
        expected_labels = np.reshape([1, 2, 1, 1], (2, 2, 1, 1))
        expected_cell_info = {
            0: {
                1: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [0, 1],
                },
                2: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [0],
                },
            }
        }

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            np.testing.assert_equal(project.label_array, expected_labels)
            assert edit.tracks == expected_cell_info[0]

    def test_replace_with_parent(self, app):
        """
        Replaces daughter with parent.
        """
        labels = np.reshape([1, 2], (2, 1, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2],
                    'parent': None,
                    'frames': [0],
                },
                2: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [1],
                },
            }
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        edit = label.Edit(project)

        daughter = 2
        expected_labels = np.reshape([1, 1], (2, 1, 1, 1))
        expected_cell_info = {
            0: {
                1: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [0, 1],
                }
            }
        }

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            np.testing.assert_equal(project.label_array, expected_labels)
            assert edit.tracks == expected_cell_info[0]

    def test_replace_with_parent_daughter_divides_in_future(self, app):
        """
        Replaces daughter with parent when the daughter divides after the parent.
        """
        labels = np.reshape([1, 0, 0, 2, 3, 0, 4, 5, 3], (3, 3, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2, 3],
                    'parent': None,
                    'frames': [0],
                },
                2: {
                    'capped': True,
                    'frame_div': 2,
                    'daughters': [4, 5],
                    'parent': 1,
                    'frames': [1],
                },
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [1],
                },
                4: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [2],
                },
                5: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [2],
                },
            }
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        edit = label.Edit(project)

        daughter = 2
        expected_labels = np.reshape([1, 0, 0, 1, 3, 0, 4, 5, 3], (3, 3, 1, 1))
        expected_cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 2,
                    'daughters': [4, 5],
                    'parent': None,
                    'frames': [0, 1],
                },
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [1],
                },
                4: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [2],
                },
                5: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [2],
                },
            }
        }

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            np.testing.assert_equal(project.label_array, expected_labels)
            assert edit.tracks == expected_cell_info[0]

    def test_replace_with_parent_daughter_divides_in_past(self, app):
        """
        Replaces daughter with parent when the daughter
        """
        labels = np.reshape([2, 0, 3, 4, 1, 0, 1, 2], (4, 2, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 3,
                    'daughters': [2],
                    'parent': None,
                    'frames': [2, 3],
                },
                2: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [3, 4],
                    'parent': 1,
                    'frames': [0, 3],
                },
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [1],
                },
                4: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [1],
                },
            }
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        edit = label.Edit(project)

        daughter = 2
        expected_labels = np.reshape([2, 0, 3, 4, 1, 0, 1, 1], (4, 2, 1, 1))
        expected_cell_info = {
            0: {
                1: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [2, 3],
                },
                2: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [3, 4],
                    'parent': None,
                    'frames': [0],
                },
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [1],
                },
                4: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [1],
                },
            }
        }

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            np.testing.assert_equal(project.label_array, expected_labels)
            assert edit.tracks == expected_cell_info[0]

    def test_add_self_as_daughter(self, app):
        """
        Add parent as a daughter of itself, creating a new label
        """
        labels = np.reshape([1, 1], (2, 1, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                    'frames': [0, 1],
                }
            }
        }
        expected_labels = np.reshape([1, 2], (2, 1, 1, 1))
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        project.frame = 1
        edit = label.Edit(project)

        parent = 1
        daughter = 1

        with app.app_context():
            edit.action_add_daughter(parent, daughter)
            tracks = edit.tracks
            np.testing.assert_equal(project.label_array, expected_labels)
            assert tracks[1]['capped']
            assert tracks[1]['daughters'] == [2]
            assert tracks[1]['frame_div'] == 1
            assert tracks[1]['parent'] is None
            assert not tracks[2]['capped']
            assert tracks[2]['frame_div'] is None
            assert tracks[2]['daughters'] == []
            assert tracks[2]['parent'] == 1

    def test_add_self_as_daughter_with_future_division(self, app):
        """
        Add parent as a daughter of itself when parent has a division in the future.
        """
        labels = np.reshape([0, 1, 0, 1, 2, 3], (3, 2, 1, 1))
        cell_info = {
            0: {
                1: {
                    'label': 1,
                    'capped': True,
                    'frame_div': 2,
                    'daughters': [2, 3],
                    'parent': None,
                    'frames': [0, 1],
                },
                2: {
                    'label': 2,
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [2],
                },
                3: {
                    'label': 3,
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [2],
                },
            }
        }
        expected_labels = np.reshape([0, 1, 0, 4, 2, 3], (3, 2, 1, 1))
        expected_lineage = {
            1: {
                'label': 1,
                'capped': True,
                'frame_div': 1,
                'daughters': [4],
                'parent': None,
                'frames': [0],
            },
            2: {
                'label': 2,
                'capped': False,
                'frame_div': None,
                'daughters': [],
                'parent': 4,
                'frames': [2],
            },
            3: {
                'label': 3,
                'capped': False,
                'frame_div': None,
                'daughters': [],
                'parent': 4,
                'frames': [2],
            },
            4: {
                'label': 4,
                'capped': True,
                'frame_div': 2,
                'daughters': [2, 3],
                'parent': 1,
                'frames': [1],
            },
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        project.frame = 1
        edit = label.Edit(project)

        parent = 1
        daughter = 1

        with app.app_context():
            edit.action_add_daughter(parent, daughter)
            tracks = edit.tracks
            np.testing.assert_equal(project.label_array, expected_labels)
            assert tracks == expected_lineage

    def test_add_self_as_daughter_to_existing_division(self, app):
        """
        Add parent as a daughter of itself when parent has a division in the future.
        """
        labels = np.reshape([0, 1, 2, 1], (2, 2, 1, 1))
        cell_info = {
            0: {
                1: {
                    'label': 1,
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2],
                    'parent': None,
                    'frames': [0, 1],
                },
                2: {
                    'label': 2,
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [1],
                },
            }
        }
        expected_labels = np.reshape([0, 1, 2, 3], (2, 2, 1, 1))
        expected_lineage = {
            1: {
                'label': 1,
                'capped': True,
                'frame_div': 1,
                'daughters': [2, 3],
                'parent': None,
                'frames': [0],
            },
            2: {
                'label': 2,
                'capped': False,
                'frame_div': None,
                'daughters': [],
                'parent': 1,
                'frames': [1],
            },
            3: {
                'label': 3,
                'capped': False,
                'frame_div': None,
                'daughters': [],
                'parent': 1,
                'frames': [1],
            },
        }
        loader = DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        project = models.Project.create(loader)
        project.frame = 1
        edit = label.Edit(project)

        parent = 1
        daughter = 1

        with app.app_context():
            edit.action_add_daughter(parent, daughter)
            tracks = edit.tracks
            np.testing.assert_equal(project.label_array, expected_labels)
            assert tracks == expected_lineage

    def test_add_daughter_new_division(self, app):
        # two 2 x 1 frames
        # one label in the first frame and two in the second frame
        labels = np.reshape([0, 1, 2, 3], (2, 2, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        project.frame = 1
        edit = label.Edit(project)

        parent = 1
        daughter = 2

        with app.app_context():
            edit.action_add_daughter(parent, daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            daughter_track = tracks[daughter]
            assert parent_track['capped']
            assert daughter in parent_track['daughters']
            assert parent_track['frame_div'] == 1
            assert daughter_track['parent'] == parent

    def test_add_daughter_existing_division(self, app):
        # two 2 x 1 frames
        # one label in the first frame and two in the second frame
        labels = np.reshape([0, 1, 2, 3], (2, 2, 1, 1))
        cell_info = {
            0: {
                1: {'capped': True, 'frame_div': 1, 'daughters': [2], 'parent': None},
                2: {'capped': False, 'frame_div': None, 'daughters': [], 'parent': 1},
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                },
            }
        }
        project = models.Project.create(
            DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        )
        edit = label.Edit(project)

        parent = 1
        daughter = 2
        other_daughter = 3
        frame_div = 1

        with app.app_context():
            edit.action_add_daughter(parent, other_daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            daughter_track = tracks[daughter]
            other_daughter_track = tracks[other_daughter]
            assert parent_track['capped']
            assert daughter in parent_track['daughters']
            assert other_daughter in parent_track['daughters']
            assert parent_track['frame_div'] == frame_div
            assert daughter_track['parent'] == parent
            assert other_daughter_track['parent'] == parent

    def test_remove_daughter_multiple_daughters(self, app):
        # two 2 x 1 frames
        # one label in the first frame and two in the second frame
        labels = np.reshape([0, 1, 2, 3], (2, 2, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2, 3],
                    'parent': None,
                },
                2: {'capped': False, 'frame_div': None, 'daughters': [], 'parent': 1},
                3: {'capped': False, 'frame_div': None, 'daughters': [], 'parent': 1},
            }
        }
        project = models.Project.create(
            DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        )
        edit = label.Edit(project)

        parent = 1
        daughter = 2
        other_daughter = 3

        with app.app_context():
            edit.action_remove_daughter(daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            daughter_track = tracks[daughter]
            other_daughter_track = tracks[other_daughter]
            assert parent_track['capped']
            assert parent_track['daughters'] == [other_daughter]
            assert parent_track['frame_div'] == 1
            assert daughter_track['parent'] is None
            assert other_daughter_track['parent'] == parent

    def test_remove_daughter_only_daughter(self, app):
        # two 2 x 1 frames
        # one label in the first frame and two in the second frame
        labels = np.reshape([0, 1, 2, 3], (2, 2, 1, 1))
        cell_info = {
            0: {
                1: {'capped': True, 'frame_div': 1, 'daughters': [2], 'parent': None},
                2: {'capped': False, 'frame_div': None, 'daughters': [], 'parent': 1},
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': None,
                },
            }
        }
        project = models.Project.create(
            DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        )
        edit = label.Edit(project)

        parent = 1
        daughter = 2

        with app.app_context():
            edit.action_remove_daughter(daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            daughter_track = tracks[daughter]
            assert not parent_track['capped']
            assert parent_track['daughters'] == []
            assert parent_track['frame_div'] is None
            assert daughter_track['parent'] is None

    def test_track_replace_daughter_with_parent(self, app):
        labels = np.reshape([1, 2], (2, 1, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2],
                    'parent': None,
                    'frames': [0],
                },
                2: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 1,
                    'frames': [1],
                },
            }
        }
        project = models.Project.create(
            DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        )
        edit = label.Edit(project)
        expected_labels = np.reshape([1, 1], (2, 1, 1, 1))

        parent = 1
        daughter = 2

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            assert daughter not in tracks
            assert not parent_track['capped']
            assert parent_track['daughters'] == []
            assert parent_track['frame_div'] is None
            assert parent_track['frames'] == [0, 1]
            np.testing.assert_array_equal(edit.project.label_array, expected_labels)

    def test_track_replace_daughter_that_divides_with_parent(self, app):
        labels = np.reshape([1, 2, 3], (3, 1, 1, 1))
        cell_info = {
            0: {
                1: {
                    'capped': True,
                    'frame_div': 1,
                    'daughters': [2],
                    'parent': None,
                    'frames': [0],
                },
                2: {
                    'capped': True,
                    'frame_div': 2,
                    'daughters': [3],
                    'parent': 1,
                    'frames': [1],
                },
                3: {
                    'capped': False,
                    'frame_div': None,
                    'daughters': [],
                    'parent': 2,
                    'frames': [2],
                },
            }
        }
        project = models.Project.create(
            DummyLoader(labels=labels, cell_info=cell_info, path='test.trk')
        )
        edit = label.Edit(project)
        expected_labels = np.reshape([1, 1, 3], (3, 1, 1, 1))

        parent = 1
        daughter = 2
        granddaughter = 3

        with app.app_context():
            edit.action_replace_with_parent(daughter)
            tracks = edit.tracks
            parent_track = tracks[parent]
            granddaughter_track = tracks[granddaughter]
            assert daughter not in tracks
            assert parent_track['capped']
            assert parent_track['daughters'] == [3]
            assert parent_track['frame_div'] == 2
            assert parent_track['frames'] == [0, 1]
            assert granddaughter_track['parent'] == 1
            np.testing.assert_array_equal(edit.project.label_array, expected_labels)

    def test_action_new_track_first_frame_of_track(self, app):
        """A new track on the first frame a label appears does nothing."""
        # two 1x1 frames with one feature; cell starts on second frame
        labels = np.reshape([0, 1], (2, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        cell = 1
        frame = 1
        feature = 0
        project.frame = frame
        project.feature = feature
        edit = label.Edit(project)
        tracks = edit.tracks

        prev_track = tracks[cell].copy()
        with app.app_context():
            edit.action_new_track(cell)
            assert cell in edit.frame[..., feature]
            assert prev_track == tracks[cell]

    def test_action_new_track(self, app):
        """Create a new track on the second frame of a label."""
        # two 1x1 frames with one feature; cell appears in both frames
        labels = np.reshape([1, 1], (2, 1, 1, 1))
        project = models.Project.create(DummyLoader(labels=labels, path='test.trk'))
        cell = 1
        frame = 1
        feature = 0
        expected_new_cell = 2
        project.frame = frame
        edit = label.Edit(project)
        tracks = edit.tracks
        prev_track = tracks[cell].copy()

        with app.app_context():
            edit.action_new_track(cell)
            assert cell not in edit.frame[..., feature]
            assert expected_new_cell in edit.frame[..., feature]
            assert expected_new_cell in edit.labels.cell_ids[feature]
            assert prev_track['frames'] == (
                tracks[cell]['frames'] + tracks[expected_new_cell]['frames']
            )
