"""Test for Caliban Models"""

import io

import numpy as np
import pytest

import models
from imgutils import pngify


def test_project_init(project):
    """
    Test constructor for Project table.
    Checks for relationships to state and frames.
    """
    # Check columns are made (except finished)
    assert project.id is not None
    assert project.createdAt is not None
    assert project.finished is None  # None until project is done
    assert project.filename is not None
    assert project.path is not None
    assert project.output_bucket is not None
    assert project.rgb is not None
    assert project.frame is not None
    assert project.channel is not None
    assert project.feature is not None
    assert project.scale_factor is not None
    assert project.colormap is not None

    # Check column correctness
    raw_frames = project.raw_frames
    raw_frame = raw_frames[0].frame
    label_frames = project.label_frames
    label_frame = label_frames[0].frame

    assert raw_frame.shape[-1] == project.num_channels
    assert label_frame.shape[-1] == project.num_features
    assert len(raw_frames) == project.num_frames
    assert raw_frame.shape[0] == project.height
    assert raw_frame.shape[1] == project.width

    # Test that an action has been initialized
    assert project.action is not None
    assert project.action_id == 0
    assert project.num_actions == 1

    # Check relationship columns have been made
    assert project.labels is not None
    assert project.raw_frames is not None
    assert project.rgb_frames is not None
    assert project.label_frames is not None


def test_get(mocker, db_session):
    """
    Test getting a project from the Projects table.
    Gets a project before it exists, creates a project, then gets it again.
    """
    # test that no projects exist
    project = models.Project.get(1, session=db_session)
    assert project is None

    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create(
        filename='filename',
        input_bucket='input_bucket',
        output_bucket='output_bucket',
        path='path',
        session=db_session)

    # test that the project can be found and is the same as the created one
    valid_id = project.id
    found_project = models.Project.get(valid_id, session=db_session)
    assert found_project == project


def test_finish_action(project):
    # Store action info before creating new action
    prev_action = project.action
    num_actions = project.num_actions

    project.finish_action(action_name='test')

    assert prev_action is not project.action
    assert prev_action.next_action_id == project.action_id
    assert project.action_id == project.action.action_id
    assert project.num_actions != num_actions
    assert project.action.next_action_id is None

    assert not project.action.y_changed
    assert not project.action.labels_changed


def test_undo(project):
    """Test where we move in the action history when undoing."""
    action = project.action
    num_actions = project.num_actions

    project.undo()

    if action.prev_action_id is None:
        assert project.action is action
    else:
        assert project.action_id == action.prev_action_id
    assert project.num_actions == num_actions


def test_redo(project):
    """Test where we move in the action history when redoing."""

    action = project.action
    num_actions = project.num_actions

    project.redo()

    if action.next_action_id is None:
        assert project.action is action
    else:
        assert project.action_id == action.next_action_id
    assert project.num_actions == num_actions


def test_get_label_array(project):
    """
    Test outlined label arrays to send to the front-end.
    """
    label_arr = project._get_label_arr()
    assert len(label_arr) == project.height
    for row in label_arr:
        assert len(row) == project.width
    label_frame = np.array(label_arr)
    expected_frame = project.label_frames[project.frame].frame[..., project.channel]
    assert (label_frame[label_frame >= 0] == expected_frame[label_frame >= 0]).all()
    assert (label_frame[label_frame < 0] == -expected_frame[label_frame < 0]).all()


def test_get_label_png(project):
    """
    Test label frame PNGs to send to the front-end.
    """
    label_png = project._get_label_png()
    assert type(label_png) is io.BytesIO
    expected_frame = project.label_frames[project.frame].frame[..., project.feature]
    expected_frame = np.ma.masked_equal(expected_frame, 0)
    expected_png = pngify(expected_frame,
                          vmin=0,
                          vmax=project.get_max_label(),
                          cmap=project.colormap)
    assert label_png.getvalue() == expected_png.getvalue()


