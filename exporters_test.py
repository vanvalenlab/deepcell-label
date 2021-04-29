"""Tests for exporters.py"""

import pytest
import io

import models
import exporters
from conftest import DummyLoader


@pytest.fixture
def npz_exporter(app, db_session):
    with app.app_context():
        db_session.autoflush = False
        project = models.Project.create(DummyLoader(url='test.npz'))
        exporter = exporters.Exporter(project)
        return exporter


@pytest.fixture
def trk_exporter(app, db_session):
    with app.app_context():
        db_session.autoflush = False
        project = models.Project.create(DummyLoader(url='test.trk'))
        exporter = exporters.Exporter(project)
        return exporter


class TestExporter():

    def test_export_npz(self, npz_exporter):
        file_ = npz_exporter.export()
        assert isinstance(file_, io.BytesIO)

    def test_export_trk(self, trk_exporter):
        file_ = trk_exporter.export()
        assert isinstance(file_, io.BytesIO)


class TestS3Exporter():

    def test_export(self, mocker, app, db_session):
        with app.app_context():
            mocked = mocker.patch('boto3.s3.inject.upload_fileobj')
            db_session.autoflush = False
            project = models.Project.create(DummyLoader())
            exporter = exporters.S3Exporter(project)
            exporter.export('test')
            mocked.assert_called()
