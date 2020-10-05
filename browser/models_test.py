"""Test for Caliban Models"""

import pickle

import numpy as np
import pytest

import models


def test_project_init(project):
    # Check columns are made (except finished) 
    assert project.id is not None
    assert project.createdAt is not None
    assert project.finished is None # None until project is done

    # Check relationship columns have been made
    assert project.metadata_ is not None
    assert project.raw_frames is not None
    assert project.label_frames is not None

def test_get_project(mocker, db_session):
    # test that no projects exist
    project = models.Project.get_project(1)
    assert project is None

    # create project
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)), 'annotated': np.zeros((1, 1, 1, 1))}
    mocker.patch('models.Project.load', load)
    project = models.Project.create_project(
        filename='filename',
        input_bucket='input_bucket', 
        output_bucket='output_bucket',
        path='path')

    # test that the project can be found and is the same as the created one
    valid_id = project.id
    found_project = models.Project.get_project(valid_id)
    assert found_project == project

def test_finish_project(db_session):
    pass

def test_raw_frame_init(project):
    raw_frames = project.raw_frames
    for frame in raw_frames:
        assert len(frame.frame.shape) == 3 # Height, width, channels
        assert frame.frame_id is not None
    
def test_rgb_frame_init(project):
    rgb_frames = project.rgb_frames
    for frame in rgb_frames:
        assert len(frame.frame.shape) == 3 # Height, width, features
        assert frame.frame_id is not None
        assert frame.frame.shape[2] == 3 # RGB channels

def test_label_frame_init(project):
    label_frames = project.label_frames
    for frame in label_frames:
        assert len(frame.frame.shape) == 3 # Height, width, features
        assert frame.frame_id is not None
        assert frame.createdAt is not None
        assert frame.updatedAt is not None
        assert frame.numUpdates == 0
        # Must be set by methods
        assert frame.finished is None
        assert frame.firstUpdate is None
        assert frame.lastUpdate is None

def test_frames_init(project):
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

def test_metadata_init(project):
    raw_frames = project.raw_frames
    raw_frame = raw_frames[0].frame
    label_frames = project.label_frames
    label_frame = label_frames[0].frame
    metadata = project.metadata_
    assert raw_frame.shape[-1] == metadata.numChannels
    assert label_frame.shape[-1] == metadata.numFeatures
    assert len(raw_frames) == metadata.numFrames
    assert raw_frame.shape[0] == metadata.height
    assert raw_frame.shape[1] == metadata.width

    assert len(metadata.cell_ids) == metadata.numFeatures
    assert len(metadata.cell_info) == metadata.numFeatures
    for feature in range(metadata.numFeatures):
        assert len(metadata.cell_ids[feature]) == len(metadata.cell_info[feature])

# def test_project(project, db_session):
#     # TODO: is there a good way to separate these tests into unit tests?

#     # test that no projects exist
#     project = models.Project.get_project(1)
#     assert project is None

#     # test create project
#     filename = 'filename'
#     input_bucket = 'input_bucket'
#     output_bucket = 'output_bucket' 
#     path = 'path'

#     project = models.Project.create_project(
#         filename = 'filename',
#         input_bucket = 'input_bucket', 
#         output_bucket = 'output_bucket',
#         path = 'path')

#     valid_id = models.Project.id

#     # test that the project can be found and is the same as the created one
#     found_project = models.Project.get_project(valid_id)
#     assert found_project == project

#     # test project is updated
#     new_state = b'updated state data'
#     models.Project.update_project(project, new_state)

#     # get the updated project and make sure the data is updated.
#     found_project = models.Project.get_project_by_id(valid_id)
#     pickled_state = pickle.dumps(new_state, pickle.HIGHEST_PROTOCOL)
#     assert found_project.state == pickled_state

#     # test project is finished
#     models.Project.finish_project(project)
#     found_project = models.Project.get_project_by_id(valid_id)
#     assert found_project.state is None
#     assert found_project.finished is not None
#     assert found_project.lastUpdate is not None


def test_create_cell_info(project):
    metadata = project.metadata_
    # Combine all frames into one numpy array with shape (frames, height, width, features)
    label_array = np.array([frame.frame for frame in project.label_frames])
    for feature in range(metadata.numFeatures):
        labels = label_array[..., feature]
        labels_uniq = np.unique(labels[labels != 0])
        metadata.create_cell_info(feature, label_array)
        assert 0 not in metadata.cell_ids[feature]
        for label in labels_uniq:
            assert label in metadata.cell_ids[feature]
            assert str(label) == metadata.cell_info[feature][label]['label']
            label_in_frame = np.isin(label_array, label).any(axis=(1, 2)) # Height and width axes
            label_frames = metadata.cell_info[feature][label]['frames']
            no_label_frames = [i for i in range(metadata.numFrames) if i not in label_frames]
            assert label_in_frame[label_frames].all()
            assert not label_in_frame[no_label_frames].any()
