"""Flask blueprint for modular routes."""
from __future__ import absolute_import, division, print_function

import gzip
import io
import json
import tempfile
import timeit
import traceback

import boto3
import numpy as np
import requests
from flask import (
    Blueprint,
    abort,
    current_app,
    jsonify,
    make_response,
    request,
    send_file,
)
from werkzeug.exceptions import HTTPException

from deepcell_label.label import Edit
from deepcell_label.loaders import Loader
from deepcell_label.models import Project

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
    project = Project.get(project)
    if not project:
        return abort(404, description=f'project {project} not found')
    s3 = boto3.client('s3')
    data = io.BytesIO()
    s3.download_fileobj(project.bucket, project.key, data)
    data.seek(0)
    return send_file(data, mimetype='application/zip')


@bp.route('/api/project', methods=['POST'])
def create_project():
    """
    Create a new Project from URL.
    """
    start = timeit.default_timer()
    images_url = request.form['images'] if 'images' in request.form else None
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
        if images_url is not None:
            image_response = requests.get(images_url)
            if image_response.status_code != 200:
                return (
                    image_response.text,
                    image_response.status_code,
                    image_response.headers.items(),
                )
            image_file.write(image_response.content)
            image_file.seek(0)
        if labels_url is not None:
            labels_response = requests.get(labels_url)
            if labels_response.status_code != 200:
                return (
                    labels_response.text,
                    labels_response.status_code,
                    labels_response.headers.items(),
                )
            label_file.write(labels_response.content)
            label_file.seek(0)
        else:
            label_file = image_file
        loader = Loader(image_file, label_file)
        project = Project.create(loader)
    current_app.logger.info(
        'Created project %s from %s in %s s.',
        project.project,
        f'{images_url}' if labels_url is None else f'{images_url} and {labels_url}',
        timeit.default_timer() - start,
    )
    return jsonify(project.project)


@bp.route('/api/project/dropped', methods=['POST'])
def create_project_from_dropped_file():
    """
    Create a new Project from drag & dropped file.
    """
    start = timeit.default_timer()
    input_file = request.files.get('file')
    # axes = request.form['axes'] if 'axes' in request.form else DCL_AXES
    loader = Loader(input_file)
    project = Project.create(loader)
    current_app.logger.info(
        'Created project %s from %s in %s s.',
        project.project,
        input_file.filename,
        timeit.default_timer() - start,
    )
    return jsonify(project.project)


@bp.route('/api/edit/<action>', methods=['POST'])
def edit(action):
    """Edits a label image and returns the updated label image and segments in the label image."""
    start = timeit.default_timer()
    # Get arguments for action
    args = {k: json.loads(v) for k, v in request.values.to_dict().items()}
    # Separate height and width from args
    height = args['height']
    width = args['width']
    del args['height']
    del args['width']

    # Parse label and raw arrays
    if 'labels' not in request.files:
        return abort(400, description='Attach the labels.')
    else:
        labels = request.files['labels']
        labels_array = np.fromfile(labels, 'int32')
        labels_array = labels_array.reshape((height, width))
    if 'raw' in request.files:
        raw = request.files['raw']
        raw_array = np.fromfile(raw, 'uint8')
        raw_array = raw_array.reshape((height, width))
    elif action in ['watershed', 'threshold', 'autofit']:
        return abort(400, description=f'Attach a raw image to use the {action} action.')
    else:
        raw_array = None

    edit = Edit(labels_array, raw_array)
    edit.dispatch_action(action, args)

    content = gzip.compress(json.dumps(edit.labels.tolist()).encode('utf8'), 5)
    response = make_response(content)
    response.headers['Content-length'] = len(content)
    response.headers['Content-Encoding'] = 'gzip'

    current_app.logger.debug(
        'Finished action %s in %s s.',
        action,
        timeit.default_timer() - start,
    )
    return response


@bp.route('/api/download', methods=['GET'])
def download_project():
    """
    Download a DeepCell Label project as a .npz file
    """
    id = request.args.get('id')
    project = Project.get(id)
    if not project:
        return abort(404, description=f'project {id} not found')
    s3 = boto3.client('s3')
    data = io.BytesIO()
    s3.download_fileobj(project.bucket, project.key, data)
    data.seek(0)
    return send_file(data, as_attachment=True, attachment_filename=project.key)
