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
    path = 'path'

    # Create a project.
    project = models.Project.create(
        filename=filename_npz,
        input_bucket=input_bucket,
        output_bucket=output_bucket,
        path=path)

    response = client.get('/upload_file/{}'.format(project.id))
    assert response.status_code == 302

    project = models.Project.create(
        filename=filename_trk,
        input_bucket=input_bucket,
        output_bucket=output_bucket,
        path=path)

    response = client.get('/upload_file/{}'.format(project.id))
    assert response.status_code == 302


def test_get_frame(mocker, client):
    # Mock out load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    response = client.get('/frame/0/999999')
    assert response.status_code == 404

    for filename in ('filename.npz', 'filename.trk'):

        # Create a project.
        project = models.Project.create(
            filename=filename,
            input_bucket='input_bucket',
            output_bucket='output_bucket',
            path='path')

        response = client.get('/frame/0/{}'.format(project.id))

        # TODO: test correctness
        assert 'raw' in response.json
        assert 'segmented' in response.json
        assert 'seg_arr' in response.json

    # TODO: test handle error


def test_action(client):
    pass


def test_load(client, mocker):
    # TODO: parsing the filename is a bit awkward.
    in_bucket = 'inputBucket'
    out_bucket = 'inputBucket'
    filename = 'testfile'
    caliban_file = '{}__{}__{}__{}__{}'.format(
        in_bucket, out_bucket, 'subfolder1', 'subfolder2', filename
    )

    # Mock load from S3 bucket
    def load(self, *args):
        return {'raw': np.zeros((1, 1, 1, 1)),
                'annotated': np.zeros((1, 1, 1, 1)),
                'tracked': np.zeros((1, 1, 1, 1)),
                'lineages': {0: {}}}
    mocker.patch('blueprints.Project.load', load)

    # TODO: correctness tests
    response = client.post('/load/{}.npz'.format(caliban_file))
    assert response.status_code == 200

    # rgb mode only for npzs.
    response = client.post('/load/{}.npz?rgb=true'.format(caliban_file))
    assert response.status_code == 200

    response = client.post('/load/{}.trk'.format(caliban_file))
    assert response.status_code == 200

    response = client.post('/load/{}.badext'.format(caliban_file))
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
