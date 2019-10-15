from caliban import TrackReview, ZStackReview
from flask import Flask, jsonify, render_template, request, redirect, url_for
import sys
import base64
import copy
import os
import numpy as np
import traceback
import boto3, botocore
from werkzeug.utils import secure_filename
import sqlite3
from sqlite3 import Error
import pickle

application = Flask(__name__)
track_review = None
zstack_review = None
track_status = None
zstack_status = None
filename = None

application.config.from_object("config")

TRACK_EXTENSIONS = set(['trk', 'trks'])
ZSTACK_EXTENSIONS = set(['npz'])

@application.route("/upload_file/<project_id>", methods=["GET", "POST"])
def upload_file(project_id):

    conn = create_connection(r"caliban.db")
    with conn:
        cur = conn.cursor()

        cur.execute("SELECT * FROM {tn} WHERE {idf}={my_id}".\
        format(tn="projects", idf="id", my_id=project_id))
        id_exists = cur.fetchone()

        state = pickle.loads(id_exists[2])
        

        if "." in id_exists[1] and id_exists[1].split(".")[1].lower() in TRACK_EXTENSIONS:
            state.action_save_track()
        if "." in id_exists[1] and id_exists[1].split(".")[1].lower() in ZSTACK_EXTENSIONS:
            state.action_save_zstack()

        delete_project(conn, project_id)

    return redirect("/")


@application.route("/action/<project_id>/<action_type>", methods=["POST"])
def action(project_id, action_type):
    info = {k: int(v) for k, v in request.values.to_dict().items()}

    try:
        conn = create_connection(r"caliban.db")
        with conn:
            cur = conn.cursor()

            cur.execute("SELECT * FROM {tn} WHERE {idf}={my_id}".\
            format(tn="projects", idf="id", my_id=project_id))
            id_exists = cur.fetchone()

            state = pickle.loads(id_exists[2])
            state.action(action_type, info)
            update_task(conn, (id_exists[1], state, project_id))
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)})



    # try:
    #     if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
    #         track_review.action(action_type, info)

    #     if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
    #         zstack_review.action(action_type, info)

    # except Exception as e:
    #     traceback.print_exc()
    #     return jsonify({"error": str(e)})

    return jsonify({"tracks_changed": True, "frames_changed": True})

@application.route("/tracks/<project_id>")
def get_tracks(project_id):
    conn = create_connection(r"caliban.db")
    with conn:
        cur = conn.cursor()

        cur.execute("SELECT * FROM {tn} WHERE {idf}={my_id}".\
        format(tn="projects", idf="id", my_id=project_id))
        id_exists = cur.fetchone()

        state = pickle.loads(id_exists[2])
        #state.action(action_type, info)

        #update_task(conn, (id_exists[1], state, project_id))

        return jsonify({
                "tracks": state.readable_tracks
                })





    # if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
    #     return jsonify({
    #         "tracks": track_review.readable_tracks,
    #         })
    # if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
    #     return jsonify({
    #         "tracks": zstack_review.readable_tracks,
    #         })

@application.route("/frame/<frame>/<project_id>")
def get_frame(frame, project_id):
    frame = int(frame)



    conn = create_connection(r"caliban.db")
    with conn:
        cur = conn.cursor()

        cur.execute("SELECT * FROM {tn} WHERE {idf}={my_id}".\
        format(tn="projects", idf="id", my_id=project_id))
        id_exists = cur.fetchone()

        state = pickle.loads(id_exists[2])

        img = state.get_frame(frame, raw=False, edit_background =False)
        raw = state.get_frame(frame, raw=True, edit_background=False)
        edit = state.get_frame(frame, raw=False, edit_background=True)
        edit_arr = state.get_array(frame)
        payload = {
                'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
                'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
                'edit_background': f'data:image/png;base64,{base64.encodebytes(edit.read()).decode()}',
                'seg_arr': edit_arr.tolist()
                }

        return jsonify(payload)



    
    # if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
    #     img = track_review.get_frame(frame, raw=False, edit_background =False)
    #     raw = track_review.get_frame(frame, raw=True, edit_background=False)
    #     edit = track_review.get_frame(frame, raw=False, edit_background=True)
    #     payload = {
    #             'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
    #             'cmap': track_review.png_colormap,
    #             'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
    #             'edit_background': f'data:image/png;base64,{base64.encodebytes(edit.read()).decode()}'
    #             }

    # if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
    #     img = zstack_review.get_frame(frame, raw=False, edit_background =False)
    #     raw = zstack_review.get_frame(frame, raw=True, edit_background=False)
    #     edit = zstack_review.get_frame(frame, raw=False, edit_background=True)

    #     payload = {
    #             'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
    #             'cmap': zstack_review.png_colormap,
    #             'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
    #             'edit_background': f'data:image/png;base64,{base64.encodebytes(edit.read()).decode()}'
    #             }
    # return jsonify(payload)

