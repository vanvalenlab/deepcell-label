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

from label import TrackEdit, ZStackEdit, BaseEdit
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

    traceback.print_exc()
    # now you're handling non-HTTP exceptions only
    return jsonify({'error': str(error)}), 500


@bp.route('/api/raw/<token>/<int:channel>/<int:frame>')
def raw(token, channel, frame):
    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    png = project.get_raw_png(channel, frame)
    return send_file(png, mimetype='image/png')


@bp.route('/api/labeled/<token>/<int:feature>/<int:frame>')
def labeled(token, feature, frame):
    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    png = project.get_labeled_png(feature, frame)
    return send_file(png, mimetype='image/png', cache_timeout=0)


@bp.route('/api/array/<token>/<int:feature>/<int:frame>')
def array(token, feature, frame):
    """
    """
    project = Project.get(token)
    if not project:
        return jsonify({'error': f'project {token} not found'}), 404
    seg_array = project.get_labeled_array(feature, frame)
    filename = f'{token}_array_feature{feature}_frame{frame}.npy'
    return send_file(seg_array, attachment_filename=filename, cache_timeout=0)


@bp.route('/api/edit/<token>/<action_type>', methods=['POST'])
def edit(token, action_type):
    """
    Edit the labeling of the project and
    update the project in the database.
    """
    start = timeit.default_timer()
    # obtain 'info' parameter data sent by .js script
    info = {k: json.loads(v) for k, v in request.values.to_dict().items()}

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    # TODO: remove frame/feature/channel columns from db schema? or keep them around
    # to load projects on the last edited frame
    project.frame = info['frame']
    project.feature = info['feature']
    project.channel = info['channel']
    del info['frame']
    del info['feature']
    del info['channel']

    edit = get_edit(project)
    edit.dispatch_action(action_type, info)
    project.create_memento(action_type)
    project.update()

    changed_frames = [frame.frame_id for frame in project.action.frames]
    payload = {'feature': project.feature, 'labeled_changed': changed_frames}

    current_app.logger.debug('Finished action %s for project %s in %s s.',
                             action_type, token,
                             timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/api/rgb/<token>/<rgb_value>', methods=['POST'])
def rgb(token, rgb_value):
    """

    Returns:
        json with raw image data
    """
    start = timeit.default_timer()

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')

    rgb = bool(distutils.util.strtobool(rgb_value))
    project.rgb = rgb
    project.update()
    payload = project.make_payload(x=True)
    current_app.logger.debug('Set RGB to %s for project %s in %s s.',
                             rgb, token, timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/api/undo/<token>', methods=['POST'])
def undo(token):
    start = timeit.default_timer()

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    payload = project.undo()

    current_app.logger.debug('Undid action for project %s finished in %s s.',
                             token, timeit.default_timer() - start)
    return jsonify(payload)


@bp.route('/api/redo/<token>', methods=['POST'])
def redo(token):
    start = timeit.default_timer()

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    payload = project.redo()

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


@bp.route('/api/project/<token>', methods=['GET'])
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


@bp.route('/api/project', methods=['POST'])
def create_project():
    """
    Create a new Project.
    """
    start = timeit.default_timer()
    loader = loaders.get_loader(request)
    project = Project.create(loader)
    current_app.logger.info('Created project from %s in %s s.',
                            loader.path, timeit.default_timer() - start)
    return jsonify({'projectId': project.token})


@bp.route('/project/<token>')
def project(token):
    """
    Display a project in the Project database.
    """
    rgb = request.args.get('rgb', default='false', type=str)

    settings = {
        'rgb': bool(distutils.util.strtobool(rgb)),
    }

    project = Project.get(token)
    if not project:
        return abort(404, description=f'project {token} not found')
    if project.finished is not None:
        return abort(410, description=f'project {token} already submitted')

    settings = make_settings(project)

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


@bp.route('/api/upload/<bucket>/<token>', methods=['GET', 'POST'])
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
    if project.is_track:
        return TrackEdit(project)
    else:
        return ZStackEdit(project)


def make_settings(project):
    """Returns a dictionary of settings to send to the front-end."""
    if project.is_track:
        filetype = 'track'
        title = 'Tracking Tool'
    else:
        filetype = 'zstack'
        title = 'Z-Stack Tool'

    rgb = request.args.get('rgb', default='false', type=str)
    rgb = bool(distutils.util.strtobool(rgb))
    output_bucket = request.args.get('output_bucket', default=S3_OUTPUT_BUCKET, type=str)

    settings = {
        'filetype': filetype,
        'title': title,
        'rgb': rgb,
        'output_bucket': output_bucket,
        'token': project.token,
        'source': str(project.source)
    }

    return settings
