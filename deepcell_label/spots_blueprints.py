"""Flask blueprint for modular routes."""
from __future__ import absolute_import, division, print_function

import io
import tempfile
import timeit
import traceback

import boto3
import requests
from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.exceptions import HTTPException

from deepcell_label.spots_loaders import Loader
from deepcell_label.spots_models import Project

bp = Blueprint('label', __name__)  # pylint: disable=C0103


@bp.route('/health')
def health():
    """Returns success if the application is ready."""
    return jsonify({'message': 'success'}), 200


@bp.errorhandler(Exception)
def handle_exception(error):
    """Handle all uncaught exceptions"""
    # pass through HTTP errors
    if isinstance(error, HTTPException):
        return error

    current_app.logger.error(
        'Encountered %s: %s', error.__class__.__name__, error, exc_info=1
    )

    traceback.print_exc()
    # now you're handling non-HTTP exceptions only
    return jsonify({'error': str(error)}), 500


@bp.route('/api/project/<project>', methods=['GET'])
def get_project(project):
    s3 = boto3.client('s3')
    data = io.BytesIO()
    bucket = 'spots-visualizer'
    object_name = f'{project}.zip'
    s3.download_fileobj(bucket, object_name, data)
    data.seek(0)

    return send_file(data, mimetype='application/zip')


@bp.route('/api/project', methods=['POST'])
def create_project():
    """
    Create a new Project from URL.
    """
    start = timeit.default_timer()
    images_url = request.form['images']
    labels_url = request.form['labels'] if 'labels' in request.form else None
    # dimension_order = (
    #     request.form['dimension_order']
    #     if 'dimension_order' in request.form
    #     else 'TZYXC'
    # )
    # labels_dimension_order = (
    #     request.form['labels_dimension_order']
    #     if 'labels_dimension_order' in request.form
    #     else None
    # )
    with tempfile.TemporaryFile() as image_file, tempfile.TemporaryFile() as label_file:
        image_file.write(requests.get(images_url).content)
        image_file.seek(0)
        if labels_url is not None:
            label_file.write(requests.get(labels_url).content)
            label_file.seek(0)
        loader = Loader(image_file, None if labels_url is None else label_file)
        project = Project(loader.data)
    current_app.logger.info(
        'Created project %s from %s in %s s.',
        project.project,
        f'{images_url}' if labels_url is None else f'{images_url} and {labels_url}',
        timeit.default_timer() - start,
    )
    return jsonify(project.project)
