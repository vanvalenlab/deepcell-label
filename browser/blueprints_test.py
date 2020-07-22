"""Test for Caliban Blueprints"""

import io

import pytest

# from flask_sqlalchemy import SQLAlchemy

import models


class Bunch(object):
    def __init__(self, **kwds):
        self.__dict__.update(kwds)


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


def test_upload_file(client):
    response = client.get('/upload_file/1')
    assert response.status_code == 404

    filename_npz = 'filename.npz'
    filename_trk = 'filename.trk'
    state = DummyState()
    subfolders = 'subfolders'

    # Create a project.
    project = models.Project.create_project(
        filename=filename_npz,
        state=state,
        subfolders=subfolders)

    response = client.get('/upload_file/{}'.format(project.id))
    assert response.status_code == 302

    project = models.Project.create_project(
        filename=filename_trk,
        state=state,
        subfolders=subfolders)

    response = client.get('/upload_file/{}'.format(project.id))
    assert response.status_code == 302


def test_get_frame(client):
    response = client.get('/frame/0/999999')
    assert response.status_code == 404

    for filename in ('filename.npz', 'filename.trk'):

        # Create a project.
        project = models.Project.create_project(
            filename=filename,
            state=DummyState(),
            subfolders='subfolders')

        response = client.get('/frame/0/{}'.format(project.id))

        # TODO: test correctness
        assert 'raw' in response.json
        assert 'segmented' in response.json
        assert 'seg_arr' in response.json

    # test handle error
    project = models.Project.create_project(
        filename=filename,
        state='invalid state data',
        subfolders='subfolders')

    response = client.get('/frame/0/{}'.format(project.id))
    assert response.status_code == 500


def test_action(client):
    pass


def test_load(client, mocker):
    # TODO: parsing the filename is a bit awkward.
    in_bucket = 'inputBucket'
    out_bucket = 'inputBucket'
    base_filename = 'testfile'
    basefile = '{}__{}__{}__{}__{}'.format(
        in_bucket, out_bucket, 'subfolder1', 'subfolder2', base_filename
    )

    mocker.patch('blueprints.TrackReview', DummyState)
    mocker.patch('blueprints.ZStackReview', DummyState)

    # TODO: correctness tests
    response = client.post('/load/{}.npz'.format(basefile))
    assert response.status_code == 200

    # rgb mode only for npzs.
    response = client.post('/load/{}.npz?rgb=true'.format(basefile))
    assert response.status_code == 200

    response = client.post('/load/{}.trk'.format(basefile))
    assert response.status_code == 200

    response = client.post('/load/{}.badext'.format(basefile))
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
