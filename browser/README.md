# Caliban Browser Version


This is an version of Caliban that runs on a Flask application.

Flask is used as an HTTP server that serves the frames as pngs and metadata
as JSON. The javascript in the `browser/template` folder is what makes the
requests to the Flask server.

To test the tracking tool, you can type in filenames like 

RAW264_S0_Batch00.trk
RAW264_S0_Batch02.trk
RAW264_S0_Batch03.trk

To test the z-stack tool, you can type in the filename

test.npz



