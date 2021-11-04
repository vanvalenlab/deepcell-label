# DeepCell Label: A Web Application for Data Curation

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=master)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=master)

DeepCell Label is a web-based data annotation tool based on Flask and can be run locally or deployed to the cloud (e.g. AWS Elastic Beanstalk).

For an up-to-date list of features, see the [Controls](#Controls) section.

## DeepCell Label for Developers

### Install Dependencies

Using a virtual environment to install dependencies is recommended.

```bash
pip install -r requirements.txt
```

### Run browser application in development mode

```bash
python3 application.py
```

### Use docker-compose for local development

Add your AWS credentials to `docker-compose.yaml` or set them via the environment.

From the root directory, run:

```bash
sudo docker-compose up --build -d
```

Wait a minute for the database to finish setting up before running:

```bash
sudo docker-compose restart app
```

You can now go to 0.0.0.0:5000 in a browser window to access the local version of the tool.

To interact with the local mysql database:

```bash
sudo docker exec -it browser_db_1 bash
mysql -p
```

When finished:

```bash
sudo docker-compose down
```

(optional)

```bash
sudo docker system prune --volumes
```

## Docker Compose for Local Data Viewing

DCL now supports a local deployment which can be used to browse data available locally on a remote server. To setup a local deployment:

1. Modify the `.env` file and add `REGISTRY_PATH=/data`
2. Comment out lines in `.env` and `fmd_config.cfg.example` that refer to sql databases

The local deployment currently can select files from one data folder at a time. The location of the data folder is specified with the env variable `DATA_DIR`.

3. Launch the deployment by running `DATA_DIR=path/to/data/for/viewing docker-compose -f docker-compose-viewer.yaml -d up`

The system can be accessed at `<your ip address>:3000/project` and finally shut down with `docker-compose down`.

## Structure of Browser Version

Flask is used as an HTTP server that serves the frames as pngs and metadata as JSON. The .js files in the `deepcell_label/template` folder are what makes the requests to the Flask server.

​Python Flask was used as a web application framework for constructing DeepCell Label. The Flask framework helps serves as the router that maps the specific URL with the associated function that is intended to perform some task. Specifically, the application.route decorator binds the URL rule to the function below it. Thus, if user performs actions that cause a change in the underlying data, the side-serving .js file will request to visits a specific URL, and the output of the function below the decorator will be rendered in the browser.

Functions depend on Python libraries -- including NumPy, Matplotlib, and scikit-image – to change the data within files. After the desired change has been made to the lineage information or mask annotation, the Flask app routing will update the interface to reflect the alterations with support from side-serving JavaScript scripts.

The final Flask application has been deployed to an AWS Elastic Beanstalk environment as a RESTful web service. A stable demo of the browser application can be accessed at label.deepcell.org. To deploy this application to AWS EB, an AWS RDS MySQL database must be set up and configured to handle data storage for application use. (Add database credentials to the .env configuration file.) Once a database is appropriately configured, the application can easily be launched by using the AWS EB command line tool or web interface. The .ebextensions folder will configure the web service to use the appropriate Flask application (eb_application.py, which uses a MySQL database instead of SQLite).

DeepCell Label can also be run locally using a SQLite database (this is the default behavior). When we start using DeepCell Label, DeepCell Label creates a project with a unique 12 character ID, and stores it locally in `/tmp/deepcell_label.db`. Whenever we edit the project, DeepCell Label updates the object in the database. Running application.py creates the database if it does not already exist.

## Layout

Label shows an Info Table on the left with project details and an interactive Canvas on the right that shows images and labels.

### Infopane

The infopane is a table with information about the project,

The first three rows in the table tell us the which slice in an image stack we are currently viewing

- **frame** tells which slice of an image stack we are viewing
  - Frames move through space (like a 3D vertical image stack) or
    through time (like a timelapse)
- **channel** tells us which raw image channel we are viewing
  - Channels may be different imaging modalities, like phase or fluorescence, or different markers, like nuclear or cytoplasm
- **feature** tells us which labeled features we are viewing
  - Features may be [FILL IN]

The next three rows tell us where the canvas is within the current frame.

- **zoom** tells us how much the frame is zoomed in
- **viewing (x)** the visible horizontal range
- **viewing (y)** the visible vertical range

These two rows tell us about visual settings

- **highlight** tells us whether the label we're painting with is highlighted in red
- **brush size** tells us the radius of the brush in pixels

The next two rows tell us about the label the mouse is hovering over

- **label** is the label number under the mouse
- **slices** is a list of the frames that the label is present in

The next two rows tell us which labels we can edit with the brush tool

- **painting with label** is the label the we brush adds to the canvas
- **painting over label** is the label the brush overwrites

The last two rows are about label editing actions

- **tool** tells us what action happens when we click on the canvas
  - See the [Tools](#Tools) section for more details
- **confirm action** is a prompt displayed before some actions
  - We can confirm the action with Enter, or cancel it with Esc. See the [Actions](#Actions) section for more details.

## Controls

_These controls are also found in the dropdown "instructions" pane while editing a file._

### Navigating the Canvas

Hover the mouse over a label to view the label info.

Press <kbd>+</kbd> or hold <kbd>Alt and scroll up</kbd> to zoom in.

Press <kbd>+</kbd> or hold <kbd>Alt and scroll down</kbd> to zoom out.

Hold <kbd>Space</kbd> and move the mouse on the canvas to pan around.

Press <kbd>D</kbd> or <kbd>→</kbd> to view the next frame.

Press <kbd>A</kbd> or <kbd>←</kbd> to view the previous frame.

Press <kbd>C</kbd> to view the next channel.

Press <kbd>Shift</kbd> + <kbd>C</kbd> to view the previous channel.

Press <kbd>F</kbd> to view the next feature.

Press <kbd>Shift</kbd> + <kbd>F</kbd> to view the previous feature.

### Adjusting the Canvas

DeepCell Label can adjust how to display labels and images.
With these changes, we can make out finer details while labeling.

Scroll on the canvas to change brightness.

Hold <kbd>Shift</kbd> and scroll on the canvas to change the contrast.

Press <kbd>0</kbd> (zero) to reset the brightness and contrast.

Press <kbd>Z</kbd> to toggle between viewing the label overlay, the labels only, and the raw image only.

Press <kbd>H</kbd> to toggle highlighting the brush label in red.

## Select Labels

We control which labels we cab edit by selecting them as
the <strong>foreground</strong> or the <strong>background</strong>.

When a label is the foreground, we can add more of that label,
while when a label is background, we can remove it.

You select "no label" as either the foreground,
which lets us remove existing labels, or the background,
which lets us labels over unlabeled areas.

We can select a label as the foreground in two ways:

<strong>Click</strong> on it while using the Select Tool

<strong><kbd>Shift</kbd> + Double Click</strong> while using any Tool.

We can select a label as the background in two ways:

<strong>Double Click</strong> on it while using the Select Tool.

<strong><kbd>Shift</kbd> + Click</strong> while using any Tool.

Double clicking also deselects other labels, instead making "no label" the other selected label.
This helps avoid having selected labels that you are no longer working on.

When you select an label that is already selected,
the foreground and background swap instead.

Use this as a shortcut when working on a pair of labels, like adjusting their boundary
so you can quickly work in both directions.

Here are some keyboard shortcuts to change the selected labels.

- Press <kbd>Esc</kbd> to reset the background to "no label".
- Press <kbd>N</kbd> to select a new, unused foreground label.
  - This will be a label that doesn't exist yet in the labeling. Once you add the new label, <kbd>N</kbd> will select a new, even higher label.
- Press <kbd>X</kbd> to swap the foreground and background. Remember that you can also swap them by selecting either label a second time with the mouse.
- Press <kbd>[</kbd> or <kbd>]</kbd> to cycle the foreground labels.
- Press <kbd>Shift</kbd> + <kbd>[</kbd> or <kbd>Shift</kbd> + <kbd>]</kbd> to cycle the background labels.

## Tools

Each tool lets us edit the labeling in a different way. To edit the labels with a tool, click on canvas while using the tool.

### Select Tool

Label starts with the Select tool by default, which selects the foreground and the background label.

Press <kbd>V</kbd> to use the Select tool.

<strong>Click</strong> on a label to select it as the foreground,

<strong>Double Click</strong> on a label to select it as the background.

You can also select labels while using <ital>any tool</ital> with
<strong><kbd>Shift</kbd> + Click</strong> to select the background, or <strong><kbd>Shift</kbd> + Double Click</strong> to select the foreground.

Double Click to select also deselects other labels.

### Brush Tool

The Brush tool paints the foreground label over the background label. Other labels are left unedited.

Press <kbd>B</kbd> to use the Brush tool.

<strong>Click + Drag</strong> to paint.

Press <kbd>&uarr;</kbd> to increase the brush size.
Press <kbd>&darr;</kbd> to decrease the brush size.

### Threshold Tool

The Threshold tool fills the brightest pixels within a bounding box with the foreground label. The tool only overwrites unlabeled area and does not edit any other labels.

Press <kbd>T</kbd> to use the Threshold tool.

<strong>Click + Drag</strong> on the canvas to draw a bounding box and threshold.

### Grow/Shrink Tool

The Grow/Shrink tool expands the foreground label by one pixel or contracts the background label by one pixel.

Press <kbd>Q</kbd> to use the Grow/Shrink tool.

<strong>Click</strong> on the foreground label to grow it.

<strong>Click</strong> on the background label to shrink it.

### Flood Tool

The Flood tool fills connected areas of label with another label.

Press <kbd>G</kbd> to use the Flood tool.

<strong>Click</strong> on the background label to flood it with the foreground label.

### Trim Tool

The Trim tool removes disconnected areas of the background label, leaving only the connected pixels behind.

Press <kbd>K</kbd> to use the Trim tool.

<strong>Click</strong> on the background label to trim it.

### Autofit Tool

The Autofit tool adjusts foreground label boundary to hug the nearest edges in the raw image. This tool helps to fix the boundaries of an existing label, but it can't add a new label from scratch.

Press <kbd>M</kbd> to use the Autofit tool.

<strong>Click</strong> on the foreground label to autofit it.

### Watershed Tool

The Watershed tool splits the foreground label into two. We can separate adjacent cells that mistakenly have the same label with Watershed.

Press the <kbd>W</kbd> to use the Watershed tool.

<strong>Click</strong> in the center of one cell, then <strong>Click</strong> in the center of another cell elsewhere in the same label to split them with Watershed.

### Tools with Select Shortcuts

Tools like Autofit or Flood can only edit selected labels.

To make these tools easier to use, clicking on an unselected label with these tools selects the label instead of doing an action. After clicking once to select, a second click on the same label always uses the tool and edits the labels.

The Grow/Shrink, Autofit, and Watershed tools makes unselect labels the foreground.

The Trim and Flood tools makes unselected labels the background.

## Actions

Actions edit labels with a keybind.
Actions need to be confirmed with Enter or cancelled with Escape.

Press <kbd>S</kbd> to swap the label foreground and background labels.
This action can only swap the labels on the current frame.

Press <kbd>R</kbd> to replace the background label with the foreground label.
Press <kbd>Shift</kbd> + <kbd>R</kbd> to replace the background label on all frames.

Press <kbd>O</kbd> to predict the labels based on the overlap with the previous frame.
Press <kbd>Shift</kbd> + <kbd>O</kbd> to predict the labels on all frames.
