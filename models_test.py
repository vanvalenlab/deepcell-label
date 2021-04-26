"""Test for DeepCell Label Models"""

import io

import numpy as np
import pytest

import models
from imgutils import pngify
from conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(db_session):
    db_session.autoflush = False
    pass


def test_project_init():
    """
    Test constructor for Project table.
    """
    project = models.Project(DummyLoader())

    # Check columns filled in by constructor
    project.path is not None
    project.source is not None
    project.num_frames is not None
    project.height is not None
    project.width is not None
    project.num_channels is not None
    project.num_features is not None
    project.colormap is not None


def test_is_track():
    project = models.Project(DummyLoader())

    valid_trks = ['test.trk', 'test.trks', 'test.TrKs', 'test.TRk']
    for name in valid_trks:
        project.path = name
        assert project.is_track

    invalid_trks = ['test.pdf', 'test.npz', 'a string']
    for name in invalid_trks:
        project.path = name
        assert not project.is_track


def test_is_zstack():
    project = models.Project(DummyLoader())

    valid_zstacks = ['test.npz', 'test.NpZ', 'test.png', 'test.tif', 'test.tiff']
    for name in valid_zstacks:
        project.path = name
        assert project.is_zstack

    invalid_zstacks = ['test.pdf', 'test.trk', 'test.trks', 'a string']
    for name in invalid_zstacks:
        project.path = name
        assert not project.is_zstack


def test_get_missing_project():
    """
    Gets a project before it exists.
    """
    project = models.Project.get(1)
    assert project is None


def test_get_project():
    """
    Test getting a project from the Projects table.
    creates a project, then gets it again.
    """
    project = models.Project.create(DummyLoader())

    valid_id = project.token
    found_project = models.Project.get(valid_id)
    assert found_project == project


def test_create():
    """
    Test creating a row in the Project table.
    """
    project = models.Project.create(DummyLoader())

    # Check columns populated by ORM
    assert project.id is not None
    assert project.createdAt is not None
    assert project.finished is None  # None until project is done
    assert project.rgb is not None
    assert project.frame is not None
    assert project.channel is not None
    assert project.feature is not None

    # Check relationships
    assert project.labels is not None
    assert project.raw_frames is not None
    assert project.rgb_frames is not None
    assert project.label_frames is not None

    raw_frames = project.raw_frames
    raw_frame = raw_frames[0].frame
    label_frames = project.label_frames
    label_frame = label_frames[0].frame

    assert raw_frame.shape[-1] == project.num_channels
    assert label_frame.shape[-1] == project.num_features
    assert len(raw_frames) == project.num_frames
    assert raw_frame.shape[0] == project.height
    assert raw_frame.shape[1] == project.width

    # Check we've assigned a token
    assert project.token is not None

    # Test that an action has been initialized
    assert project.action is not None
    assert project.num_actions == 1


def test_create_memento_no_changes(db_session):
    project = models.Project.create(DummyLoader())
    # Store action info before creating new action
    prev_action = project.action
    num_actions = project.num_actions

    project.create_memento(action_name='test')
    db_session.commit()

    assert prev_action is not project.action
    assert prev_action.next_action == project.action
    assert project.num_actions != num_actions
    assert project.action.next_action is None

    assert len(project.action.before_frames) == 0
    assert len(project.action.after_frames) == 0
    assert project.action.before_labels is not None
    assert project.action.after_labels is not None


def test_create_memento_frame_changed(db_session):
    project = models.Project.create(DummyLoader())

    # Store action before mocked action
    prev_action = project.action
    num_actions = project.num_actions

    # Mock action
    changed_frame = project.label_frames[0]
    new_frame = changed_frame.frame + 1
    project.label_frames[0].frame = new_frame
    project.create_memento(action_name='test')
    project.update()

    assert prev_action is not project.action
    assert prev_action.next_action == project.action
    assert project.num_actions != num_actions
    assert project.action.next_action is None

    assert len(project.action.after_frames) == 1
    assert project.action.after_frames[0].frame is changed_frame
    assert len(project.action.before_frames) == 1
    assert project.action.before_frames[0].frame is changed_frame


def test_undo_no_previous_action():
    """Test undoing at the start of the action history."""
    project = models.Project.create(DummyLoader())
    action = project.action
    num_actions = project.num_actions

    project.undo()

    assert project.action is action
    assert project.num_actions == num_actions


