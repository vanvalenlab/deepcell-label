# Caliban Browser Version


This is an version of Caliban that runs on a Flask application.

Flask is used as an HTTP server that serves the frames as pngs and metadata
as JSON. The javascript in the `browser/template` folder is what makes the
requests to the Flask server.

To test the tracking tool, you can type the filename

RAW264_S0_Batch02.trk

To test the z-stack tool, you can type in the filename

test.npz

## Install Dependencies
`pip install -r requirements.txt`

## Run the browser application in development mode:
`export FLASK_APP=application FLASK_ENV=development flask run`




