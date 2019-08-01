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

To navigate through frames:  
Back one frame = a or &larr;  
Forward one frame = d or &rarr;  


**Edit Operations:**

***r*** - replace

***c*** - create

***p*** - parent

***s*** - swap  

***x*** - delete cell mask in frame

***w*** - watershed


***esc*** - cancel operation  
***space bar*** - confirm operation

You can also use *esc* or click on the black background to return back to a state where no cells are selected.



**Viewing Options:**

***h*** - switch between highlighted mode and normal mode
          (once highlight mode is on, use ***-/=*** to decrement/increment selected cell label number)
   
    
***z*** - switch between annotations and raw images  

***scroll wheel*** - change image contrast


**To Save:**

Once done, use the following key to save the changed file. 
The tool will also save the original file in the same folder.

***s*** - save


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

