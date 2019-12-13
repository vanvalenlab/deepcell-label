# Browser-Based Application of Caliban for Data Curation

This is an version of Caliban that runs on a browser.

Many key and mouse operations are the same between desktop and browser versions, but these versions are not guaranteed to share the same features. See the "Controls" section for an up-to-date list of features.

# Caliban for Developers

## Install Dependencies
```bash
cd browser
pip install -r requirements.txt
```

## Run browser application in development mode
```bash
python3 application.py
```

## Structure of Browser Version

Flask is used as an HTTP server that serves the frames as pngs and metadata as JSON. The .js files in the `browser/template` folder are what makes the requests to the Flask server.

​Python Flask was used as a web application framework for constructing Caliban. The Flask framework helps serves as the router that maps the specific URL with the associated function that is intended to perform some task. Specifically, the application.route decorator binds the URL rule to the function below it. Thus, if user makes an operation or clicks a button, the side-serving .js file will request to visits a specific URL, and the output of the function below the decorator will be rendered in the browser.

Functions depend on Python libraries -- including NumPy, Matplotlib, and scikit-learn – to change the metadata for the files. After the desired change has been made to the lineage information or mask annotation, the Flask app routing will update the interface to reflect the alterations with support from side-serving JavaScript scripts.

The final Flask application has been deployed to an AWS Elastic Beanstalk environment as a RESTful web service. A stable demo of the browser application can be accessed at caliban.deepcell.org.

An SQLite database has been added to make Caliban stateless and scalable. SQLite is embedded into the end program, so whenever the tool is started, a unique id is created for the user and the TrackReview/ZStackReview object is stored locally in caliban.db. Whenever the user makes a change to the object, the application will update the state of the object. After the user submits the final datafile to the S3 bucket, the corresponding id and object will be deleted from the database file. When the application is packaged as an Elastic Beanstalk app, the .db file will also be packaged in the zip file. Note: there must be a caliban.db file in the browser directory before deploying an Elastic Beanstalk app, otherwise files cannot be loaded. The caliban.db file can be created simply by running application.py.

## Controls

*A reminder of these controls can also be found in the "instructions" pane when editing a file in the browser.*

### Navigation through Frames:

*a or &larr;* - Back one frame

*d or &rarr;* - Forward one frame


### Edit Operations:

Caliban's default setting allows operations to be carried out quickly and easily on existing segmentations. The actions that can modify cell labels and/or lineage information are:

*click* - click on a cell label to select it. Up to two cells can be selected at one time.

*alt key + click* - flood connected regions of the selected label with a new value

*shift key + click* - trim away unconnected regions of the selected label

*c* - create: relabel selected cell with an unused label

*f* - fill hole: click on an empty area to flood it with the selected label

*p* - parent: assign parent/daughter relationship to pair of selected cells in trk file

*p* - predict: predict relationships across frames (time or z) in npz when no cells are selected; does not predict cell divisions in timelapse movies

*r* - replace: relabel all instances of a selected cell label with a second selected cell label; replaces lineage data in a trk file

*s* - swap: swap labels and lineage information between two selected cells

*w* - watershed: call watershed transform to split one cell label into two

*x* - delete: remove selected cell mask in frame


*esc* - cancel operation
*space bar* - confirm operation
*s* - confirm operation in a single frame, when applicable

You can also use *esc* or click on the black background to return back to a state where no cells are selected.

**In annotation (pixel editing) mode:**

Keybinds in pixel editing mode are different from those in the label-editing mode.

Annotation mode focuses on using an adjustable brush to modify annotations on a pixel level, rather than using operations that apply to every instance of a label within a frame or set of frames. The brush tool will only make changes to the currently selected value. Ie, a brush set to edit cell 5 will only add or erase "5" to the annotated image.

*-/=* - increment value that brush is applying

*&darr; &uarr;* - change size of brush tool

*i* - invert greyscale raw image

*n* - change brush label to an unusued label, so that a new cell can be created with a unique id

*p* - color picker (click on a label to change the brush value to it)

*r* - turn on "conversion brush" setting, which changes brush behavior so that one label value is overwritten with another label value. No other labels are affected, and conversion brush will not draw on background. After turning on conversion brush, click on cell labels as prompted to set brush values. (Eraser mode is automatically turned off when the conversion brush is set.)

*t* - threshold to predict annotations based on brightness. After turning this on, click and drag to draw a bounding box around the cell you wish to threshold. Make sure to include some background in the bounding box for accurate threshold predictions. Whatever was thresholded as foreground within the bounding box will be added to the annotation as a new cell with unique label.

*x* - toggle eraser mode


### Viewing Options:

*c* - cycle between different channels when no cells are selected

*e* - toggle annotation mode (when nothing else selected)

*f* - cycle between different annotations when no cells are selected

*h* - switch between highlighted mode and non-highlighted mode. When outside of the pixel editor, the selected cell(s) will be highlighted in red and can be cycled through using -/= keys. When in the pixel editor, any pixels with the same label that the brush is set to edit will be highlighted red. (Eg, if the brush is set to an unused value, nothing will be highlighted, but if it is set to the value 5, any pixels with the label 5 will be displayed in red.)

*z* - switch between annotations and raw images

*scroll wheel* - change image contrast
