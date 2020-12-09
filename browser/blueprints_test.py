"""Test for Caliban Blueprints"""

import io

import pytest
import numpy as np

# from flask_sqlalchemy import SQLAlchemy

import models


class Bunch(object):
    def __init__(self, **kwds):
        self.__dict__.update(kwds)


class DummyFile():

    def __init__(self, filename, *_, **__):
        self.filename = filename

    def __getattr__(self, *_, **__):
        return self

    def __call__(self, *_, **__):
        return self


class DummyState(io.BytesIO):

    def __init__(self, *_, **__):
        super().__init__()

    def __getattr__(self, *_, **__):
        return self

    def __call__(self, *_, **__):
        return self

    def get_frame(self, frame, raw=False):
        return io.BytesIO()


def test_health(client, mocker):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json.get('message') == 'success'


def test_create(client):
    pass


def test_upload_file(mocker, client):
    # Mock out load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)
    # Mock out upload to S3 bucket
    mocker.patch('blueprints.TrackEdit.action_save_track', lambda *a: None)
    mocker.patch('blueprints.ZStackEdit.action_save_zstack', lambda *a: None)

    response = client.get('/upload_file/1')
    assert response.status_code == 404

    filename_npz = 'filename.npz'
    filename_trk = 'filename.trk'
    input_bucket = 'input_bucket'
    output_bucket = 'output_bucket'

    # Create a project.
    project = models.Project.create(
        bucket=input_bucket,
        path=filename_npz)

    response = client.get(f'/upload_file/{output_bucket}/{project.id}')
    assert response.status_code == 302

    project = models.Project.create(
        bucket=input_bucket,
        path=filename_trk)

    response = client.get(f'/upload_file/{output_bucket}/{project.id}')
    assert response.status_code == 302


def test_change_display(mocker, client):
    # Mock out load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    response = client.post('/changedisplay/0/frame/999999')
    assert response.status_code == 404

    for filename in ('filename.npz', 'filename.trk'):

        # Create a project.
        project = models.Project.create(
            bucket='input_bucket',
            path=filename)

        response = client.post('/changedisplay/{}/frame/0'.format(project.id))
        # TODO: test correctness
        assert 'raw' in response.json['imgs']
        assert 'segmented' in response.json['imgs']
        assert 'seg_arr' in response.json['imgs']

        response = client.post('/changedisplay/{}/channel/0'.format(project.id))
        assert 'raw' in response.json['imgs']
        assert 'segmented' not in response.json['imgs']
        assert 'seg_arr' not in response.json['imgs']

        response = client.post('/changedisplay/{}/feature/0'.format(project.id))
        assert 'raw' not in response.json['imgs']
        assert 'segmented' in response.json['imgs']
        assert 'seg_arr' in response.json['imgs']

    # TODO: test handle error


def test_action(client):
    pass


def test_load(client, mocker):
    # TODO: parsing the filename is a bit awkward.
    in_bucket = 'inputBucket'
    path = 'subfolder1__subfolder2__testfile'

    # Mock load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    # TODO: correctness tests
    response = client.post(f'/load/{in_bucket}/{path}.npz')
    assert response.status_code == 200

    # rgb mode only for npzs.
    response = client.post(f'/load/{in_bucket}/{path}.npz?rgb=true')
    assert response.status_code == 200

    response = client.post(f'/load/{in_bucket}/{path}.trk')
    assert response.status_code == 200

    response = client.post(f'/load/{in_bucket}/{path}.badext')
    assert response.status_code == 400


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
    # Mock out load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    # Project not found
    response = client.post('/undo/0')
    assert response.status_code == 404

    # Create a project
    project = models.Project.create(
        path='filename.npz',
        bucket='input_bucket')

    # Undo with no action to undo silently does nothing
    response = client.post('/undo/{}'.format(project.id))
    assert response.status_code == 200


def test_redo(client, mocker):
    # Mock out load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    # Project not found
    response = client.post('/undo/0')
    assert response.status_code == 404

    # Create a project
    project = models.Project.create(
        path='filename.npz',
        bucket='input_bucket')

    # Redo with no action to redo silently does nothing
    response = client.post('/redo/{}'.format(project.id))
    assert response.status_code == 200
