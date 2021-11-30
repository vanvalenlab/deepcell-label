"""Tests for the DeepCell Label Flask App."""

import os

from flask_sqlalchemy import SQLAlchemy
import numpy as np
import pytest

from deepcell_label import create_app  # pylint: disable=C0413
from deepcell_label.loaders import Loader


# flask-sqlalchemy fixtures from http://alexmic.net/flask-sqlalchemy-pytest/


TESTDB_PATH = '/tmp/test_project.db'
TEST_DATABASE_URI = 'sqlite:///{}'.format(TESTDB_PATH)


# TODO: Could this become a fixture?
class DummyLoader(Loader):
    def __init__(self, raw=None, labels=None, cell_info=None, path='test.npz'):
        super().__init__()

        if raw is None:
            raw = np.zeros((1, 1, 1, 1))

        if labels is None:
            labels = np.zeros(raw.shape)
        elif labels.shape != raw.shape:
            raw = np.zeros(labels.shape)

        self.path = path
        self.raw_array = raw
        self.label_array = labels
        self.add_semantic_labels()  # computes cell_ids
        if cell_info is not None:
            self.cell_info = cell_info


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
