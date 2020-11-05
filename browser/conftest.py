"""Tests for the Caliban Flask App."""

import os

from flask_sqlalchemy import SQLAlchemy
import numpy as np
import pytest
from pytest_lazyfixture import lazy_fixture

from application import create_app  # pylint: disable=C0413
from models import Project

# flask-sqlalchemy fixtures from http://alexmic.net/flask-sqlalchemy-pytest/


TESTDB_PATH = '/tmp/test_project.db'
TEST_DATABASE_URI = 'sqlite:///{}'.format(TESTDB_PATH)


@pytest.fixture
def app():
    """Session-wide test `Flask` application."""

    if os.path.exists(TESTDB_PATH):
        os.unlink(TESTDB_PATH)

    yield create_app(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=TEST_DATABASE_URI,
    )

    os.unlink(TESTDB_PATH)


@pytest.fixture
def _db(app):
    """
    Provide the transactional fixtures with access to the database via a Flask-SQLAlchemy
    database connection.

    https://pypi.org/project/pytest-flask-sqlalchemy/
    """
    db = SQLAlchemy(app=app)
    return db


def repeat_feature(feature, n):
    """Repeats a feature n times along the last axis."""
    return np.repeat(
        np.expand_dims(feature, axis=-1),
        n,
        axis=-1)


def repeat_frame(frame, n):
    """Repeats a frame n times along the first axis."""
    return np.repeat(
        np.expand_dims(frame, axis=0),
        n,
        axis=0)


# File fixtures
HEIGHT = 32
WIDTH = 32
RES = (HEIGHT, WIDTH)
FRAMES = 5
CHANNELS = 3
FEATURES = 2

tri_12 = np.triu(np.ones(RES, dtype=np.int16))
tri_12[tri_12 == 0] = 2
tri_21 = np.tril(np.ones(RES, dtype=np.int16))
tri_21[tri_21 == 0] = 2
check01 = np.array([[0, 1], [1, 0]], dtype=np.int16)
check12 = np.array([[1, 2], [2, 1]], dtype=np.int16)
TEST_FRAMES = [np.zeros(RES, dtype=np.int16),  # empty
               np.ones(RES, dtype=np.int16),  # all ones
               np.identity(HEIGHT, dtype=np.int16),  # identity
               np.tril(np.ones(RES, dtype=np.int16)),  # lower triangular ones
               tri_12,
               np.tile(check01, (HEIGHT // 2, WIDTH // 2)),
               np.tile(check12, (HEIGHT // 2, WIDTH // 2)),
               np.zeros(RES, dtype=np.int16),  # RGB mode
               ]
# Convert single frames to 4 dim (frames, height, width, features)
TEST_LABELS = list(map(lambda frame: repeat_frame(repeat_feature(frame, FEATURES), FRAMES),
                       TEST_FRAMES))
# Append single frame, 3 dim test (height, width, features)
TEST_IDS = ['empty', 'full1', 'iden', 'tril', 'triu1l2',
            'checkerboard01', 'checkerboard12', 'RGB']
# Append single frame, 3 dim test (height, width, features)
TEST_LABELS += [repeat_feature(np.zeros(RES, dtype=np.int16), FEATURES)]
TEST_IDS += ['singleframe']


@pytest.fixture(params=TEST_LABELS, ids=TEST_IDS)
def zstack_project(app, mocker, request, db_session):
    with app.app_context():
        def load(self, *args):
            if len(request.param.shape) == 4:
                raw = np.zeros((FRAMES, HEIGHT, WIDTH, CHANNELS))
            else:
                raw = np.zeros((HEIGHT, WIDTH, CHANNELS))
            data = {'raw': raw}
            data['annotated'] = request.param.copy()
            return data
        mocker.patch('models.Project.load', load)
        project = Project('filename.npz', 'input_bucket', 'output_bucket', 'path',
                          rgb='RGB' in request.node.name)
        db_session.add(project)
        db_session.commit()
        return project


@pytest.fixture(params=TEST_LABELS, ids=TEST_IDS)
def track_project(app, mocker, request, db_session):
    with app.app_context():
        def load(self, *args):
            # Match the size of the raw image with the labels
            if len(request.param.shape) == 4:
                raw = np.zeros((FRAMES, HEIGHT, WIDTH, CHANNELS))
            else:
                raw = np.zeros((HEIGHT, WIDTH, CHANNELS))
            data = {'raw': raw}
            # Tracked files should only have one feature
            data['tracked'] = request.param[..., [0]].copy()
            lineages = [{label: {'frame_div': None,
                                 'daughters': [],
                                 'frames': list(range(FRAMES)),  # All labels are in all frames
                                 'label': label,
                                 'capped': False,
                                 'parent': None}
                        for label in np.unique(request.param) if label != 0}]
            data['lineages'] = lineages
            return data
        mocker.patch('models.Project.load', load)
        project = Project('filename.trk', 'input_bucket', 'output_bucket', 'path')
        db_session.add(project)
        db_session.commit()
        return project


@pytest.fixture(params=[
    lazy_fixture('zstack_project'),
    lazy_fixture('track_project'),
])
def project(request):
    return request.param
