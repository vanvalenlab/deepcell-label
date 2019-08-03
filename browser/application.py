from caliban import TrackReview
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
application.config.from_object("config")

@application.route("/", methods=["POST"])
def upload_file():
 
    filename = gfilename

 
    if filename:
        track_review.action_save_track()
        return "success!"

    else:
        return redirect("/")

@application.route("/action/<action_type>", methods=["POST"])
def action(action_type):
    info = {k: int(v) for k, v in request.values.to_dict().items()}
    try:
        track_review.action(action_type, info)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)})

    return jsonify({"tracks_changed": True, "frames_changed": True})

@application.route("/tracks")
def get_tracks():
    return jsonify({
        "tracks": track_review.readable_tracks,
        })


@application.route("/frame/<frame>")
def get_frame(frame):
    frame = int(frame)
    img = track_review.get_frame(frame, raw=False)
    raw = track_review.get_frame(frame, raw=True)

    payload = {
            'raw': f'data:image/png;base64,{base64.encodebytes(raw.read()).decode()}',
            'cmap': track_review.png_colormap,
            'segmented': f'data:image/png;base64,{base64.encodebytes(img.read()).decode()}',
            }

    return jsonify(payload)

@application.route("/load/<filename>", methods=["POST"])
def load(filename):
    global gfilename
    global track_review
    print(f"Loading track at {filename}", file=sys.stderr)
    track_review = TrackReview(filename)
    gfilename = filename

    return jsonify({
        "max_frames": track_review.max_frames,
        "tracks": track_review.readable_tracks,
        "dimensions": track_review.dimensions
        })

@application.route('/', methods=['GET', 'POST'])
def form():
    return render_template('form.html')

@application.route('/tool', methods=['GET', 'POST'])
def tool():
    print(f"{request.form['filename']} is routing", file=sys.stderr)

    return render_template('index.html', filename=request.form['filename'])

def main():
    application.jinja_env.auto_reload = True
    application.config['TEMPLATES_AUTO_RELOAD'] = True
    application.run('0.0.0.0', port=5000)

if __name__ == "__main__":
    main()
