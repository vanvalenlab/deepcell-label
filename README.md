# Browser-Based Application of DeepCell Label for Data Curation

This is an version of DeepCell Label that runs on a browser. The browser-based DeepCell Label application can be run locally or deployed to AWS Elastic Beanstalk.

Many key and mouse operations are the same between desktop and browser versions, but these versions are not guaranteed to share the same features. See the "Controls" section for an up-to-date list of features.

# DeepCell Label for Developers

## Install Dependencies

Using a virtual environment to install dependencies is recommended.

```bash
cd browser
pip install -r requirements.txt
```

## Run browser application in development mode

```bash
python3 application.py
```

## To use docker-compose for local development

Add your AWS credentials to `docker-compose.yaml`.

From the `deepcell-label/browser` folder, run:

```bash
sudo docker-compose up --build -d
```

Wait a minute for the database to finish setting up before running:

```
sudo docker-compose restart app
```

You can now go to 0.0.0.0:5000 in a browser window to access the local version of the tool.

To interact with the local mysql database:

```
sudo docker exec -it browser_db_1 bash
mysql -p
```

When finished:

```
sudo docker-compose down
```

(optional)

```
sudo docker system prune --volumes
```

## Structure of Browser Version

Flask is used as an HTTP server that serves the frames as pngs and metadata as JSON. The .js files in the `browser/template` folder are what makes the requests to the Flask server.

​Python Flask was used as a web application framework for constructing DeepCell Label. The Flask framework helps serves as the router that maps the specific URL with the associated function that is intended to perform some task. Specifically, the application.route decorator binds the URL rule to the function below it. Thus, if user performs actions that cause a change in the underlying data, the side-serving .js file will request to visits a specific URL, and the output of the function below the decorator will be rendered in the browser.

Functions depend on Python libraries -- including NumPy, Matplotlib, and scikit-image – to change the data within files. After the desired change has been made to the lineage information or mask annotation, the Flask app routing will update the interface to reflect the alterations with support from side-serving JavaScript scripts.

The final Flask application has been deployed to an AWS Elastic Beanstalk environment as a RESTful web service. A stable demo of the browser application can be accessed at label.deepcell.org. To deploy this application to AWS EB, an AWS RDS MySQL database must be set up and configured to handle data storage for application use. (Add database credentials to the .env configuration file.) Once a database is appropriately configured, the application can easily be launched by using the AWS EB command line tool or web interface. The .ebextensions folder will configure the web service to use the appropriate Flask application (eb_application.py, which uses a MySQL database instead of SQLite).

DeepCell Label can also be run locally using a SQLite database (this is the default behavior). When we start using DeepCell Label, DeepCell Label creates a TrackEdit (for .trk files) or ZStackEdit (for .npz files) object, gives it a unique ID, and stores it locally in caliban.db. Whenever we change an Edit object, DeepCell Label updates the object in the database. After we submit the file and our changes to the S3 bucket, DeepCell Label deletes the Edit object from the database, leaving behind the unique ID and session metadata. Running application.py creates the database if it does not already exist.

## Controls

_A reminder of these controls can also be found in the "instructions" pane when editing a file in the browser._

### Navigation through Frames:

_a or &larr;_ - Back one frame

_d or &rarr;_ - Forward one frame

### Edit Operations:

DeepCell Label's default setting allows operations to be carried out quickly and easily on existing segmentations. The actions that can modify cell labels and/or lineage information are:

_click_ - click on a cell label to select it. Up to two cells can be selected at one time.

_alt key + click_ - flood connected regions of the selected label with a new value

_shift key + click_ - trim away unconnected regions of the selected label

_c_ - create: relabel selected cell with an unused label

_f_ - fill hole: click on an empty area to flood it with the selected label

_p_ - parent: assign parent/daughter relationship to pair of selected cells in trk file

_p_ - predict: predict relationships across frames (time or z) in npz when no cells are selected; does not predict cell divisions in timelapse movies

_r_ - replace: relabel all instances of a selected cell label with a second selected cell label; replaces lineage data in a trk file

_s_ - swap: swap labels and lineage information between two selected cells

_w_ - watershed: call watershed transform to split one cell label into two

_x_ - delete: remove selected cell mask in frame

_esc_ - cancel operation
_space bar_ - confirm operation
_s_ - confirm operation in a single frame, when applicable

You can also use _esc_ or click on the black background to return back to a state where no cells are selected.

**In annotation (pixel editing) mode:**

Keybinds in pixel editing mode are different from those in the label-editing mode.

Annotation mode focuses on using an adjustable brush to modify annotations on a pixel level, rather than using operations that apply to every instance of a label within a frame or set of frames. The brush tool will only make changes to the currently selected value. Ie, a brush set to edit cell 5 will only add or erase "5" to the annotated image.

_[ (left bracket) / ] (right bracket)_ - increment value that brush is applying

_&darr; &uarr;_ - change size of brush tool

_i_ - invert greyscale raw image

_n_ - change brush label to an unusued label, so that a new cell can be created with a unique id

_p_ - color picker (click on a label to change the brush label to it)

_r_ - turn on "conversion brush" setting, which changes brush behavior so that one label value is overwritten with another label value. No other labels are affected, and conversion brush will not draw on background. After turning on conversion brush, click on cell labels as prompted to set brush labels. (Eraser mode is automatically turned off when the conversion brush is set.)

_t_ - threshold to predict annotations based on brightness. After turning this on, click and drag to draw a bounding box around the cell you wish to threshold. Make sure to include some background in the bounding box for accurate threshold predictions. Whatever was thresholded as foreground within the bounding box will be added to the annotation as a new cell with unique label.

_x_ - toggle eraser mode

### Viewing Options:

_spacebar + click and drag_ - pan across canvas

_-/= keys or alt + scroll wheel_ - zoom in and out

_c_ - cycle between different channels when no cells are selected

_e_ - toggle annotation mode (when nothing else selected)

_f_ - cycle between different annotations when no cells are selected

_h_ - switch between highlighted mode and non-highlighted mode. When outside of the pixel editor, the selected cell(s) will be highlighted in red and can be cycled through using -/= keys. When in the pixel editor, any pixels with the same label that the brush is set to edit will be highlighted red. (Eg, if the brush is set to an unused value, nothing will be highlighted, but if it is set to the value 5, any pixels with the label 5 will be displayed in red.)

_z_ - switch between annotations and raw images

_scroll wheel_ - change image contrast
