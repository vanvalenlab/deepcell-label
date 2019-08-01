# Caliban: Data Curation Tools for DeepCell.

Caliban is a segmentation and tracking tool used for human-in-the-loop data curation. It displays lineage data along with raw and annotated images. The output files prepare this information as training data for DeepCell.

## Instructions for Running Caliban Locally on Desktop
```bash
git clone https://github.com/vanvalenlab/caliban.git
cd caliban
cd desktop
python3 caliban.py [input file location]
```

## Tools Guide
Files can be edited using keyboard operations.

**Navigation through Frames:**

*a or &larr;* - Back one frame  

*d or &rarr;* - Forward one frame


**Edit Operations:**

### In viewing mode:

*click* - click on a cell label to select it. Up to two cells can be selected at one time.

*r* - replace: relabel all instances of a selected cell label with a second selected cell label; replaces lineage data in a trk file

*c* - create: relabel selected cell with an unused label

*p* - parent: assign parent/daughter relationship to pair of selected cells in trk file

*p* - predict: predict zstack relationships in npz when no cells are selected

*s* - swap: swap labels and lineage information between two selected cells  

*x* - delete: remove selected cell mask in frame

*w* - watershed: call watershed transform to split one cell label into two


*esc* - cancel operation  
*space bar* - confirm operation
*s* - confirm operation in a single frame, when applicable

You can also use *esc* or click on the black background to return back to a state where no cells are selected.

### In edit mode:

Most keybinds are disabled in edit mode.

Edit mode focuses on using an adjustable brush to modify annotations on a pixel level, rather than using operations that apply to every instance of a label within a frame or set of frames. The brush tool will only make changes to the currently selected value. Ie, a brush set to edit cell 5 will only add or erase "5" to the annotated image. 

*-/=* increment value that brush is applying

*&larr; &rarr;* - change size of brush tool

*x* - toggle eraser mode


**Viewing Options:**

*h* - switch between highlighted mode and normal mode
          (once highlight mode is on, use *-/=* to decrement/increment selected cell label number)
   
    
*z* - switch between annotations and raw images

*f* - cycle between different annotations when no cells are selected

*c* - cycle between different channels when no cells are selected

*e* - toggle edit mode 

*scroll wheel* - change image or annotation contrast


**To Save:**

Once done, use the following key to save the changed file. 
The tool will also save the original file in the same folder.
In npz mode, a new npz file will be saved with a version number.

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

