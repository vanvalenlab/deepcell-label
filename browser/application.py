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

application = Flask(__name__)
track_review = None
zstack_review = None
track_status = None
zstack_status = None
filename = None

application.config.from_object("config")

TRACK_EXTENSIONS = set(['trk', 'trks'])
ZSTACK_EXTENSIONS = set(['npz'])

@application.route("/", methods=["POST"])
def upload_file():

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        track_review.action_save_track()
        return filename
    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        zstack_review.action_save_zstack()
        return filename
    else:
        return redirect("/")

@application.route("/action/<action_type>", methods=["POST"])
def action(action_type):
    info = {k: int(v) for k, v in request.values.to_dict().items()}
    try:
        if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
            track_review.action(action_type, info)

        if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
            zstack_review.action(action_type, info)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)})

    return jsonify({"tracks_changed": True, "frames_changed": True})

@application.route("/tracks")
def get_tracks():

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        return jsonify({
            "tracks": track_review.readable_tracks,
            })
    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        return jsonify({
            "tracks": zstack_review.readable_tracks,
            })

@application.route("/frame/<frame>")
def get_frame(frame):
    frame = int(frame)

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        img = track_review.get_frame(frame, raw=False, edit_background =False)
        raw = track_review.get_frame(frame, raw=True, edit_background=False)
        edit = track_review.get_frame(frame, raw=False, edit_background=True)
        payload = {
                'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
                'cmap': track_review.png_colormap,
                'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
                'edit_background': f'data:image/png;base64,{base64.encodebytes(edit.read()).decode()}'
                }

    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        img = zstack_review.get_frame(frame, raw=False, edit_background =False)
        raw = zstack_review.get_frame(frame, raw=True, edit_background=False)
        edit = zstack_review.get_frame(frame, raw=False, edit_background=True)

        payload = {
                'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
                'cmap': zstack_review.png_colormap,
                'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
                'edit_background': f'data:image/png;base64,{base64.encodebytes(edit.read()).decode()}'
                }
    return jsonify(payload)

@application.route("/load/<fname>", methods=["POST"])
def load(fname):

    global track_review
    global zstack_review
    global filename

    filename = fname

    print(f"Loading track at {filename}", file=sys.stderr)


    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        track_review = TrackReview(filename)
        return jsonify({
            "max_frames": track_review.max_frames,
            "tracks": track_review.readable_tracks,
            "dimensions": track_review.dimensions
            })

    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        zstack_review = ZStackReview(filename)
        return jsonify({
            "max_frames": zstack_review.max_frames,
            "channel_max": zstack_review.channel_max,
            "feature_max": zstack_review.feature_max,
            "tracks": zstack_review.readable_tracks,
            "dimensions": zstack_review.dimensions
            })

@application.route('/', methods=['GET', 'POST'])
def form():
    return render_template('form.html')

# Brings users to the first homepage, where they can input the filename
@application.route('/tool', methods=['GET', 'POST'])
def tool():

    global filename

    filename = request.form['filename']


    #filename = request.form['filename']
    print(f"{filename} is filename", file=sys.stderr)

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        return render_template('index_track.html', filename=filename)
    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        return render_template('index_zstack.html', filename=filename)

    return "error"


@application.route('/<file>', methods=['GET', 'POST'])
def shortcut(file):

    global filename

    filename = file
    print(f"{filename} is filename", file=sys.stderr)

    if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
        return render_template('index_track.html', filename=filename)
    if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
        return render_template('index_zstack.html', filename=filename)

    return "error"

# # Directly brings users to the tool page by typing url/filename
# @application.route('/<file>')
# def shortcut(file):

#     global filename

#     filename = file

#     #filename = file
#     print(f"{filename} is filename", file=sys.stderr)

#     if "." in filename and filename.split(".")[1].lower() in TRACK_EXTENSIONS:
#         return render_template('index_track.html', filename=filename)
#     if "." in filename and filename.split(".")[1].lower() in ZSTACK_EXTENSIONS:
#         return render_template('index_zstack.html', filename=filename)

#     return "error"

def main():
    application.jinja_env.auto_reload = True
    application.config['TEMPLATES_AUTO_RELOAD'] = True
    application.run('0.0.0.0', port=5000)

if __name__ == "__main__":
    main()