"""
Converts data from the client into a ZIP to export from DeepCell Label.
"""

import io
import itertools
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
        self.load_channels()
        self.load_cells()

        self.labeled, self.cells = rewrite_labeled(self.labeled, self.cells)

        self.write_export_zip()
        self.export_zip.seek(0)

    def load_dimensions(self):
        """Loads dimensions of the raw and labeled arrays from dimensions.json."""
        with zipfile.ZipFile(self.labels_zip) as zf:
            with zf.open('dimensions.json') as f:
                dimensions = json.load(f)
                self.height = dimensions['height']
                self.width = dimensions['width']
                self.duration = dimensions['duration']
                self.num_channels = dimensions['numChannels']
                self.num_features = dimensions['numFeatures']
                self.dtype = self.get_dtype(dimensions['dtype'])

    def get_dtype(self, arr_type):
        """Matches raw array dtype with a numpy dtype"""
        mapping = {
            'Uint8Array': np.uint8,
            'Uint16Array': np.uint16,
            'Uint32Array': np.uint32,
            'Int32Array': np.int32,
            'Float32Array': np.float32,
            'Float64Array': np.float64,
        }
        try:
            return mapping[arr_type]
        except KeyError:
            raise ValueError('Could not match dtype of raw array.')

    def load_labeled(self):
        """Loads the labeled array from the labeled.dat file."""
        with zipfile.ZipFile(self.labels_zip) as zf:
            with zf.open('labeled.dat') as f:
                labeled = np.frombuffer(f.read(), np.int32)
                self.labeled = np.reshape(
                    labeled,
                    (self.num_features, self.duration, self.height, self.width),
                )

    def load_raw(self):
        """Loads the raw array from the raw.dat file."""
        with zipfile.ZipFile(self.labels_zip) as zf:
            with zf.open('raw.dat') as f:
                raw = np.frombuffer(f.read(), self.dtype)
                self.raw = np.reshape(
                    raw, (self.num_channels, self.duration, self.height, self.width)
                )

    def load_channels(self):
        """Loads the channels array from channels.json"""
        with zipfile.ZipFile(self.labels_zip) as zf:
            with zf.open('channels.json') as f:
                self.channels = json.load(f)

    def load_cells(self):
        """Loads cell labels from cells.json."""
        with zipfile.ZipFile(self.labels_zip) as zf:
            with zf.open('cells.json') as f:
                self.cells = json.load(f)

    def write_export_zip(self):
        """Writes an export zip with OME TIFF files instead of raw.dat and labeled.dat."""
        # Rewrite all other files in input zip to export zip
        with zipfile.ZipFile(self.export_zip, 'w') as export_zf, zipfile.ZipFile(
            self.labels_zip
        ) as input_zf:
            for item in input_zf.infolist():
                # Writes all other files (divisions.json, spots.csv, etc.) to export zip
                if item.filename not in [
                    'dimensions.json',
                    'labeled.dat',
                    'raw.dat',
                    'cells.json',
                ]:
                    buffer = input_zf.read(item.filename)
                    export_zf.writestr(item, buffer)
            # Write updated cells
            export_zf.writestr('cells.json', json.dumps(self.cells))
            # Write OME TIFF for labeled
            labeled_ome_tiff = io.BytesIO()
            tifffile.imwrite(
                labeled_ome_tiff,
                self.labeled,
                ome=True,
                photometric='minisblack',
                compression='zlib',
                metadata={'axes': 'CZYX'},
            )
            labeled_ome_tiff.seek(0)
            export_zf.writestr('y.ome.tiff', labeled_ome_tiff.read())
            # Write OME TIFF for raw
            raw_ome_tiff = io.BytesIO()
            tifffile.imwrite(
                raw_ome_tiff,
                self.raw,
                ome=True,
                photometric='minisblack',
                compression='zlib',
                metadata={'axes': 'CZYX', 'Channel': {'Name': self.channels}},
            )
            raw_ome_tiff.seek(0)
            export_zf.writestr('X.ome.tiff', raw_ome_tiff.read())


def rewrite_labeled(labeled, cells):
    """
    Rewrites the labeled to use values from cell labels.

    Args:
        labeled: numpy array of shape (num_features, duration, height, width)
        cells: list of cells labels like { "cell": 1, "value": 1, "t": 0}

    Returns:
        (numpy array of shape (num_features, duration, height, width), cells with updated values)
    """
    new_labeled = np.zeros(labeled.shape, dtype=np.int32)
    (num_features, duration, height, width) = labeled.shape
    new_cells = []
    for c in range(num_features):
        cells_in_feature = list(filter(lambda cell, c=c: cell['c'] == c, cells))
        for t in range(duration):
            cells_at_t = list(
                filter(lambda cell, t=t: cell['t'] == t, cells_in_feature)
            )
            values = itertools.groupby(cells_at_t, lambda c: c['value'])
            overlap_values = []

            # Rewrite non-overlapping values with cells
            for value, group in values:
                group = list(group)
                if len(group) == 1:
                    cell = group[0]['cell']
                    frame = labeled[:, t, :, :]
                    new_labeled[:, t, :, :][frame == value] = cell
                    new_cells.append({'cell': cell, 'value': cell, 't': t, 'c': c})
                else:
                    overlap_values.append([value, group])

            # Rewrite overlapping values with values higher than all cells
            if len(cells_at_t) == 0:
                new_overlap_value = 0
            else:
                new_overlap_value = max(cells_at_t, key=lambda c: c['cell'])['cell'] + 1
            for overlap_value, overlap_cells in overlap_values:
                for cell in overlap_cells:
                    frame = labeled[:, t, :, :]
                    new_labeled[:, t, :, :][frame == overlap_value] = new_overlap_value
                    new_cells.append(
                        {
                            'cell': cell['cell'],
                            'value': new_overlap_value,
                            't': t,
                            'c': c,
                        }
                    )
                new_overlap_value += 1
    return new_labeled, new_cells