@application.route("/load/<filename>", methods=["POST"])
def load(filename):

    # global track_review
    # global zstack_review
    conn = create_connection(r"caliban.db")
    print(f"Loading track at {filename}", file=sys.stderr)


    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        track_review = TrackReview(filename)
        project = (filename, track_review)
        project_id = create_project(conn, project)
        conn.commit()
        conn.close()
        return jsonify({
            "max_frames": track_review.max_frames,
            "tracks": track_review.readable_tracks,
            "dimensions": track_review.dimensions,
            "project_id": project_id
            })

    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        zstack_review = ZStackReview(filename)
        project = (filename, zstack_review)
        project_id = create_project(conn, project)
        conn.commit()
        conn.close()
        return jsonify({
            "max_frames": zstack_review.max_frames,
            "channel_max": zstack_review.channel_max,
            "feature_max": zstack_review.feature_max,
            "tracks": zstack_review.readable_tracks,
            "dimensions": zstack_review.dimensions,
            "project_id": project_id
            })

@application.route('/', methods=['GET', 'POST'])
def form():
    return render_template('form.html')

# Brings users to the first homepage, where they can input the filename
@application.route('/tool', methods=['GET', 'POST'])
def tool():

    filename = request.form['filename']
    print(f"{filename} is filename", file=sys.stderr)

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        return render_template('index_track.html', filename=filename)
    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        return render_template('index_zstack.html', filename=filename)

    return "error"

# Directly brings users to the tool page by typing url/filename
@application.route('/<file>', methods=['GET', 'POST'])
def shortcut(file):

   
    # print(f"{filename} is filename", file=sys.stderr)

    if "." in file and file.split(".")[1].lower() in TRACK_EXTENSIONS:
        return render_template('index_track.html', filename=file)
    if "." in file and file.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        return render_template('index_zstack.html', filename=file)

    return "error"




def create_connection(db_file):
    """ create a database connection to a SQLite database """
    conn = None
    try:
        conn = sqlite3.connect(db_file)
       
    except Error as e:
        print(e)

    return conn


def create_table(conn, create_table_sql):
    """ create a table from the create_table_sql statement
    :param conn: Connection object
    :param create_table_sql: a CREATE TABLE statement
    :return:
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)


def create_project(conn, project):
    """
    Create a new project into the projects table
    :param conn:
    :param project:
    :return: project id
    """
    sql = ''' INSERT INTO projects(filename, state)
              VALUES(?, ?) '''
    cur = conn.cursor()



    state_data = pickle.dumps(project[1], pickle.HIGHEST_PROTOCOL)
  
   
    cur.execute(sql, (project[0], sqlite3.Binary(state_data)))
    return cur.lastrowid

def update_task(conn, project):
    """
    update priority, begin_date, and end date of a task
    :param conn:
    :param task:
    :return: project id
    """
    sql = ''' UPDATE projects
              SET filename = ? ,
                  state = ? 
              WHERE id = ?'''

    state_data = pickle.dumps(project[1], pickle.HIGHEST_PROTOCOL)
  
    cur = conn.cursor()
    cur.execute(sql, (project[0], sqlite3.Binary(state_data), project[2]))
    conn.commit()

def delete_project(conn, id):
    """
    Delete a task by task id
    :param conn:  Connection to the SQLite database
    :param id: id of the task
    :return:
    """
    sql = 'DELETE FROM projects WHERE id=?'
    cur = conn.cursor()
    cur.execute(sql, (id,))
    conn.commit()
    

def main():
    conn = create_connection(r"caliban.db")
    sql_create_projects_table = """ CREATE TABLE IF NOT EXISTS projects (

                                        id integer PRIMARY KEY,
                                        filename text NOT NULL,
                                        state blob NOT NULL); """

    create_table(conn, sql_create_projects_table)
    conn.commit()    
    conn.close()
    application.jinja_env.auto_reload = True
    application.config['TEMPLATES_AUTO_RELOAD'] = True
    application.run('0.0.0.0', port=5000)

if __name__ == "__main__":
    main()