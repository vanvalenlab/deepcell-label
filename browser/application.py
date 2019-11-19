"""Flask application route handlers"""

import base64
import json
import os
import pickle
import re
import sqlite3
import sys
import traceback

from flask import Flask, jsonify, render_template, request, redirect, url_for
from werkzeug.utils import secure_filename

from caliban.helpers import is_trk_file, is_npz_file
from caliban import TrackReview, ZStackReview

# Create and configure the app
application = Flask(__name__)
application.config.from_object("config")


@application.route("/upload_file/<project_id>", methods=["GET", "POST"])
def upload_file(project_id):
    ''' Upload .trk/.npz data file to AWS S3 bucket.
    '''

    conn = create_connection(r"caliban.db")
    with conn:

        # Use id to grab appropriate TrackReview/ZStackReview object from database
        id_exists = get_project(conn, project_id)
        if id_exists is None:
            return jsonify({'error': 'project_id not found'}), 404

        state = pickle.loads(id_exists[2])

        # Call function in caliban.py to save data file and send to S3 bucket
        if is_trk_file(id_exists[1]):
            state.action_save_track()
        elif is_npz_file(id_exists[1]):
            state.action_save_zstack()

        # Delete id and object from database
        delete_project(conn, project_id)

    return redirect("/")


@application.route("/action/<project_id>/<action_type>", methods=["POST"])
def action(project_id, action_type):
    ''' Make an edit operation to the data file and update the object
        in the database.
    '''
    # obtain 'info' parameter data sent by .js script
    info = {k: json.loads(v) for k, v in request.values.to_dict().items()}

    try:
        conn = create_connection(r"caliban.db")
        with conn:
            # Use id to grab appropriate TrackReview/ZStackReview object from database
            id_exists = get_project(conn, project_id)
            if id_exists is None:
                return jsonify({'error': 'project_id not found'}), 404

            state = pickle.loads(id_exists[2])
            # Perform edit operation on the data file
            state.action(action_type, info)

            # Update object in local database
            update_object(conn, (id_exists[1], state, project_id))

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    # Send status of operation to .js file
    return jsonify({"tracks_changed": True, "frames_changed": True})


@application.route("/tracks/<project_id>")
def get_tracks(project_id):
    ''' Send track metadata in string form to .js file to present cell info in
        the browser.
    '''
    conn = create_connection(r"caliban.db")
    with conn:
        # Use id to grab appropriate TrackReview/ZStackReview object from database
        id_exists = get_project(conn, project_id)

        if id_exists is None:
            return jsonify({'error': 'project_id not found'}), 404

        state = pickle.loads(id_exists[2])
    return jsonify({"tracks": state.readable_tracks})


@application.route("/frame/<frame>/<project_id>")
def get_frame(frame, project_id):
    ''' Serve modes of frames as pngs. Send pngs and color mappings of
        cells to .js file.
    '''
    frame = int(frame)
    conn = create_connection(r"caliban.db")
    with conn:
        # Use id to grab appropriate TrackReview/ZStackReview object from database
        id_exists = get_project(conn, project_id)

        if id_exists is None:
            return jsonify({'error': 'project_id not found'}), 404

        state = pickle.loads(id_exists[2])

        # Obtain raw, mask, and edit mode frames
        img = state.get_frame(frame, raw=False, edit_background=False)
        raw = state.get_frame(frame, raw=True, edit_background=False)
        edit = state.get_frame(frame, raw=False, edit_background=True)

        # Obtain color map of the cells
        edit_arr = state.get_array(frame)

        encode = lambda x: base64.encodebytes(x.read()).decode()

        payload = {
            'raw': f'data:image/png;base64,{encode(raw)}',
            'segmented': f'data:image/png;base64,{encode(img)}',
            'edit_background': f'data:image/png;base64,{encode(edit)}',
            'seg_arr': edit_arr.tolist()
        }

        return jsonify(payload)


