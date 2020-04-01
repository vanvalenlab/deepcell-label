"""Flask app route handlers"""

import base64
import json
import os
import pickle
import re
import sys
import traceback

import MySQLdb

from flask import Flask, jsonify, render_template, request, redirect

from helpers import is_trk_file, is_npz_file
from caliban import TrackReview, ZStackReview
import config

# Create and configure the app
application = Flask(__name__)  # pylint: disable=C0103
app = application
app.config.from_object("config")


@app.route("/health")
def healthcheck():
    '''Lets elastic beanstalk know when this app is ready to use'''
    return 'success'

@app.route("/upload_file/<project_id>", methods=["GET", "POST"])
def upload_file(project_id):
    ''' Upload .trk/.npz data file to AWS S3 bucket.
    '''
    conn = create_connection()
    # Use id to grab appropriate TrackReview/ZStackReview object from database
    id_exists = get_project(conn, project_id)

    if id_exists is None:
        conn.close()
        return jsonify({'error': 'project_id not found'}), 404

    state = pickle.loads(id_exists[2])

    # Call function in caliban.py to save data file and send to S3 bucket
    if is_trk_file(id_exists[1]):
        state.action_save_track()
    elif is_npz_file(id_exists[1]):
        state.action_save_zstack()

    # add "finished" timestamp and null out state longblob
    delete_project(conn, project_id)
    conn.close()

    return redirect("/")


@app.route("/action/<project_id>/<action_type>/<frame>", methods=["POST"])
def action(project_id, action_type, frame):
    ''' Make an edit operation to the data file and update the object
        in the database.
    '''

    # obtain 'info' parameter data sent by .js script
    info = {k: json.loads(v) for k, v in request.values.to_dict().items()}
    frame = int(frame)

    try:
        conn = create_connection()
        # Use id to grab appropriate TrackReview/ZStackReview object from database
        id_exists = get_project(conn, project_id)

        if id_exists is None:
            conn.close()
            return jsonify({'error': 'project_id not found'}), 404

        state = pickle.loads(id_exists[2])
        # Perform edit operation on the data file
        state.action(action_type, info)
        frames_changed = state.frames_changed
        info_changed = state.info_changed

        state.frames_changed = state.info_changed = False

        # Update object in local database
        update_object(conn, state, project_id)
        conn.close()

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    if info_changed:
        tracks = state.readable_tracks
    else:
        tracks = False

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

    return jsonify({"tracks": tracks, "imgs": img_payload})

@app.route("/frame/<frame>/<project_id>")
def get_frame(frame, project_id):
    ''' Serve modes of frames as pngs. Send pngs and color mappings of
        cells to .js file.
    '''
    frame = int(frame)
    conn = create_connection()
    # Use id to grab appropriate TrackReview/ZStackReview object from database
    id_exists = get_project(conn, project_id)
    conn.close()

    if id_exists is None:
        return jsonify({'error': 'project_id not found'}), 404

    state = pickle.loads(id_exists[2])

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

@app.route("/load/<filename>", methods=["POST"])
def load(filename):
    ''' Initate TrackReview/ZStackReview object and load object to database.
        Send specific attributes of the object to the .js file.
    '''
    conn = create_connection()

    print(f"Loading track at {filename}", file=sys.stderr)

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
        project_id = create_project(conn, filename, track_review, subfolders)

        conn.commit()
        conn.close()

        # Send attributes to .js file
        return jsonify({
            "max_frames": track_review.max_frames,
            "tracks": track_review.readable_tracks,
            "dimensions": track_review.dimensions,
            "project_id": project_id,
            "screen_scale": track_review.scale_factor
        })

    if is_npz_file(filename):
        # arg is 'false' which gets parsed to True if casting to bool
        rgb = request.args.get('rgb', type = str)
        rgb = json.loads(rgb)
        # Initate ZStackReview object and entry in database
        zstack_review = ZStackReview(filename, input_bucket, output_bucket, full_path, rgb)
        project_id = create_project(conn, filename, zstack_review, subfolders)
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

    conn.close()
    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


@app.route('/', methods=['GET', 'POST'])
def form():
    ''' Request HTML landing page to be rendered if user requests for
        http://127.0.0.1:5000/.
    '''
    return render_template('form.html')


@app.route('/tool', methods=['GET', 'POST'])
def tool():
    ''' Request HTML caliban tool page to be rendered after user inputs
        filename in the landing page.
    '''
    filename = request.form['filename']
    print(f"{filename} is filename", file=sys.stderr)

    new_filename = 'caliban-input__caliban-output__test__{}'.format(
        str(filename))

    # if no options passed (how this route will be for now),
    # still want to pass in default settings
    rgb = request.args.get('rgb', default = False, type = bool)
    pixel_only = request.args.get('pixel_only', default = False, type = bool)
    label_only = request.args.get('label_only', default = False, type = bool)
    settings = {'rgb': rgb,
                'pixel_only': pixel_only,
                'label_only': label_only}

    if is_trk_file(new_filename):
        return render_template('index_track.html', filename=new_filename)
    if is_npz_file(new_filename):
        return render_template('index_zstack.html',
            filename=new_filename,
            settings=settings)

    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400