def test_redo_no_next_action():
    """Test redoing at the end of the action history."""
    project = models.Project.create(DummyLoader())
    action = project.action
    num_actions = project.num_actions

    project.redo()

    assert project.action is action
    assert project.num_actions == num_actions


def test_undo_first_action():
    """Tests undoing a project back to its initial state."""
    project = models.Project.create(DummyLoader())
    # Save current action before mocking action
    init_action = project.action
    # Mock an action and undo
    for frame in project.label_frames:
        frame.frame[:] = -1
    project.create_memento(action_name='first_action')
    project.update()
    # Save current action before undoing
    action = project.action
    num_actions = project.num_actions
    project.undo()

    assert project.action is init_action
    assert project.action is not action
    assert project.num_actions == num_actions
    assert -1 not in project.label_array


def test_redo_last_action():
    """Tests redoing a project back to its final state."""
    project = models.Project.create(DummyLoader())
    # Mock an action, undo, and redo
    for frame in project.label_frames:
        frame.frame[:] = -1
    project.create_memento('last_action')
    project.update()
    # Save action before undoing
    action = project.action
    project.undo()
    # Save action before redoing
    prev_action = project.action
    num_actions = project.num_actions
    project.redo()

    assert project.action is action
    assert project.action is not prev_action
    assert project.num_actions == num_actions
    assert -1 in project.label_array


def test_undo_frame_not_changed_in_previous_action():
    """
    Tests undoing when a frame may not be stored in the previous action.
    """
    # Create project with two frames
    project = models.Project.create(DummyLoader(raw=np.zeros((2, 1, 1, 1))))

    # Mock action on first frame
    project.label_frames[0].frame[:] = 1
    project.create_memento('first_frame_only')
    project.update()
    # Mock action on both frames
    for frame in project.label_frames:
        frame.frame[:] = 2
    project.create_memento('both_frames')
    project.update()
    # Undo second action
    project.undo()

    assert 2 not in project.label_array
    assert 1 in project.label_frames[0].frame
    assert 0 in project.label_frames[1].frame


def test_redo_frame_not_changed_in_next_action():
    """
    Tests redoing when a frame may not be stored in the next action.
    """
    # Create project with two frames
    project = models.Project.create(DummyLoader(raw=np.zeros((2, 1, 1, 1))))

    # Mock action on both frame
    for frame in project.label_frames:
        frame.frame[:] = 1
    project.create_memento('both_frames')
    project.update()
    # Mock action on first frame
    project.label_frames[0].frame[:] = 2
    project.create_memento('first_frame_only')
    project.update()
    # Undo both action
    project.undo()
    project.undo()
    # Redo first action
    project.redo()

    assert 0 not in project.label_array
    assert 2 not in project.label_array
    assert 1 in project.label_frames[0].frame
    assert 1 in project.label_frames[1].frame


def test_get_label_array():
    """
    Test outlined label arrays to send to the front-end.
    """
    project = models.Project.create(DummyLoader())

    expected_frame = project.label_frames[project.frame].frame[..., project.channel]

    label_arr = project._get_label_arr()
    label_frame = np.array(label_arr)

    assert label_frame.shape == (project.height, project.width)
    np.testing.assert_array_equal(label_frame[label_frame >= 0],
                                  expected_frame[label_frame >= 0])
    np.testing.assert_array_equal(label_frame[label_frame < 0],
                                  -expected_frame[label_frame < 0])


def test_get_label_png():
    """
    Test label frame PNGs to send to the front-end.
    """
    project = models.Project.create(DummyLoader())

    expected_frame = project.label_frames[project.frame].frame[..., project.feature]
    expected_frame = np.ma.masked_equal(expected_frame, 0)
    expected_png = pngify(expected_frame,
                          vmin=0,
                          vmax=project.get_max_label(),
                          cmap=project.colormap)

    label_png = project._get_label_png()

    assert isinstance(label_png, io.BytesIO)
    assert label_png.getvalue() == expected_png.getvalue()


def test_get_raw_png_greyscale():
    """
    Test raw frame PNGs to send to the front-end.
    """
    project = models.Project.create(DummyLoader())
    project.rgb = False
    project.update()
    expected_frame = project.raw_frames[project.frame].frame[..., project.channel]
    expected_png = pngify(expected_frame, vmin=0, vmax=None, cmap='cubehelix')

    raw_png = project._get_raw_png()
    assert isinstance(raw_png, io.BytesIO)
    assert raw_png.getvalue() == expected_png.getvalue()


