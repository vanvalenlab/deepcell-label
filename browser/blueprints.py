"""Flask blueprint for modular routes."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import distutils
import distutils.util
import json
import os
import re
import timeit
import traceback

from flask import abort
from flask import Blueprint
from flask import jsonify
from flask import render_template
from flask import request
from flask import redirect
from flask import current_app
from flask import send_file
from werkzeug.exceptions import HTTPException

from helpers import is_track_file, is_zstack_file
from label import TrackEdit, ZStackEdit, BaseEdit, ChangeDisplay
from models import Project
import loaders
import exporters
from config import S3_INPUT_BUCKET, S3_OUTPUT_BUCKET

bp = Blueprint('label', __name__)  # pylint: disable=C0103


@bp.route('/health')
def health():
    """Returns success if the application is ready."""
    return jsonify({'message': 'success'}), 200


@bp.errorhandler(404)
def handle_404(error):
    return render_template('404.html'), 404


@bp.errorhandler(loaders.InvalidExtension)
def handle_invalid_extension(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


@bp.errorhandler(Exception)
def handle_exception(error):
    """Handle all uncaught exceptions"""
    # pass through HTTP errors
    if isinstance(error, HTTPException):
        return error

    current_app.logger.error('Encountered %s: %s',
                             error.__class__.__name__, error, exc_info=1)

    # now you're handling non-HTTP exceptions only
    return jsonify({'message': str(error)}), 500


@bp.route('/edit/<token>/<action_type>', methods=['POST'])
def edit(token, action_type):
    """
    Edit the labeling of the project and
    update the project in the database.
    """
    start = timeit.default_timer()
    # obtain 'info' parameter data sent by .js script
    info = {k: json.loads(v) for k, v in request.values.to_dict().items()}

    # TODO: remove frame from request values in front-end
    # Frame is instead tracked by the frame column in the State column
    if 'frame' in info:
        del info['frame']

    try:
        project = Project.get(token)
        if not project:
            return abort(404, description=f'project {token} not found')
        edit = get_edit(project)
        payload = edit.dispatch_action(action_type, info)
        project.create_memento(action_type)
        project.update()

    except Exception as e:  # TODO: more error handling to identify problem
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    current_app.logger.debug('Finished action %s for project %s in %s s.',
                             action_type, token,
                             timeit.default_timer() - start)

    return jsonify(payload)


@bp.route('/changedisplay/<token>/<display_attribute>/<int:value>', methods=['POST'])
def change_display(token, display_attribute, value):
    """
    Change the displayed frame, feature, or channel
    and send back the changed image data.

    Args:
        token (str): base64 ID of project
        display_attribute (str): choice between 'frame', 'feature', or 'channel'
        value (int): index of frame, feature, or channel to display

    Returns:
        dict: contains the raw and/or labeled image data
    """
    start = timeit.default_timer()

    try:
        project = Project.get(token)
        if not project:
            return abort(404, description=f'project {token} not found')
        change = ChangeDisplay(project)
        payload = change.change(display_attribute, value)
        project.update()

    except Exception as e:  # TODO: more error handling to identify problem
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    current_app.logger.debug('Changed to %s %s for project %s in %s s.',
                             display_attribute, value, token,
                             timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/undo/<token>', methods=['POST'])
def undo(token):
    start = timeit.default_timer()
    try:
        project = Project.get(token)
        if not project:
            return abort(404, description=f'project {token} not found')
        payload = project.undo()
    except Exception as e:  # TODO: more error handling to identify problem
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    current_app.logger.debug('Undid action for project %s finished in %s s.',
                             token, timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/redo/<token>', methods=['POST'])
def redo(token):
    start = timeit.default_timer()
    try:
        project = Project.get(token)
        if not project:
            return abort(404, description=f'project {token} not found')
        payload = project.redo()
    except Exception as e:  # TODO: more error handling to identify problem
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    current_app.logger.debug('Redid action for project %s finished in %s s.',
                             token, timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/', methods=['GET', 'POST'])
def form():
    """Request HTML landing page to be rendered."""
    return render_template('index.html')


@bp.route('/tool', methods=['GET', 'POST'])
def tool():
    """
    Request HTML DeepCell Label tool page to be rendered after user inputs
    filename in the landing page.
    """
    if 'filename' not in request.form:
        return redirect('/')

    filename = request.form['filename']
    current_app.logger.info('%s is filename', filename)
    path = 'test__{}'.format(filename)

    return render_template(
        'loading.html',
        input_bucket='caliban-input',
        output_bucket='caliban-output',
        path=path)


@bp.route('/<filename>', methods=['GET', 'POST'])
def shortcut(filename):
    """
    Request HTML DeepCell Label tool page to be rendered if user makes a URL
    request to access a specific data file that has been preloaded to the
    input S3 bucket (ex. http://127.0.0.1:5000/test.npz).
    """

    folders = re.split('__', filename)
    # TODO: better parsing when buckets are not present
    input_bucket = folders[0] if len(folders) > 1 else S3_INPUT_BUCKET
    output_bucket = folders[1] if len(folders) > 2 else S3_OUTPUT_BUCKET
    start_of_path = min(len(folders) - 1, 2)
    path = '__'.join(folders[start_of_path:])

    # TODO: uncomment to use URL parameters instead of rigid bucket formatting within filename
    # input_bucket = request.args.get('input_bucket', default=S3_INPUT_BUCKET, type=str)
    # output_bucket = request.args.get('output_bucket', default=S3_OUTPUT_BUCKET, type=str)

    return render_template(
        'loading.html',
        input_bucket=input_bucket,
        output_bucket=output_bucket,
        path=path)


@bp.route('/getproject/<token>')
def get_project(token):
    """
    Retrieve data from a project already in the Project table.
    """
    start = timeit.default_timer()
    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    # arg is 'false' which gets parsed to True if casting to bool
    rgb = request.args.get('rgb', default='false', type=str)
    rgb = bool(distutils.util.strtobool(rgb))
    project.rgb = rgb
    project.update()
    payload = project.make_first_payload()
    current_app.logger.debug('Loaded project %s in %s s.',
                             project.token, timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/createproject', methods=['POST'])
def create_project():
    """
    Create a new Project.
    """
    start = timeit.default_timer()
    loader = loaders.get_loader(request)
    current_app.logger.info('Creating project from %s', loader.path)
    project = Project.create(loader)
    return {'projectId': project.token}


@bp.route('/project/<token>')
def project(token):
    """
    Display a project in the Project database.
    """
    rgb = request.args.get('rgb', default='false', type=str)
    pixel_only = request.args.get('pixel_only', default='false', type=str)
    label_only = request.args.get('label_only', default='false', type=str)

    settings = {
        'rgb': bool(distutils.util.strtobool(rgb)),
        'pixel_only': bool(distutils.util.strtobool(pixel_only)),
        'label_only': bool(distutils.util.strtobool(label_only))
    }

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    if project.finished is not None:
        return abort(410, description=f'project {token} already submitted')

    settings = make_settings(project.path)
    settings['token'] = project.token
    settings['source'] = str(project.source)

    return render_template(
        'tool.html',
        settings=settings)


@bp.route('/downloadproject/<token>', methods=['GET'])
def download_project(token):
    """
    Download a .trk/.npz file from a DeepCell Label project.
    """
    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')

    exporter = exporters.Exporter(project)
    filestream = exporter.export()

    return send_file(filestream, as_attachment=True, attachment_filename=exporter.path)


@bp.route('/upload/<bucket>/<token>', methods=['GET', 'POST'])
def upload_project_to_s3(bucket, token):
    """Upload .trk/.npz data file to AWS S3 bucket."""
    start = timeit.default_timer()
    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')

    # Save data file and send to S3 bucket
    exporter = exporters.S3Exporter(project)
    exporter.export(bucket)
    # add "finished" timestamp and null out PickleType columns
    project.finish()

    current_app.logger.debug('Uploaded %s to S3 bucket %s from project %s in %s s.',
                             project.path, bucket, token,
                             timeit.default_timer() - start)
    return redirect('/')


def get_edit(project):
    """Factory for Edit objects"""
    if is_zstack_file(project.path):
        return ZStackEdit(project)
    elif is_track_file(project.path):
        return TrackEdit(project)
    return BaseEdit(project)


def make_settings(filename):
    """Returns a dictionary of settings to send to the front-end."""
    if is_track_file(filename):
        filetype = 'track'
        title = 'Tracking Tool'
    else:
        filetype = 'zstack'
        title = 'Z-Stack Tool'

    rgb = request.args.get('rgb', default='false', type=str)
    pixel_only = request.args.get('pixel_only', default='false', type=str)
    label_only = request.args.get('label_only', default='false', type=str)
    rgb = bool(distutils.util.strtobool(rgb))
    pixel_only = bool(distutils.util.strtobool(pixel_only))
    label_only = bool(distutils.util.strtobool(label_only))
    output_bucket = request.args.get('output_bucket', default=S3_OUTPUT_BUCKET, type=str)

    settings = {
        'filetype': filetype,
        'title': title,
        'rgb': rgb,
        'pixel_only': pixel_only,
        'label_only': label_only,
        'output_bucket': output_bucket,
    }

    return settings
