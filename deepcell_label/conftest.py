"""Tests for the DeepCell Label Flask App."""

import os

import pytest
from flask_sqlalchemy import SQLAlchemy

from deepcell_label import create_app  # pylint: disable=C0413
from deepcell_label.loaders import Loader

# flask-sqlalchemy fixtures from http://alexmic.net/flask-sqlalchemy-pytest/


TESTDB_PATH = '/tmp/test_project.db'
TEST_DATABASE_URI = 'sqlite:///{}'.format(TESTDB_PATH)


# TODO: Could this become a fixture?
class DummyLoader(Loader):
    def __init__(self, X=None, y=None, spots=None):
        self._X = X
        self._y = y
        self._spots = spots
        super().__init__()

    # Prevent changing mocked data
    @property
    def X(self):
        return self._X

    @X.setter
    def X(self, value):
        pass

    @property
    def y(self):
        return self._y

    @y.setter
    def y(self, value):
        pass

    @property
    def spots(self):
        return self._spots

    @spots.setter
    def spots(self, value):
        pass


@pytest.fixture(autouse=True)
def mock_aws(mocker):
    mocker.patch('deepcell_label.models.boto3.client')


@pytest.fixture(scope='session')
def app():
    """Session-wide test `Flask` application."""

    if os.path.exists(TESTDB_PATH):
        os.unlink(TESTDB_PATH)

    yield create_app(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=TEST_DATABASE_URI,
    )

    os.unlink(TESTDB_PATH)


@pytest.fixture(scope='session')
def _db(app):
    """
    Provide the transactional fixtures with access to the database via a Flask-SQLAlchemy
    database connection.

    https://pypi.org/project/pytest-flask-sqlalchemy/
    """
    db = SQLAlchemy(app=app)
    return db