def test_get_raw_png_rgb():
    project = models.Project.create(DummyLoader())
    project.rgb = True
    project.update()

    expected_frame = project.rgb_frames[project.frame].frame
    expected_png = pngify(expected_frame, vmin=None, vmax=None, cmap=None)

    raw_png = project._get_raw_png()
    assert isinstance(raw_png, io.BytesIO)
    assert raw_png.getvalue() == expected_png.getvalue()


def test_get_max_label_all_zeroes():
    labels = np.zeros((1, 1, 1, 1))
    project = models.Project.create(DummyLoader(labels=labels))
    max_label = project.get_max_label()
    assert max_label == 0


def test_get_max_label_all_ones():
    labels = np.ones((1, 1, 1, 1))
    project = models.Project.create(DummyLoader(labels=labels))
    max_label = project.get_max_label()
    assert max_label == 1


def test_get_max_label_two_features():
    labels = np.array([[[[1, 2]]]])
    project = models.Project.create(DummyLoader(labels=labels))
    project.feature = 0
    project.update()
    max_label = project.get_max_label()
    assert max_label == 1
    project.feature = 1
    project.update()
    max_label = project.get_max_label()
    assert max_label == 2


def test_get_max_label_two_frames():
    labels = np.array([[[[1]]], [[[2]]]])
    project = models.Project.create(DummyLoader(labels=labels))
    max_label = project.get_max_label()
    assert max_label == 2


def test_finish_project():
    """
    Test finishing a project.
    Checks that the project's relationship are also finished.
    """
    # create project
    project = models.Project.create(DummyLoader())

    project.finish()
    assert project.finished is not None
    assert project.labels.cell_ids is None
    assert project.labels.cell_info is None
    for raw, rgb, label in zip(project.raw_frames,
                               project.rgb_frames,
                               project.label_frames):
        assert raw.frame is None
        assert rgb.frame is None
        assert label.frame is None


def test_raw_frame_init():
    """Test constructing the raw frames for a project."""
    project = models.Project.create(DummyLoader())
    raw_frames = project.raw_frames
    for frame in raw_frames:
        assert len(frame.frame.shape) == 3  # Height, width, channels
        assert frame.frame_id is not None


def test_rgb_frame_init():
    """Test constructing the RGB frames for a project."""
    project = models.Project.create(DummyLoader())

    rgb_frames = project.rgb_frames
    for frame in rgb_frames:
        assert frame.frame.ndim == 3  # Height, width, features
        assert frame.frame_id is not None
        assert frame.frame.shape[2] == 3  # RGB channels


def test_label_frame_init():
    """Test constructing the label frames for a project."""
    project = models.Project.create(DummyLoader())

    label_frames = project.label_frames
    for frame in label_frames:
        assert frame.frame.ndim == 3  # Height, width, features
        assert frame.frame_id is not None


def test_frames_init():
    """Test that raw, RGB, and label frames within a project are all compatible."""
    project = models.Project.create(DummyLoader())

    raw_frames = project.raw_frames
    label_frames = project.label_frames
    rgb_frames = project.rgb_frames
    assert len(raw_frames) == len(label_frames)
    assert len(raw_frames) == len(rgb_frames)
    for raw_frame, label_frame, rgb_frame in zip(raw_frames, label_frames, rgb_frames):
        assert raw_frame.frame.shape[:-1] == label_frame.frame.shape[:-1]
        assert raw_frame.frame_id == label_frame.frame_id
        assert raw_frame.project_id == label_frame.project_id
        assert raw_frame.frame.shape[:-1] == rgb_frame.frame.shape[:-1]
        assert raw_frame.frame_id == rgb_frame.frame_id
        assert raw_frame.project_id == rgb_frame.project_id


def test_labels_init():
    """Test constructing the Labels row for a Project."""
    project = models.Project.create(DummyLoader())
    labels = project.labels

    assert len(labels.cell_ids) == project.num_features
    assert len(labels.cell_info) == project.num_features
    for feature in range(project.num_features):
        assert len(labels.cell_ids[feature]) == len(labels.cell_info[feature])
