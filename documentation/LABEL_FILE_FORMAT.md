# DeepCell Label File Format

## Supported input files

To create a project with DeepCell Label, POST a request to `label.deepcell.org/api/project` with the following form data:

- `images`: a URL that downloads
  - a .tiff
  - a .png
  - an .npz, or zipped numpy array
    - uses arrays named `X` for images and `y` for segmentation, otherwise uses the first array in the .npz
  - a .trk file, a legacy format from from [deepcell-tracking](https://github.com/vanvalenlab/deepcell-tracking)
- `axes` (optional): the dimension order of the images (e.g. `CZYX`)
- `labels` (optional): a URL that downloads a .trk or a zip containing
  - a single .npy numpy array
  - a single .tiff or
  - multiple .tiffs named with their feature and batch like `filename_batch_0_feature_0.tiff`
  - spots.csv with coordinates of spots
  - lineage.json, from the legacy .trk format from [deepcell-tracking](https://github.com/vanvalenlab/deepcell-tracking)

The backend will download these files and reformat them into a standardized .zip with the following contents.

## DeepCell Label .zip Contents

### X.ome.tiff

This is the image being labeled. It is a 4 dimensional uint8 image with dimension order CZYX and it is stored as an [OME-TIFF](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/).

### y.ome.tiff

This is the segmentation image. It is a 4 dimensional int32 image with dimension order CZYX and it is stored as an [OME-TIFF](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/).

Each pixel in the image may encode multiple cells. The cells.json describes how to map values to cells at each time (and soon in each channel as well). When exporting a project, the segmentation image is remade so

- values that do not appear in cells.json are removed from the image
- values that encode only one cell are replaced with the cell
- values that encode multiple cells are strictly higher than the largest cell

### cells.json

Contains a list of cell objects like `{ "value": 1, "cell": 1, "t": 1}`.

With the "t" field, values can be reassigned across times to different cells without editing the label image in y.ome.tiff. A "c" field should be added so that cells can be reassigned across both channels and times, and a "z" field may be added once 3D timelapses are implemented.

### divisions.json

Contains a list of division objects like `{"parent": 1, "daughters": [2, 3], "t": 1}`
Each division has a parent cell `parent`, a list of daughter cells `daughters`, and the time of the division `t`.
The time is the frame after the parent divides, or the first frame the daughters appear on
When creating a division by adding a daughter, the

### spots.csv

Contains the spots coordinates and cell assignments.

The first row is a header that says the first column is x coordinates, the second column is y coordinates, and all following columns are cell assignments for each feature.
Each other row is a spot, with the x coordinate, y coordinate, and cell assignments.

Currently, the cell assignments are ignored and instead determined from y.ome.tiff. Overlapping cells do not display properly with spots, and this may be a use case for the cell assignment columns.

## Edit and export zips

DeepCell Label can only create OME-TIFFs through its Python based server, not through the Javascript based client. Therefore, the zip files sent from the client to the server when editing or exporting data do not contain .ome.tiff files but rather a .dat file with the buffer for the image and an additional file edit.json (for editing) or dimensions.json (for exporting) with the dimensions of the buffer.

`dimensions.json` has properties

- `height`
- `width`
- `duration`
- `numChannels` (channels for X.ome.tiff)
- `numFeatures` (channels for y.ome.tiff).

`edit.json` has properties

- `height`
- `width`
- `action` (which editing function to use)
- `writeMode` ("overlap", "overwrite", or "exclude"
- `args` (the arguments to pass to the editing function)
