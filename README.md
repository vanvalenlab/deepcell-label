# DeepCell Label: Data Curation Tools for DeepCell.

[![Actions Status](https://github.com/vanvalenlab/deepcell-label/workflows/browser/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)

DeepCell Label is a segmentation and tracking tool used for human-in-the-loop data curation. It displays lineage data along with raw and annotated images. The output files prepare this information as training data for DeepCell.

## Instructions for Running DeepCell Label Locally on Desktop

```bash
git clone https://github.com/vanvalenlab/deepcell-label.git
cd deepcell-label
cd desktop
python3 caliban.py [input file location]
```

**Accepted file types:**
DeepCell Label can open .trk files or .npz files. .npz files must contain two zipped files corresponding to raw images and annotated images. If the files are not named 'raw' and 'annotated' or 'X' and 'y', the first file in the .npz will be opened as the raw images. Raw and annotated images must both be in 4D arrays in the shape (frames, y, x, channels or features).

## Tools Guide

Files can be edited using keyboard operations.

### Navigation through Frames:

_a or &larr;_ - Back one frame

_d or &rarr;_ - Forward one frame

### Edit Operations:

DeepCell Label's default setting allows operations to be carried out quickly and easily on existing segmentations. The actions that can modify cell labels and/or lineage information are:

_click_ - click on a cell label to select it. Up to two labels can be selected at one time.

_shift + click_ - trim stray pixels away from selected part of label

_ctrl + click_ - flood selected part of label with a new, unused label

_c_ - create: relabel selected label with a new, unused label

_f_ - fill: select label, press "f", then follow prompt to fill a hole in the selected label

_r_ - replace: relabel all instances of a selected cell label with a second selected cell label; replaces lineage data in a trk file

_r_ - relabel: sequentially relabel all labels in frame, starting from 1, when no labels are selected (npz only)

_p_ - parent: assign parent/daughter relationship to pair of selected labels in trk file

_p_ - predict: predict zstack relationships in npz when no labels are selected

_s_ - swap: swap labels and lineage information between two selected labels

_x_ - delete: remove selected cell mask in frame

_w_ - watershed: call watershed transform to split one cell label into two

_esc_ - cancel operation  
_space bar_ - confirm operation  
_s_ - confirm operation in a single frame, when applicable

You can use _esc_ to return back to a state where no labels are selected.

**In annotation (pixel editing) mode:**

Keybinds in pixel editing mode are different from those in the label-editing mode.

Annotation mode focuses on using an adjustable brush to modify annotations on a pixel level, rather than using operations that apply to every instance of a label within a frame or set of frames. The brush tool will only make changes to the currently selected value. Ie, a brush set to edit label 5 will only add or erase "5" to the annotated image.

_[ (left bracket) / ] (right bracket)_ - decrement/increment value that brush is applying

_&darr; &uarr;_ - change size of brush tool

_x_ - toggle eraser mode

_n_ - change brush label to an unusued label, so that a new label can be created with a unique id. Can be used with conversion brush to overwrite existing label with unused label (follow conversion brush prompt).

_p_ - color picker (click on a label to change the brush label to it)

_r_ - turn on "conversion brush" setting, which changes brush behavior so that one label value is overwritten with another label value. No other labels are affected, and conversion brush will not draw on background. After turning on conversion brush, click on cell labels as prompted to set brush labels.

_t_ - threshold to predict annotations based on brightness. After turning this on, click and drag to draw a bounding box around the cell you wish to threshold. Make sure to include some background in the bounding box for accurate threshold predictions. Whatever was thresholded as foreground within the bounding box will be added to the annotation as a new cell with unique label.

### Viewing Options:

_F11_ - toggle fullscreen

_-/= or ctrl + scroll wheel_ - change level of zoom

**To pan in image:** Hold down the spacebar while clicking and dragging image to pan. Alternatively, the keys _home, page up, page down, and end_ can be used to jump across the screen. Holding the shift key while using these pan buttons will result in a smaller jump; holding the control key will snap to the edge of the image.

_h_ - switch between highlighted mode and non-highlighted mode (highlight exists in whole-label mode and paint mode but is displayed differently; label-editing highlighting recolors solid label with red, paint mode highlighting adds white or red outline around label in image). Once highlight mode is on, use _[ (left bracket) / ] (right bracket)_ to decrement/increment selected cell label number.

_shift+h_ - switch between showing and hiding annotation masks in the pixel editor

_z_ - switch between annotations and raw images (outside of pixel editor)

_i_ - invert greyscale raw image (viewing raw image or in pixel editor)

_k_ - apply sobel filter to raw image (viewing raw image or in pixel editor)

_j_ - apply adaptive histogram equalization to raw image (viewing raw image or in pixel editor)

_f_ - cycle between different annotations when no labels are selected (label-editing mode)

_c_ - cycle between different channels when no labels are selected (label-editing mode)

_shift + &darr; / &uarr;_ - cycle between colormaps for viewing raw images (does not apply to pixel editor)

_e_ - toggle annotation mode between paint mode and whole-label mode (when nothing else selected)

_scroll wheel_ - change image or annotation maximum brightness

_shift + scroll wheel_ - change image minimum brightness

### To Save:

Once done, use the following key to save the changed file.
The tool will also save the original file in the same folder.
In npz mode, a new npz file will be saved with a version number. An npz can be saved as a trk file (select "t" in response to save prompt). This will bundle together the current channel and feature of the npz along with a generated lineage file, which will contain label and frame information and empty parent/daughter entries for each cell. The new trk file can then be edited in DeepCell Label's trk mode to add relationship information.

_s_ - save

## Instructions for Running DeepCell Label in a Docker Container

In addition to having Docker, you will also need to have a VNC viewer to view the application inside the container.

To install one, you can go to http://realvnc.com to download a free VNC viewer.
[Direct Link to Download Page](https://www.realvnc.com/en/connect/download/viewer/)

### Build a Docker Container

```bash
git clone https://github.com/vanvalenlab/deepcell-label.git
cd deepcell-label
docker build -t deepcell-label .
```

### Run the New Docker Image

```bash
docker run \
-p 5900:5900 \
-v $PWD/desktop:/usr/src/app/desktop  \
--privileged \
deepcell-label:latest
```

This will launch a new Docker container and run Xvfb, Fluxbox, and a VNC server. To access the container’s display, point a VNC client to 127.0.0.1.

Inside the VNC client, one can access DeepCell Label through the terminal emulator. Start the terminal by right-clicking the desktop and selecting

```bash
Applications > Terminal Emulators > XTerm
```

Next, enter the following into the terminal and DeepCell Label will start:

```bash
cd desktop
python3 caliban.py [input file location]
```

To see an immediate example with a sample .trk file, you can run

```bash
cd desktop
python3 caliban.py examples/trackfile1.trk
```

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
