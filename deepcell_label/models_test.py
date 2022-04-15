"""Test for DeepCell Label Models"""

import pytest

from deepcell_label import models
from deepcell_label.conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(db_session):
    db_session.autoflush = False
    pass


def test_project_init(mocker):
    """
    Test constructor for Project table.
    """

    project = models.Project(DummyLoader())

    # Check columns filled in by constructor
    assert project.project is not None
    assert project.bucket is not None
    assert project.key is not None


def test_get_missing_project():
    """
    Gets a project before it exists.
    """
    project = models.Project.get(1)
    assert project is None


def test_get_project():
    """
    Test getting a project from the Projects table.
    Creates a project, then gets it again.
    """
    project = models.Project.create(DummyLoader())
    found_project = models.Project.get(project.project)
    assert found_project == project


def test_create():
    """
    Test creating a row in the Project table.
    """
    project = models.Project.create(DummyLoader())
    # Check all fields are populated
    assert project.id is not None
    assert project.project is not None
    assert project.createdAt is not None
    assert project.bucket is not None
    assert project.key is not None
