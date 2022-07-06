"""Test for DeepCell Label Blueprints"""

import tempfile

import numpy as np
import pytest
import responses
from PIL import Image
from tifffile import TiffWriter

from deepcell_label import models
from deepcell_label.conftest import DummyLoader


# Automatically enable transactions for all tests, without importing any extra fixtures.
@pytest.fixture(autouse=True)
def enable_transactional_tests(db_session):
    db_session.autoflush = False
    pass


def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json.get('message') == 'success'


def test_edit(client):
    # TODO
    pass


def test_create_project_no_url(client, mocker):
    mocker.patch('deepcell_label.blueprints.Loader', lambda *args: DummyLoader())
    response = client.post('/api/project')
    assert response.status_code == 400


@responses.activate
def test_create_project(client, mocker):
    mocker.patch('deepcell_label.blueprints.Loader', lambda *args: DummyLoader())
    responses.add(responses.GET, 'https://test.com', body=b'', status=200)
    response = client.post('/api/project', data={'images': 'https://test.com'})
    assert response.status_code == 200


def test_create_project_dropped_npz(client):
    with tempfile.NamedTemporaryFile() as f:
        np.savez(f, X=np.zeros((1, 1, 1, 1)), y=np.ones((1, 1, 1, 1)))
        f.seek(0)
        data = {'images': (f, 'test.npz')}
        response = client.post(
            '/api/project/dropped', data=data, content_type='multipart/form-data'
        )
    assert response.status_code == 200


def test_create_project_dropped_tiff(client):
    with tempfile.NamedTemporaryFile() as f:
        with TiffWriter(f) as writer:
            writer.save(np.zeros((1, 1, 1, 1)))
            f.seek(0)
        data = {'images': (f, 'test.tiff')}
        response = client.post(
            '/api/project/dropped', data=data, content_type='multipart/form-data'
        )
    assert response.status_code == 200


def test_create_project_dropped_png(client):
    with tempfile.NamedTemporaryFile() as f:
        img = Image.fromarray(np.zeros((1, 1)), mode='L')
        img.save(f, format='png')
        f.seek(0)
        data = {'images': (f, 'test.png')}
        response = client.post(
            '/api/project/dropped', data=data, content_type='multipart/form-data'
        )
    assert response.status_code == 200


def test_get_project(client):
    project = models.Project.create(DummyLoader())
    response = client.get(f'/api/project/{project.project}')
    assert response.status_code == 200