def test_get_raw_png(project):
    """
    Test raw frame PNGs to send to the front-end.
    """
    raw_png = project._get_raw_png()
    assert type(raw_png) is io.BytesIO
    if project.rgb:
        expected_frame = project.rgb_frames[project.frame].frame
        expected_png = pngify(expected_frame, vmin=None, vmax=None, cmap=None)
    else:
        expected_frame = project.raw_frames[project.frame].frame[..., project.channel]
        expected_png = pngify(expected_frame, vmin=0, vmax=None, cmap='cubehelix')
    assert raw_png.getvalue() == expected_png.getvalue()


def test_get_max_label(project):
    max_label = project.get_max_label()
    assert max_label in project.label_array[..., project.feature]
    assert max_label + 1 not in project.label_array[..., project.feature]
    assert max_label == project.label_array[..., project.feature].max()
    if max_label == 0:
        assert (project.label_array[..., project.feature] == 0).all()


def test_finish_project(mocker, db_session):
    """
    Test finishing a project.
    Checks that the project's relationship are also finished.
    """
    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create(
        filename='filename',
        input_bucket='input_bucket',
        output_bucket='output_bucket',
        path='path',
        session=db_session)

    # test finish project
    project.finish()
    found_project = models.Project.get(project.id, session=db_session)
    assert found_project.finished is not None
    # test finish Labels
    assert found_project.labels.cell_ids is None
    assert found_project.labels.cell_info is None
    # test finish frames
    for raw, rgb, label in zip(found_project.raw_frames,
                               found_project.rgb_frames,
                               found_project.label_frames):
        assert raw.frame is None
        assert rgb.frame is None
        assert label.frame is None


def test_raw_frame_init(project):
    """Test constructing the raw frames for a project."""
    raw_frames = project.raw_frames
    for frame in raw_frames:
        assert len(frame.frame.shape) == 3  # Height, width, channels
        assert frame.frame_id is not None


def test_rgb_frame_init(project):
    """Test constructing the RGB frames for a project."""
    rgb_frames = project.rgb_frames
    for frame in rgb_frames:
        assert len(frame.frame.shape) == 3  # Height, width, features
        assert frame.frame_id is not None
        assert frame.frame.shape[2] == 3  # RGB channels


def test_label_frame_init(project):
    """Test constructing the label frames for a project."""
    label_frames = project.label_frames
    for frame in label_frames:
        assert len(frame.frame.shape) == 3  # Height, width, features
        assert frame.frame_id is not None


def test_frames_init(project):
    """Test that raw, RGB, and label frames within a project are all compatible."""
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


def test_labels_init(project):
    """Test constructing the Labels row for a Project."""
    labels = project.labels

    assert len(labels.cell_ids) == project.num_features
    assert len(labels.cell_info) == project.num_features
    for feature in range(project.num_features):
        assert len(labels.cell_ids[feature]) == len(labels.cell_info[feature])


def test_create_cell_info(project):
    """Test creating the cell info dict in the Labels table for a project."""
    labels = project.labels
    # Combine all frames into one numpy array with shape (frames, height, width, features)
    label_array = np.array([frame.frame for frame in project.label_frames])
    for feature in range(project.num_features):
        feature_labels = label_array[..., feature]
        labels_uniq = np.unique(feature_labels[feature_labels != 0])
        labels.create_cell_info(feature, label_array)
        assert 0 not in labels.cell_ids[feature]
        for label in labels_uniq:
            assert label in labels.cell_ids[feature]
            assert str(label) == labels.cell_info[feature][label]['label']
            label_in_frame = np.isin(label_array, label).any(axis=(1, 2))  # Height and width axes
            label_frames = labels.cell_info[feature][label]['frames']
            no_label_frames = [i for i in range(project.num_frames) if i not in label_frames]
            assert label_in_frame[label_frames].all()
            assert not label_in_frame[no_label_frames].any()
