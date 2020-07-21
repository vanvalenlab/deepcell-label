"""Test for Caliban Models"""

import pickle

import pytest

# from flask_sqlalchemy import SQLAlchemy

import models


def test_project(db_session):
    # TODO: is there a good way to separate these tests into unit tests?

    # test that no projects exist
    project = models.Project.get_project_by_id(1)
    assert project is None

    # test create project
    filename = 'filename'
    state = b'state_data'
    subfolders = 'subfolders'

    project = models.Project.create_project(
        filename=filename,
        state=state,
        subfolders=subfolders)

    valid_id = models.Project.id

    # test that the project can be found and is the same as the created one
    found_project = models.Project.get_project_by_id(valid_id)
    assert found_project == project

    # test project is updated
    new_state = b'updated state data'
    models.Project.update_project(project, new_state)

    # get the updated project and make sure the data is updated.
    found_project = models.Project.get_project_by_id(valid_id)
    pickled_state = pickle.dumps(new_state, pickle.HIGHEST_PROTOCOL)
    assert found_project.state == pickled_state

    # test project is finished
    models.Project.finish_project(project)
    found_project = models.Project.get_project_by_id(valid_id)
    assert found_project.state is None
    assert found_project.finished is not None
    assert found_project.lastUpdate is not None
