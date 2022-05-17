"""
Converts data from the client into a ZIP to export from DeepCell Label.
"""

import io
import json
import zipfile

import numpy as np
import tifffile


class Export:
    def __init__(self, labels_zip):
        self.labels_zip = labels_zip
        self.export_zip = io.BytesIO()

        self.load_dimensions()
        self.load_labeled()
        self.load_raw()

        self.write_export_zip()
        self.export_zip.seek(0)

    def load_dimensions(self):
        """Loads dimensions of the raw and labeled arrays from dimensions.json."""
        zf = zipfile.ZipFile(self.labels_zip)
        with zf.open('dimensions.json') as f:
            dimensions = json.load(f)
            self.height = dimensions['height']
            self.width = dimensions['width']
            self.num_frames = dimensions['numFrames']
            self.num_channels = dimensions['numChannels']
            self.num_features = dimensions['numFeatures']

    def load_labeled(self):
        """Loads the labeled array from the labeled.dat file."""
        zf = zipfile.ZipFile(self.labels_zip)
        with zf.open('labeled.dat') as f:
            labeled = np.frombuffer(f.read(), np.int32)
            self.labeled = np.reshape(
                labeled, (self.num_features, self.num_frames, self.width, self.height)
            )

    def load_raw(self):
        """Loads the raw array from the raw.dat file."""
        zf = zipfile.ZipFile(self.labels_zip)
        with zf.open('raw.dat') as f:
            raw = np.frombuffer(f.read(), np.uint8)
            self.raw = np.reshape(
                raw, (self.num_channels, self.num_frames, self.width, self.height)
            )

    def write_export_zip(self):
        """Writes an export zip with OME TIFF files instead of raw.dat and labeled.dat."""
        # Rewrite all other files in input zip to export zip
        input_zf = zipfile.ZipFile(self.labels_zip)
        export_zf = zipfile.ZipFile(self.export_zip, 'w')
        for item in input_zf.infolist():
            if item.filename not in ['dimensions.json', 'labeled.dat', 'raw.dat']:
                buffer = input_zf.read(item.filename)
                export_zf.writestr(item, buffer)
        # Write OME TIFF for labeled
        labeled_ome_tiff = io.BytesIO()
        with tifffile.TiffWriter(labeled_ome_tiff, ome=True) as tif:
            tif.save(self.labeled, metadata={'axes': 'CZYX'})
            labeled_ome_tiff.seek(0)
        export_zf.writestr('y.ome.tiff', labeled_ome_tiff.read())
        # Write OME TIFF for raw
        raw_ome_tiff = io.BytesIO()
        with tifffile.TiffWriter(raw_ome_tiff, ome=True) as tif:
            tif.save(self.raw, metadata={'axes': 'CZYX'})
        raw_ome_tiff.seek(0)
        export_zf.writestr('X.ome.tiff', raw_ome_tiff.read())
