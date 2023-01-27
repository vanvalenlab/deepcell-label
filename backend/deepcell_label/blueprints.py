"""Flask blueprint for modular routes."""
from __future__ import absolute_import, division, print_function

import io
import os
import tempfile
import timeit
import traceback

import boto3
import requests
from flask import Blueprint, abort, current_app, jsonify, request, send_file
from werkzeug.exceptions import HTTPException

from deepcell_label.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DELETE_TEMP
from deepcell_label.export import Export
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
    start = timeit.default_timer()
    project = Project.get(project)
    if not project:
        return abort(404, description=f'project {project} not found')
    bucket = request.args.get('bucket', default=project.bucket)
    s3 = boto3.client('s3')
    data = io.BytesIO()
    s3.download_fileobj(bucket, project.key, data)
    data.seek(0)
    current_app.logger.info(
        f'Loaded project {project.key} from {bucket} in {timeit.default_timer() - start} s.',
    )
    return send_file(data, mimetype='application/zip')


@bp.route('/api/project', methods=['POST'])
def create_project():
    """
    Create a new Project from URL.
    """
    start = timeit.default_timer()
    if 'images' in request.form:
        images_url = request.form['images']
    else:
        return abort(
            400,
            description='Include "images" in the request form with a URL to download the project data.',
        )
    labels_url = request.form['labels'] if 'labels' in request.form else None
    axes = request.form['axes'] if 'axes' in request.form else None
    with tempfile.NamedTemporaryFile(
        delete=DELETE_TEMP
    ) as image_file, tempfile.NamedTemporaryFile(delete=DELETE_TEMP) as label_file:
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
        loader = Loader(image_file, label_file, axes)
        project = Project.create(loader)
    if not DELETE_TEMP:
        image_file.close()
        label_file.close()
        os.remove(image_file.name)  # Manually close and delete if using Windows
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
    input_file = request.files.get('images')
    axes = request.form['axes'] if 'axes' in request.form else None
    # axes = request.form['axes'] if 'axes' in request.form else DCL_AXES
    with tempfile.NamedTemporaryFile(delete=DELETE_TEMP) as f:
        f.write(input_file.read())
        f.seek(0)
        loader = Loader(f, axes=axes)
        project = Project.create(loader)
    if not DELETE_TEMP:
        f.close()
        os.remove(f.name)  # Manually close and delete if using Windows
    current_app.logger.info(
        'Created project %s from %s in %s s.',
        project.project,
        input_file.filename,
        timeit.default_timer() - start,
    )
    return jsonify(project.project)


@bp.route('/api/edit', methods=['POST'])
def edit():
    """Loads labeled data from a zip, edits them, and responds with a zip with the edited labels."""
    start = timeit.default_timer()
    if 'labels' not in request.files:
        return abort(400, description='Attach the labeled data to edit in labels.zip.')
    labels_zip = request.files['labels']
    edit = Edit(labels_zip)
    current_app.logger.debug(
        'Finished action %s in %s s.',
        edit.action,
        timeit.default_timer() - start,
    )
    return send_file(edit.response_zip, mimetype='application/zip')


@bp.route('/api/download', methods=['POST'])
def download_project():
    """
    Create a DeepCell Label zip file for the user to download
    The submitted zip should contain the raw and labeled array buffers
    in .dat files with the dimensions in dimensions.json,
    which are transformed into OME TIFFs in the submitted zips.
    """
    if 'labels' not in request.files:
        return abort(400, description='Attach labels.zip to download.')
    labels_zip = request.files['labels']
    id = request.form['id']
    export = Export(labels_zip)
    data = export.export_zip
    return send_file(data, as_attachment=True, attachment_filename=f'{id}.zip')


@bp.route('/api/upload', methods=['POST'])
def submit_project():
    """
    Create and upload an edited DeepCell Label zip file to an S3 bucket.
    The submitted zip should contain the raw and labeled array buffers
    in .dat files with the dimensions in dimensions.json,
    which are transformed into OME TIFFs in the submitted zips.
    """
    start = timeit.default_timer()
    if 'labels' not in request.files:
        return abort(400, description='Attach labels.zip to submit.')
    labels_zip = request.files['labels']
    id = request.form['id']
    bucket = request.form['bucket']
    export = Export(labels_zip)
    data = export.export_zip

    # store npz file object in bucket/path
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )
    s3.upload_fileobj(data, bucket, f'{id}.zip')

    current_app.logger.debug(
        'Uploaded %s to S3 bucket %s in %s s.',
        f'{id}.zip',
        bucket,
        timeit.default_timer() - start,
    )
    return {}
