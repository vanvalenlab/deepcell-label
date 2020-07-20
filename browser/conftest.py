"""Tests for the Caliban Flask App."""

import os

from flask_sqlalchemy import SQLAlchemy

import pytest

from application import create_app  # pylint: disable=C0413

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
