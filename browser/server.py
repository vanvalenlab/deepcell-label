from caliban import TrackReview
from flask import Flask, jsonify, render_template, request

import base64
import copy
import numpy as np
import traceback

app = Flask(__name__)
track_review = None


@app.route("/action/<action_type>", methods=["POST"])
def action(action_type):
    info = {k: int(v) for k, v in request.values.to_dict().items()}
    try:
        track_review.action(action_type, info)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)})

    return jsonify({"tracks_changed": True, "frames_changed": True})

@app.route("/tracks")
def get_tracks():
    return jsonify({
        "tracks": track_review.readable_tracks,
        })


@app.route("/frame/<frame>")
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


@app.route("/load/<filename>", methods=["POST"])
def load(filename):
    global track_review
    print(f"Loading track at {filename}")
    track_review = TrackReview(filename)

    return jsonify({
        "max_frames": track_review.max_frames,
        "tracks": track_review.readable_tracks,
        "dimensions": track_review.dimensions
        })


@app.route("/")
def root():
    return render_template('index.html')


def main():
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run('0.0.0.0', port=5000)


if __name__ == "__main__":
    main()

