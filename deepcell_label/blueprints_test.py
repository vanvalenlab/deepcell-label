"""Test for DeepCell Label Blueprints"""

import io

import numpy as np
import pytest
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


def test_create_project(client, mocker):
    mocker.patch('deepcell_label.blueprints.Loader', lambda *args: DummyLoader())
    response = client.post('/api/project')
    assert response.status_code == 200


def test_create_project_dropped_npz(client):
    npz = io.BytesIO()
    np.savez(npz, X=np.zeros((1, 1, 1, 1)), y=np.ones((1, 1, 1, 1)))
    npz.seek(0)
    data = {'file': (npz, 'test.npz')}
    response = client.post(
        '/api/project/dropped', data=data, content_type='multipart/form-data'
    )
    assert response.status_code == 200


def test_create_project_dropped_tiff(client):
    tifffile = io.BytesIO()
    with TiffWriter(tifffile) as writer:
        writer.save(np.zeros((1, 1, 1, 1)))
        tifffile.seek(0)
    data = {'file': (tifffile, 'test.tiff')}
    response = client.post(
        '/api/project/dropped', data=data, content_type='multipart/form-data'
    )
    assert response.status_code == 200


def test_create_project_dropped_png(client):
    png = io.BytesIO()
    img = Image.fromarray(np.zeros((1, 1)), mode='L')
    img.save(png, format='png')
    png.seek(0)
    data = {'file': (png, 'test.png')}
    response = client.post(
        '/api/project/dropped', data=data, content_type='multipart/form-data'
    )
    assert response.status_code == 200


def test_get_project(client):
    project = models.Project.create(DummyLoader())
    response = client.get(f'/api/project/{project.project}')
    assert response.status_code == 200
