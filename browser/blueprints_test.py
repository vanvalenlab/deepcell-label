"""Test for DeepCell Label Blueprints"""

import io

import pytest
import numpy as np

# from flask_sqlalchemy import SQLAlchemy

import models
from conftest import DummyLoader





class Bunch(object):
    def __init__(self, **kwds):
        self.__dict__.update(kwds)


def test_health(client, mocker):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json.get('message') == 'success'


def test_create(client):
    pass


def test_upload_file(mocker, client):
    # Mock out upload to S3 bucket
    mocker.patch('exporters.S3Exporter.export', lambda *a: None)

    response = client.get('/upload_file/1')
    assert response.status_code == 404

    # Create a project.
    project = models.Project.create(DummyLoader(path='test.npz'))

    response = client.get('/upload_file/{}'.format(project.token))
    assert response.status_code == 302

    project = models.Project.create(DummyLoader(path='test.trk'))

    response = client.get('/upload_file/{}'.format(project.token))
    assert response.status_code == 302


def test_change_display(mocker, client):

    response = client.post('/changedisplay/0/frame/999999')
    # TODO: detect abort(404) with this test; currently results in 500 error
    # assert response.status_code == 404

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
    assert response.status_code == 400
    assert 'error' in response.json


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
    assert response.status_code == 400
    assert 'error' in response.json


def test_undo(client, mocker):
    # Project not found
    response = client.post('/undo/0')
    # TODO: detect abort(404) with this test; currently results in 500 error+
    # assert response.status_code == 404

    # Create a project
    project = models.Project.create(DummyLoader())

    # Undo with no action to undo silently does nothing
    response = client.post('/undo/{}'.format(project.token))
    assert response.status_code == 200


def test_redo(client, mocker):
    # Project not found
    response = client.post('/undo/0')
    # TODO: detect abort(404) with this test; currently results in 500 error
    # assert response.status_code == 404

    # Create a project
    project = models.Project.create(DummyLoader())

    # Redo with no action to redo silently does nothing
    response = client.post('/redo/{}'.format(project.token))
    assert response.status_code == 200