@application.route("/load/<filename>", methods=["POST"])
def load(filename):
    ''' Initate TrackReview/ZStackReview object and load object to database.
        Send specific attributes of the object to the .js file.
    '''

    conn = create_connection(r"caliban.db")
    print(f"Loading track at {filename}", file=sys.stderr)


    folders = re.split('__', filename)
    filename = folders[len(folders) - 1]
    subfolders = folders[2:len(folders)]

    subfolders = '/'.join(subfolders)

    input_bucket = folders[0]
    output_bucket = folders[1]

    if is_trk_file(filename):
        # Initate TrackReview object and entry in database
        track_review = TrackReview(filename, input_bucket, output_bucket, subfolders)
        project = (filename, track_review)
        project_id = create_project(conn, project)
        conn.commit()
        conn.close()

        # Send attributes to .js file
        return jsonify({
            "max_frames": track_review.max_frames,
            "tracks": track_review.readable_tracks,
            "dimensions": track_review.dimensions,
            "project_id": project_id
        })

    if is_npz_file(filename):
        # Initate ZStackReview object and entry in database
        zstack_review = ZStackReview(filename, input_bucket, output_bucket, subfolders)
        project = (filename, zstack_review)
        project_id = create_project(conn, project)
        conn.commit()
        conn.close()

        # Send attributes to .js file
        return jsonify({
            "max_frames": zstack_review.max_frames,
            "channel_max": zstack_review.channel_max,
            "feature_max": zstack_review.feature_max,
            "tracks": zstack_review.readable_tracks,
            "dimensions": zstack_review.dimensions,
            "project_id": project_id,
            "screen_scale": zstack_review.scale_factor
        })


@application.route('/', methods=['GET', 'POST'])
def form():
    ''' Request HTML landing page to be rendered if user requests for
        http://127.0.0.1:5000/.
    '''
    return render_template('form.html')


@application.route('/tool', methods=['GET', 'POST'])
def tool():
    ''' Request HTML caliban tool page to be rendered after user inputs
        filename in the landing page.
    '''
    filename = request.form['filename']
    print(f"{filename} is filename", file=sys.stderr)

    new_filename = 'caliban-input__caliban-output__test__{}'.format(
        str(filename).lower())

    if is_trk_file(new_filename):
        return render_template('index_track.html', filename=new_filename)
    if is_npz_file(new_filename):
        return render_template('index_zstack.html', filename=new_filename)

    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


@application.route('/<file>', methods=['GET', 'POST'])
def shortcut(filename):
    ''' Request HTML caliban tool page to be rendered if user makes a URL
        request to access a specific data file that has been preloaded to the
        input S3 bucket (ex. http://127.0.0.1:5000/test.npz).
    '''

    if is_trk_file(filename):
        return render_template('index_track.html', filename=filename)
    if is_npz_file(filename):
        return render_template('index_zstack.html', filename=filename)

    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


def create_connection(db_file):
    ''' Create a database connection to a SQLite database.
    '''
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except Error as e:
        print(e)
    return conn


def create_table(conn, create_table_sql):
    ''' Create a table from the create_table_sql statement.
    '''
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)


def create_project(conn, project):
    ''' Create a new project in the database table.
    '''
    sql = ''' INSERT INTO projects(filename, state)
              VALUES(?, ?) '''
    cur = conn.cursor()

    # convert object to binary data to be stored as data type BLOB
    state_data = pickle.dumps(project[1], pickle.HIGHEST_PROTOCOL)

    cur.execute(sql, (project[0], sqlite3.Binary(state_data)))
    return cur.lastrowid


def update_object(conn, project):
    ''' Update filename, state of a project.
    '''
    sql = ''' UPDATE projects
              SET filename = ? ,
                  state = ?
              WHERE id = ?'''

    # convert object to binary data to be stored as data type BLOB
    state_data = pickle.dumps(project[1], pickle.HIGHEST_PROTOCOL)

    cur = conn.cursor()
    cur.execute(sql, (project[0], sqlite3.Binary(state_data), project[2]))
    conn.commit()


def get_project(conn, project_id):
    '''Fetches TrackReview/ZStackReview object from database by project_id.

    Args:
        conn (obj): SQL database connection.
        project_id (int): The primary key of the projects table.

    Returns:
        tuple: all data columns matching the project_id.
    '''
    cur = conn.cursor()
    cur.execute("SELECT * FROM {tn} WHERE {idf}={my_id}".format(
        tn="projects",
        idf="id",
        my_id=project_id
    ))
    return cur.fetchone()


def delete_project(conn, project_id):
    ''' Delete data object (TrackReview/ZStackReview) by id.
    '''
    sql = 'DELETE FROM projects WHERE id=?'
    cur = conn.cursor()
    cur.execute(sql, (project_id,))
    conn.commit()


def main():
    ''' Runs application and initiates database file if it doesn't exist.
    '''
    conn = create_connection(r"caliban.db")
    sql_create_projects_table = """
        CREATE TABLE IF NOT EXISTS projects (
            id integer PRIMARY KEY,
            filename text NOT NULL,
            state blob NOT NULL);
    """
    create_table(conn, sql_create_projects_table)
    conn.commit()
    conn.close()

    application.jinja_env.auto_reload = True
    application.config['TEMPLATES_AUTO_RELOAD'] = True
    application.run('0.0.0.0', port=5000)

if __name__ == "__main__":
    main()
