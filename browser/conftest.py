"""Tests for the DeepCell Label Flask App."""

import os

from flask_sqlalchemy import SQLAlchemy
import numpy as np
import pytest
from pytest_lazyfixture import lazy_fixture

from application import create_app  # pylint: disable=C0413
from models import Project, Action
from loaders import Loader
from helpers import is_track_file


# flask-sqlalchemy fixtures from http://alexmic.net/flask-sqlalchemy-pytest/


TESTDB_PATH = '/tmp/test_project.db'
TEST_DATABASE_URI = 'sqlite:///{}'.format(TESTDB_PATH)


# TODO: Could this become a fixture?
class DummyLoader(Loader):
    def __init__(self, raw=None, labels=None, path='test.npz', source='s3'):
        super().__init__()
        if raw is None:
            raw = np.zeros((1, 1, 1, 1))
        if labels is not None:
            if raw.shape != labels.shape:
                raw = np.zeros(labels.shape)
            self._label_array = labels
        self._raw_array = raw

        self._path = path
        self.source = source

        if is_track_file(self._path) and labels is not None:
            self._label_array = labels[..., [0]]  # .trk files have only one feature
            self._raw_array = np.zeros(self._label_array.shape)

            self._cell_info = {0:
                               {label: {'frame_div': None,
                                        'daughters': [],
                                        # NOTE: assumes all labels are in all frames
                                        'frames': list(range(self._label_array.shape[0])),
                                        'label': label,
                                        'capped': False,
                                        'parent': None}
                                for label in np.unique(self._label_array) if label != 0}}


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