@app.route('/<filename>', methods=['GET', 'POST'])
def shortcut(filename):
    ''' Request HTML caliban tool page to be rendered if user makes a URL
        request to access a specific data file that has been preloaded to the
        input S3 bucket (ex. http://127.0.0.1:5000/test.npz).
    '''
    # if no options passed, we get default settings anyway
    rgb = request.args.get('rgb', default = False, type = bool)
    pixel_only = request.args.get('pixel_only', default = False, type = bool)
    label_only = request.args.get('label_only', default = False, type = bool)
    settings = {'rgb': rgb,
                'pixel_only': pixel_only,
                'label_only': label_only}

    # TODO: could this be consolidated into one template with an "is_trk" toggle?
    # note: not adding options to trk files yet
    if is_trk_file(filename):
        return render_template('index_track.html', filename=filename)
    if is_npz_file(filename):
        return render_template('index_zstack.html',
            filename=filename,
            settings=settings)

    # TODO: render an error template instead that shows which error,
    # instead of sending json
    error = {
        'error': 'invalid file extension: {}'.format(
            os.path.splitext(filename)[-1])
    }
    return jsonify(error), 400

def create_connection():
    ''' Create a database connection to a MySQL database.
    '''
    conn = None
    try:
        conn = MySQLdb.connect(
            user=config.MYSQL_USERNAME,
            host=config.MYSQL_HOSTNAME,
            port=config.MYSQL_PORT,
            passwd=config.MYSQL_PASSWORD,
            db=config.MYSQL_DATABASE,
            charset='utf8',
            use_unicode=True)
    except MySQLdb._exceptions.MySQLError as err:
        print(err)
    return conn

def initial_connection():
    ''' Create a connection to a MySQL server. Creates database if
    it doesn't exist yet. Only called when starting app.
    '''
    try:
        # connect but don't specify database: it might not exist
        conn = MySQLdb.connect(
            user=config.MYSQL_USERNAME,
            host=config.MYSQL_HOSTNAME,
            port=config.MYSQL_PORT,
            passwd=config.MYSQL_PASSWORD,
            charset='utf8',
            use_unicode=True)

    except MySQLdb._exceptions.MySQLError as err:
        print('error', err)

    # on new server, caliban database won't exist yet
    try:
        query = '''CREATE DATABASE {}'''.format(config.MYSQL_DATABASE)
        conn.cursor().execute(query)
        conn.commit()

    # it already exists
    except MySQLdb._exceptions.MySQLError as err:
        print('error', err)

    finally:
        conn.close()


def create_table(conn, create_table_sql):
    ''' Create a table from the create_table_sql statement.
    '''
    try:
        cursor = conn.cursor()
        cursor.execute(create_table_sql)
    except MySQLdb._exceptions.MySQLError as err:
        print(err)


def create_project(conn, filename, data, subfolders):
    ''' Create a new project in the database table. Creates a
    new row (id autoincrements from whatever id came before it).
    Populates row with file info (name, subfolders, and the file
    contents, as a pickled python object).
    '''
    sql = ''' INSERT INTO projects(filename, state, subfolders)
              VALUES(%s, %s, %s) '''
    cursor = conn.cursor()

    # convert object to binary data to be stored as data type BLOB
    state_data = pickle.dumps(data, pickle.HIGHEST_PROTOCOL)

    cursor.execute(sql, (filename, state_data, subfolders))
    return cursor.lastrowid


def update_object(conn, state, project_id):
    ''' Update state of a project. Creates pickle dump of object state
    and stores it in db in appropriate project row. Also increments numUpdates,
    and creates timestamp for firstUpdate if appropriate.
    '''
    sql = ''' UPDATE projects
              SET state = %s,
                  firstUpdate = IF(numUpdates = 0, CURRENT_TIMESTAMP, firstUpdate),
                  numUpdates = numUpdates + 1
              WHERE id = %s'''

    # convert object to binary data to be stored as data type BLOB
    state_data = pickle.dumps(state, pickle.HIGHEST_PROTOCOL)

    cur = conn.cursor()
    cur.execute(sql, (state_data, project_id))
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
    ''' Delete data object (TrackReview/ZStackReview) by id. Ie, state data
    gets overwritten with NULL value in database (it should have been uploaded
    to AWS as part of upload action) to save space in db. Timestamp metrics
    are updated appropriately.
    '''
    cur = conn.cursor()

    sql = ''' UPDATE {tn}
              SET lastUpdate = updatedAt
              WHERE id = {my_id}
          '''.format(tn = 'projects', my_id = project_id)
    cur.execute(sql)

    timesql = ''' UPDATE {tn}
                  SET finished = CURRENT_TIMESTAMP,
                      state = NULL
                  WHERE id = {my_id}'''.format(
                    tn = "projects",
                    my_id = project_id)
    cur.execute(timesql)

    conn.commit()


def main():
    ''' Runs app and initiates database file if it doesn't exist.
    Columns in table:
    id: always has a value, used to match actions to the correct file
    filename: always has a value, does not contain subfolders in filename
    state: stores python object as longblob while file is open, nulls out
        when file is uploaded
    subfolders: directory structure of s3 bucket where file was stored
    createdAt: timestamp of when the file was opened; should always have a value
    updatedAt: timestamp of lastest time the file was changed, including upload
    finished: null value until file is uploaded and it gets a timestamp
    numUpdates: integer that increments each time the file is updated (note:
        changing channels counts as an update, changing frames does not)
    firstUpdate: timestamp that is null by default until an update is made. Is not
        subsequently changed
    lastUpdate: timestamp that is null by default until file is uploaded, to
        accurately track the last change made to file before upload
    '''
    initial_connection()
    conn = create_connection()

    sql_create_projects_table = """
        CREATE TABLE IF NOT EXISTS projects (
            id integer NOT NULL AUTO_INCREMENT PRIMARY KEY,
            filename text NOT NULL,
            state longblob,
            subfolders text NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
            finished TIMESTAMP,
            numUpdates integer NOT NULL DEFAULT 0,
            firstUpdate TIMESTAMP,
            lastUpdate TIMESTAMP
        );
    """
    create_table(conn, sql_create_projects_table)

    conn.commit()
    conn.close()

    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run('0.0.0.0', port=5000)

if __name__ == "__main__":
    main()
