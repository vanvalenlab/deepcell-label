"""Flask blueprint for modular routes."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import json
import os
import pickle
import re
import traceback

from flask import Blueprint
from flask import jsonify
from flask import render_template
from flask import request
from flask import redirect
from flask import current_app

from helpers import is_trk_file, is_npz_file
from caliban import TrackReview, ZStackReview
from models import Project


bp = Blueprint('caliban', __name__)  # pylint: disable=C0103


@bp.route('/upload_file/<int:project_id>', methods=['GET', 'POST'])
def upload_file(project_id):
    ''' Upload .trk/.npz data file to AWS S3 bucket.
    '''
    # Use id to grab appropriate TrackReview/ZStackReview object from database
    project = Project.get_project_by_id(project_id)

    if project is None:
        return jsonify({'error': 'project_id not found'}), 404

    state = pickle.loads(project.state)

    # Call function in caliban.py to save data file and send to S3 bucket
    if is_trk_file(project.filename):
        state.action_save_track()
    elif is_npz_file(project.filename):
        state.action_save_zstack()

    # add "finished" timestamp and null out state longblob
    Project.finish_project(project)

    return redirect('/')


@bp.route('/action/<int:project_id>/<action_type>/<int:frame>', methods=['POST'])
def action(project_id, action_type, frame):
    ''' Make an edit operation to the data file and update the object
        in the database.
    '''
    # obtain 'info' parameter data sent by .js script
    info = {k: json.loads(v) for k, v in request.values.to_dict().items()}

    try:
        # Use id to grab appropriate TrackReview/ZStackReview object from database
        project = Project.get_project_by_id(project_id)

        if not project:
            return jsonify({'error': 'project_id not found'}), 404

        state = pickle.loads(project.state)
        # Perform edit operation on the data file
        state.action(action_type, info)
        frames_changed = state.frames_changed
        info_changed = state.info_changed

        state.frames_changed = state.info_changed = False

        # Update object in local database
        Project.update_project(project, state)

    except Exception as e:  # TODO: more error handling to identify problem
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    tracks = state.readable_tracks if info_changed else False

    if frames_changed:
        img = state.get_frame(frame, raw=False)
        raw = state.get_frame(frame, raw=True)
        edit_arr = state.get_array(frame)

        encode = lambda x: base64.encodebytes(x.read()).decode()

        img_payload = {
            'raw': f'data:image/png;base64,{encode(raw)}',
            'segmented': f'data:image/png;base64,{encode(img)}',
            'seg_arr': edit_arr.tolist()
        }
    else:
        img_payload = False

    return jsonify({'tracks': tracks, 'imgs': img_payload})


@bp.route('/frame/<int:frame>/<int:project_id>')
def get_frame(frame, project_id):
    ''' Serve modes of frames as pngs. Send pngs and color mappings of
        cells to .js file.
    '''
    # Use id to grab appropriate TrackReview/ZStackReview object from database
    project = Project.get_project_by_id(project_id)

    if not project:
        return jsonify({'error': 'project_id not found'}), 404

    state = pickle.loads(project.state)

    # Obtain raw, mask, and edit mode frames
    img = state.get_frame(frame, raw=False)
    raw = state.get_frame(frame, raw=True)

    # Obtain color map of the cells
    edit_arr = state.get_array(frame)

    encode = lambda x: base64.encodebytes(x.read()).decode()

    payload = {
        'raw': f'data:image/png;base64,{encode(raw)}',
        'segmented': f'data:image/png;base64,{encode(img)}',
        'seg_arr': edit_arr.tolist()
    }

    return jsonify(payload)


@bp.route('/load/<filename>', methods=['POST'])
def load(filename):
    ''' Initate TrackReview/ZStackReview object and load object to database.
        Send specific attributes of the object to the .js file.
    '''
    current_app.logger.info('Loading track at %s', filename)

    folders = re.split('__', filename)
    filename = folders[len(folders) - 1]
    subfolders = folders[2:len(folders) - 1]

    subfolders = '/'.join(subfolders)
    full_path = os.path.join(subfolders, filename)

    input_bucket = folders[0]
    output_bucket = folders[1]

    if is_trk_file(filename):
        # Initate TrackReview object and entry in database
        track_review = TrackReview(filename, input_bucket, output_bucket, full_path)
        project = Project.create_project(filename, track_review, subfolders)

        # Send attributes to .js file
        return jsonify({
            'max_frames': track_review.max_frames,
            'tracks': track_review.readable_tracks,
            'dimensions': track_review.dimensions,
            'project_id': project.id,
            'screen_scale': track_review.scale_factor
        })

    if is_npz_file(filename):
        # arg is 'false' which gets parsed to True if casting to bool
        rgb = request.args.get('rgb', type=str)
        rgb = json.loads(rgb)
        # Initate ZStackReview object and entry in database
        zstack_review = ZStackReview(filename, input_bucket, output_bucket, full_path, rgb)
        project = Project.create_project(filename, track_review, subfolders)

        # Send attributes to .js file
        return jsonify({
            'max_frames': zstack_review.max_frames,
            'channel_max': zstack_review.channel_max,
            'feature_max': zstack_review.feature_max,
            'tracks': zstack_review.readable_tracks,
            'dimensions': zstack_review.dimensions,
            'project_id': project.id,
            'screen_scale': zstack_review.scale_factor
        })

    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


@bp.route('/', methods=['GET', 'POST'])
def form():
    ''' Request HTML landing page to be rendered if user requests for
        http://127.0.0.1:5000/.
    '''
    return render_template('form.html')


@bp.route('/tool', methods=['GET', 'POST'])
def tool():
    ''' Request HTML caliban tool page to be rendered after user inputs
        filename in the landing page.
    '''
    filename = request.form['filename']
    current_app.logger.info('%s is filename', filename)

    # TODO: better name template?
    new_filename = 'caliban-input__caliban-output__test__{}'.format(
        str(filename))

    # if no options passed (how this route will be for now),
    # still want to pass in default settings
    rgb = request.args.get('rgb', default=False, type=bool)
    pixel_only = request.args.get('pixel_only', default=False, type=bool)
    label_only = request.args.get('label_only', default=False, type=bool)

    settings = {
        'rgb': rgb,
        'pixel_only': pixel_only,
        'label_only': label_only
    }

    if is_trk_file(new_filename):
        return render_template('index_track.html', filename=new_filename)

    if is_npz_file(new_filename):
        return render_template(
            'index_zstack.html', filename=new_filename, settings=settings)

    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


@bp.route('/<filename>', methods=['GET', 'POST'])
def shortcut(filename):
    ''' Request HTML caliban tool page to be rendered if user makes a URL
        request to access a specific data file that has been preloaded to the
        input S3 bucket (ex. http://127.0.0.1:5000/test.npz).
    '''
    # if no options passed, we get default settings anyway
    rgb = request.args.get('rgb', default=False, type=bool)
    pixel_only = request.args.get('pixel_only', default=False, type=bool)
    label_only = request.args.get('label_only', default=False, type=bool)

    settings = {
        'rgb': rgb,
        'pixel_only': pixel_only,
        'label_only': label_only
    }

    # TODO: could this be consolidated into one template with an "is_trk" toggle?
    # note: not adding options to trk files yet
    if is_trk_file(filename):
        return render_template('index_track.html', filename=filename)
    if is_npz_file(filename):
        return render_template(
            'index_zstack.html', filename=filename, settings=settings)

    # TODO: render an error template instead that shows which error,
    # instead of sending json
    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400
