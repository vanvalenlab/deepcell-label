# Caliban: Data Curation Tools for DeepCell.
[![Actions Status](https://github.com/vanvalenlab/caliban/workflows/browser/badge.svg)](https://github.com/vanvalenlab/caliban/actions)

Caliban is a segmentation and tracking tool used for human-in-the-loop data curation. It displays lineage data along with raw and annotated images. The output files prepare this information as training data for DeepCell.

## Instructions for Running Caliban Locally on Desktop
```bash
git clone https://github.com/vanvalenlab/caliban.git
cd caliban
cd desktop
python3 caliban.py [input file location]
```

**Accepted file types:**
Caliban can open .trk files or .npz files. .npz files must contain two zipped files corresponding to raw images and annotated images. If the files are not named 'raw' and 'annotated' or 'X' and 'y', the first file in the .npz will be opened as the raw images. Raw and annotated images must both be in 4D arrays in the shape (frames, y, x, channels or features).

## Tools Guide
Files can be edited using keyboard operations.

### Navigation through Frames:

*a or &larr;* - Back one frame  

*d or &rarr;* - Forward one frame


### Edit Operations:

Caliban's default setting allows operations to be carried out quickly and easily on existing segmentations. The actions that can modify cell labels and/or lineage information are:

*click* - click on a cell label to select it. Up to two labels can be selected at one time.

*shift + click* - trim stray pixels away from selected part of label

*ctrl + click* - flood selected part of label with a new, unused label

*c* - create: relabel selected label with a new, unused label

*f* - fill: select label, press "f", then follow prompt to fill a hole in the selected label

*r* - replace: relabel all instances of a selected cell label with a second selected cell label; replaces lineage data in a trk file

*r* - relabel: sequentially relabel all labels in frame, starting from 1, when no labels are selected (npz only)

*p* - parent: assign parent/daughter relationship to pair of selected labels in trk file

*p* - predict: predict zstack relationships in npz when no labels are selected

*s* - swap: swap labels and lineage information between two selected labels  

*x* - delete: remove selected cell mask in frame

*w* - watershed: call watershed transform to split one cell label into two


*esc* - cancel operation  
*space bar* - confirm operation  
*s* - confirm operation in a single frame, when applicable

You can use *esc* to return back to a state where no labels are selected.

**In annotation (pixel editing) mode:**

Keybinds in pixel editing mode are different from those in the label-editing mode.

Annotation mode focuses on using an adjustable brush to modify annotations on a pixel level, rather than using operations that apply to every instance of a label within a frame or set of frames. The brush tool will only make changes to the currently selected value. Ie, a brush set to edit label 5 will only add or erase "5" to the annotated image.

*[ (left bracket) / ] (right bracket)* - decrement/increment value that brush is applying

*&darr; &uarr;* - change size of brush tool

*x* - toggle eraser mode

*n* - change brush label to an unusued label, so that a new label can be created with a unique id. Can be used with conversion brush to overwrite existing label with unused label (follow conversion brush prompt).

*p* - color picker (click on a label to change the brush value to it)

*r* - turn on "conversion brush" setting, which changes brush behavior so that one label value is overwritten with another label value. No other labels are affected, and conversion brush will not draw on background. After turning on conversion brush, click on cell labels as prompted to set brush values.

*t* - threshold to predict annotations based on brightness. After turning this on, click and drag to draw a bounding box around the cell you wish to threshold. Make sure to include some background in the bounding box for accurate threshold predictions. Whatever was thresholded as foreground within the bounding box will be added to the annotation as a new cell with unique label.


### Viewing Options:

*F11* - toggle fullscreen

*-/= or ctrl + scroll wheel* - change level of zoom

**To pan in image:** Hold down the spacebar while clicking and dragging image to pan. Alternatively, the keys *home, page up, page down, and end* can be used to jump across the screen. Holding the shift key while using these pan buttons will result in a smaller jump; holding the control key will snap to the edge of the image.

*h* - switch between highlighted mode and non-highlighted mode (highlight exists in label- and pixel-editing modes but is displayed differently; label-editing highlighting recolors solid label with red, pixel-editing highlighting adds white or red outline around label in image). Once highlight mode is on, use *[ (left bracket) / ] (right bracket)* to decrement/increment selected cell label number.

*shift+h* - switch between showing and hiding annotation masks in the pixel editor

*z* - switch between annotations and raw images (outside of pixel editor)

*i* - invert greyscale raw image (viewing raw image or in pixel editor)

*k* - apply sobel filter to raw image (viewing raw image or in pixel editor)

*j* - apply adaptive histogram equalization to raw image (viewing raw image or in pixel editor)

*v* - switch between showing and hiding cursor

*f* - cycle between different annotations when no labels are selected (label-editing mode)

*c* - cycle between different channels when no labels are selected (label-editing mode)

*shift + &darr; / &uarr;* - cycle between colormaps for viewing raw images (does not apply to pixel editor)

*e* - toggle annotation mode between pixel-editing and whole-label-editing (when nothing else selected)

*scroll wheel* - change image or annotation maximum brightness

*shift + scroll wheel* - change image minimum brightness


### To Save:

Once done, use the following key to save the changed file.
The tool will also save the original file in the same folder.
In npz mode, a new npz file will be saved with a version number. An npz can be saved as a trk file (select "t" in response to save prompt). This will bundle together the current channel and feature of the npz along with a generated lineage file, which will contain label and frame information and empty parent/daughter entries for each cell. The new trk file can then be edited in Caliban's trk mode to add relationship information.

*s* - save


## Instructions for Running Caliban in a Docker Container

In addition to having Docker, you will also need to have a VNC viewer to view the application inside the container.

To install one, you can go to http://realvnc.com to download a free VNC viewer.
[Direct Link to Download Page](https://www.realvnc.com/en/connect/download/viewer/)

### Build a Docker Container

```bash
git clone https://github.com/vanvalenlab/caliban.git
cd caliban
docker build -t caliban .
```
### Run the New Docker Image

```bash
docker run \
-p 5900:5900 \
-v $PWD/desktop:/usr/src/app/desktop  \
--privileged \
caliban:latest
```
This will launch a new Docker container and run Xvfb, Fluxbox, and a VNC server. To access the container’s display, point a VNC client to 127.0.0.1.

Inside the VNC client, one can access Caliban through the terminal emulator. Start the terminal by right-clicking the desktop and selecting

```bash
Applications > Terminal Emulators > XTerm
```
Next, enter the following into the terminal and Caliban will start:

```bash
cd desktop
python3 caliban.py [input file location]
```

To see an immediate example with a sample .trk file, you can run

```bash
cd desktop
python3 caliban.py examples/trackfile1.trk
```
