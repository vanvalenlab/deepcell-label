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

    # Check relationship columns have been made
    assert project.state is not None
    assert project.raw_frames is not None
    assert project.label_frames is not None


def test_get(mocker, db_session):
    """
    Test getting a project from the Projects table.
    Gets a project before it exists, creates a project, then gets it again.
    """
    # test that no projects exist
    project = models.Project.get(1)
    assert project is None

    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create(
        filename='filename',
        input_bucket='input_bucket',
        output_bucket='output_bucket',
        path='path')

    # test that the project can be found and is the same as the created one
    valid_id = project.id
    found_project = models.Project.get(valid_id)
    assert found_project == project


def test_get_label_array(project):
    """
    Test outlined label arrays to send to the front-end.
    """
    state = project.state
    label_arr = project.get_label_arr()
    assert len(label_arr) == state.height
    for row in label_arr:
        assert len(row) == state.width
    label_frame = np.array(label_arr)
    expected_frame = project.label_frames[state.frame].frame[..., state.channel]
    assert (label_frame[label_frame >= 0] == expected_frame[label_frame >= 0]).all()
    assert (label_frame[label_frame < 0] == -expected_frame[label_frame < 0]).all()


def test_get_label_png(project):
    """
    Test label frame PNGs to send to the front-end.
    """
    state = project.state
    label_png = project.get_label_png()
    assert type(label_png) is io.BytesIO
    expected_frame = project.label_frames[state.frame].frame[..., state.feature]
    expected_frame = np.ma.masked_equal(expected_frame, 0)
    expected_png = pngify(expected_frame,
                          vmin=0,
                          vmax=state.get_max_label(),
                          cmap=state.colormap)
    assert label_png.getvalue() == expected_png.getvalue()


def test_get_raw_png(project):
    """
    Test raw frame PNGs to send to the front-end.
    """
    state = project.state
    raw_png = project.get_raw_png()
    assert type(raw_png) is io.BytesIO
    if state.rgb:
        expected_frame = project.rgb_frames[state.frame].frame
        expected_png = pngify(expected_frame, vmin=None, vmax=None, cmap=None)
    else:
        expected_frame = project.raw_frames[state.frame].frame[..., state.channel]
        expected_png = pngify(expected_frame, vmin=0, vmax=None, cmap='cubehelix')
    assert raw_png.getvalue() == expected_png.getvalue()


def test_get_max_label(project):
    state = project.state
    max_label = state.get_max_label()
    assert max_label in project.label_array[..., state.feature]
    assert max_label + 1 not in project.label_array[..., state.feature]
    assert max_label == project.label_array[..., state.feature].max()
    if max_label == 0:
        assert (project.label_array[..., state.feature] == 0).all()


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
        path='path')

    # test finish project
    project.finish()
    found_project = models.Project.get(project.id)
    assert found_project.finished is not None
    # test finish state
    assert found_project.state.cell_ids is None
    assert found_project.state.cell_info is None
    # test finish frames
    for raw, rgb, label in zip(found_project.raw_frames,
                               found_project.rgb_frames,
                               found_project.label_frames):
        assert raw.frame is None
        assert rgb.frame is None
        assert label.frame is None
        assert label.lastUpdate is not None


def test_update_state(mocker, db_session):
    """Test updating state."""
    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create(
        filename='filename',
        input_bucket='input_bucket',
        output_bucket='output_bucket',
        path='path')

    project.state.update()
    assert project.state.numUpdates > 0
    assert project.state.firstUpdate is not None


def test_update_label_frame(mocker, db_session):
    """Test updating label frames."""
    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create(
        filename='filename',
        input_bucket='input_bucket',
        output_bucket='output_bucket',
        path='path')

    # Update label frame
    for label_frame in project.label_frames:
        label_frame.update()
        assert label_frame.numUpdates > 0
        assert label_frame.firstUpdate is not None


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
        assert frame.updatedAt is not None
        assert frame.numUpdates == 0
        # Must be set by methods
        assert frame.firstUpdate is None
        assert frame.lastUpdate is None


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


def test_state_init(project):
    """Test constructing the state for a project."""
    raw_frames = project.raw_frames
    raw_frame = raw_frames[0].frame
    label_frames = project.label_frames
    label_frame = label_frames[0].frame
    state = project.state
    assert raw_frame.shape[-1] == state.num_channels
    assert label_frame.shape[-1] == state.num_features
    assert len(raw_frames) == state.num_frames
    assert raw_frame.shape[0] == state.height
    assert raw_frame.shape[1] == state.width

    assert len(state.cell_ids) == state.num_features
    assert len(state.cell_info) == state.num_features
    for feature in range(state.num_features):
        assert len(state.cell_ids[feature]) == len(state.cell_info[feature])


def test_create_cell_info(project):
    """Test creating the cell info dict in the state for a project."""
    state = project.state
    # Combine all frames into one numpy array with shape (frames, height, width, features)
    label_array = np.array([frame.frame for frame in project.label_frames])
    for feature in range(state.num_features):
        labels = label_array[..., feature]
        labels_uniq = np.unique(labels[labels != 0])
        state.create_cell_info(feature, label_array)
        assert 0 not in state.cell_ids[feature]
        for label in labels_uniq:
            assert label in state.cell_ids[feature]
            assert str(label) == state.cell_info[feature][label]['label']
            label_in_frame = np.isin(label_array, label).any(axis=(1, 2))  # Height and width axes
            label_frames = state.cell_info[feature][label]['frames']
            no_label_frames = [i for i in range(state.num_frames) if i not in label_frames]
            assert label_in_frame[label_frames].all()
            assert not label_in_frame[no_label_frames].any()
