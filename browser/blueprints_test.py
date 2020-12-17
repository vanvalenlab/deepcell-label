"""Test for DeepCell Label Blueprints"""

import io

import pytest
import numpy as np

# from flask_sqlalchemy import SQLAlchemy

import models
from conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(db_session):
    db_session.autoflush = False
    pass


class Bunch(object):
    def __init__(self, **kwds):
        self.__dict__.update(kwds)


def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json.get('message') == 'success'


def test_change_display(client):

    response = client.post('/changedisplay/0/frame/999999')
    assert response.status_code == 404

    for filename in ('test.npz', 'test.trk'):

        # Create a project.
        project = models.Project.create(DummyLoader(path=filename))

        response = client.post('/changedisplay/{}/frame/0'.format(project.token))
        # TODO: test correctness
        assert 'raw' in response.json['imgs']
        assert 'segmented' in response.json['imgs']
        assert 'seg_arr' in response.json['imgs']

        response = client.post('/changedisplay/{}/channel/0'.format(project.token))
        assert 'raw' in response.json['imgs']
        assert 'segmented' not in response.json['imgs']
        assert 'seg_arr' not in response.json['imgs']

        response = client.post('/changedisplay/{}/feature/0'.format(project.token))
        assert 'raw' not in response.json['imgs']
        assert 'segmented' in response.json['imgs']
        assert 'seg_arr' in response.json['imgs']

    # TODO: test handle error


def test_edit(client):
    pass


def test_tool(client):
    # test no form redirect
    response = client.get('/tool')
    assert response.status_code == 302

    filename = 'test-file.npz'
    response = client.post('/tool',
                           content_type='multipart/form-data',
                           data={'filename': filename})
    assert response.status_code == 200
    assert b'<body>' in response.data

    filename = 'test-file.trk'
    response = client.post('/tool',
                           content_type='multipart/form-data',
                           data={'filename': filename})
    assert response.status_code == 200
    assert b'<body>' in response.data

    filename = 'test-file.badext'
    response = client.post('/tool',
                           content_type='multipart/form-data',
                           data={'filename': filename})
    assert response.status_code == 200


def test_shortcut(client):
    options = 'rgb=true&pixel_only=true&label_only=true'
    response = client.get('/test-file.npz')
    assert response.status_code == 200
    assert b'<body>' in response.data

    response = client.get('/test-file.npz?{}'.format(options))
    assert response.status_code == 200
    assert b'<body>' in response.data

    response = client.get('/test-file.trk')
    assert response.status_code == 200
    assert b'<body>' in response.data

    response = client.get('/test-file.trk?{}'.format(options))
    assert response.status_code == 200
    assert b'<body>' in response.data

    response = client.get('/test-file.badext')
    assert response.status_code == 200


def test_undo(client):
    # Project not found
    response = client.post('/undo/0')
    assert response.status_code == 404

    # Create a project
    project = models.Project.create(DummyLoader())

    # Undo with no action to undo silently does nothing
    response = client.post('/undo/{}'.format(project.token))
    assert response.status_code == 200


def test_redo(client):
    # Project not found
    response = client.post('/undo/0')
    assert response.status_code == 404

    # Create a project
    project = models.Project.create(DummyLoader())

    # Redo with no action to redo silently does nothing
    response = client.post('/redo/{}'.format(project.token))
    assert response.status_code == 200


def test_create_project(client, mocker):
    mocker.patch('blueprints.loaders.get_loader', lambda *args: DummyLoader())
    response = client.post(f'/api/project')
    assert response.status_code == 200


def test_create_project_npz(client, mocker):
    mocker.patch('blueprints.Project.create')
    response = client.post(f'/api/project?path=test.npz&source=s3')
    assert response.status_code == 200


def test_create_project_trk(client, mocker):
    mocker.patch('blueprints.Project.create')
    response = client.post(f'/api/project?path=test.trk&source=s3')
    assert response.status_code == 200


def test_create_project_png(client, mocker):
    mocker.patch('blueprints.Project.create')
    response = client.post(f'/api/project?path=test.png&source=s3')
    assert response.status_code == 200


def test_create_project_tiff(client, mocker):
    mocker.patch('blueprints.Project.create')
    response = client.post(f'/api/project?path=test.tiff&source=s3')
    assert response.status_code == 200


def test_create_project_bad_extension(client, mocker):
    response = client.post(f'/api/project?path=test.badext&source=s3')
    assert response.status_code == 415


def test_get_project(client):
    project = models.Project.create(DummyLoader())
    response = client.get(f'/api/project/{project.token}')
    assert response.status_code == 200


def test_project(client):
    project = models.Project.create(DummyLoader())
    response = client.get(f'/project/{project.token}')
    assert response.status_code == 200


def test_project_missing(client):
    response = client.get('/project/abc')
    assert response.status_code == 404


def test_project_finished(client):
    project = models.Project.create(DummyLoader())
    project.finish()
    response = client.get(f'/project/{project.token}')
    assert response.status_code == 410


def test_download_project(client, mocker):
    project = models.Project.create(DummyLoader())
    mocked_export = mocker.patch('blueprints.exporters.Exporter.export',
                                 return_value=io.BytesIO())
    response = client.get(f'/downloadproject/{project.token}')
    assert response.status_code == 200
    mocked_export.assert_called()


def test_upload_to_s3_npz(client, mocker):
    project = models.Project.create(DummyLoader(path='test.npz'))
    mocked_export = mocker.patch('blueprints.exporters.S3Exporter.export')
    response = client.get(f'/upload/caliban-output/{project.token}')
    assert response.status_code == 302
    mocked_export.assert_called()


def test_upload_to_s3_trk(client, mocker):
    project = models.Project.create(DummyLoader(path='test.trk'))
    mocked_export = mocker.patch('blueprints.exporters.S3Exporter.export')
    response = client.get(f'/upload/caliban-output/{project.token}')
    assert response.status_code == 302
    mocked_export.assert_called()


def test_upload_to_s3_missing(client, mocker):
    mocker.patch('blueprints.exporters.S3Exporter.export')
    response = client.get('/upload/caliban-output/1')
    assert response.status_code == 404
