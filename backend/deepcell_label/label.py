"""Classes to view and edit DeepCell Label Projects"""
from __future__ import absolute_import, division, print_function

import io
import json
import zipfile

import numpy as np
import skimage
from skimage import filters
from skimage.exposure import rescale_intensity
from skimage.measure import regionprops
from skimage.morphology import dilation, disk, erosion, flood, square
from skimage.segmentation import morphological_chan_vese, watershed


class Edit(object):
    """
    Loads labeled data from a zip file,
    edits the labels according to edit.json in the zip,
    and writes the edited labels to a new zip file.

    The labels zipfile must contain:
        labeled.dat - a binary array buffer of the labeled data (int32)
        overlaps.json - a 2D json array describing values encode which cells
                        the (i, j)th element of overlaps.json is 1 if value i encodes cell j and 0 otherwise
        edit.json - a json object describing the edit to be made including
                    - action (e.g. )
                    - the args for the action
                    - write_mode: one of 'overlap', 'overwrite', or 'exclude'
                    - height: the height of the labeled (and raw) arrays
                    - width: the width of the labeled (and raw) arrays
    It additionally may contain:
        raw.dat - a binary array buffer of the raw data (uint8)
        lineage.json - a json object describing the lineage of the cells
    """

    def __init__(self, labels_zip):

        self.valid_modes = ['overlap', 'overwrite', 'exclude']
        self.raw_required = ['watershed', 'active_contour', 'threshold']

        self.load(labels_zip)
        self.dispatch_action()
        self.write_response_zip()

    @property
    def new_value(self):
        """Returns a value not in the segmentation."""
        if len(self.cells) == 0:
            return 1
        return max(map(lambda c: c['value'], self.cells)) + 1

    @property
    def new_cell(self):
        """Returns a cell not in the segmentation."""
        if len(self.cells) == 0:
            return 1
        return max(map(lambda c: c['cell'], self.cells)) + 1

    def load(self, labels_zip):
        """
        Load the project data to edit from a zip file.
        """
        if not zipfile.is_zipfile(labels_zip):
            raise ValueError('Attached labels.zip is not a zip file.')
        zf = zipfile.ZipFile(labels_zip)

        # Load edit args
        if 'edit.json' not in zf.namelist():
            raise ValueError('Attached labels.zip must contain edit.json.')
        with zf.open('edit.json') as f:
            edit = json.load(f)
            if 'action' not in edit:
                raise ValueError('No action specified in edit.json.')
            self.action = edit['action']
            self.height = edit['height']
            self.width = edit['width']
            self.args = edit.get('args', None)
            # TODO: specify write mode per cell?
            self.write_mode = edit.get('writeMode', 'overlap')
            if self.write_mode not in self.valid_modes:
                raise ValueError(
                    f'Invalid writeMode {self.write_mode} in edit.json. Choose from cell, overwrite, or exclude.'
                )

        # Load label array
        if 'labeled.dat' not in zf.namelist():
            raise ValueError('zip must contain labeled.dat.')
        with zf.open('labeled.dat') as f:
            labels = np.frombuffer(f.read(), np.int32)
            self.initial_labels = np.reshape(labels, (self.height, self.width))
            self.labels = self.initial_labels.copy()

        # Load cells array
        if 'cells.json' not in zf.namelist():
            raise ValueError('zip must contain cells.json.')
        with zf.open('cells.json') as f:
            self.cells = json.load(f)

        # Load raw image
        if 'raw.dat' in zf.namelist():
            with zf.open('raw.dat') as f:
                raw = np.frombuffer(f.read(), np.uint8)
                self.raw = np.reshape(raw, (self.width, self.height))
        elif self.action in self.raw_required:
            raise ValueError(
                f'Include raw array in raw.json to use action {self.action}.'
            )

    def write_response_zip(self):
        """Write edited segmentation to zip."""
        f = io.BytesIO()
        with zipfile.ZipFile(f, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('labeled.dat', self.labels.tobytes())
            # Remove cell labels that are not in the segmentation
            values = np.unique(self.labels)
            self.cells = list(filter(lambda c: c['value'] in values, self.cells))
            zf.writestr('cells.json', json.dumps(self.cells))
        f.seek(0)
        self.response_zip = f

    def get_cells(self, value):
        """
        Returns a list of cells encoded by the value
        """
        return list(
            map(lambda c: c['cell'], filter(lambda c: c['value'] == value, self.cells))
        )

    def get_values(self, cell):
        """
        Returns a list of values that encode a cell
        """
        return list(
            map(lambda c: c['value'], filter(lambda c: c['cell'] == cell, self.cells))
        )

    def get_value(self, cells):
        """
        Returns the value that encodes the list of cells
        """
        if cells == []:
            return 0
        values = set(map(lambda c: c['value'], self.cells))
        for cell in cells:
            values = values & set(self.get_values(cell))
        for value in values:
            if set(self.get_cells(value)) == set(cells):
                return value
        value = self.new_value
        for cell in cells:
            self.cells.append({'value': value, 'cell': cell})
        return value

    def get_mask(self, cell):
        """
        Returns a boolean mask of the cell (or the background when cell == 0)
        """
        if cell == 0:
            return self.labels == 0
        mask = np.zeros(self.labels.shape, dtype=bool)
        for value in self.get_values(cell):
            mask[self.labels == value] = True
        return mask

    def add_mask(self, mask, cell):
        self.labels = self.clean_labels(self.labels, self.cells)
        if self.write_mode == 'overwrite':
            self.labels[mask] = self.get_value([cell])
        elif self.write_mode == 'exclude':
            mask = mask & (self.labels == 0)
            self.labels[mask] = self.get_value([cell])
        else:  # self.write_mode == 'overlap'
            self.overlap_mask(mask, cell)

    def remove_mask(self, mask, cell):
        self.overlap_mask(mask, cell, remove=True)

    def overlap_mask(self, mask, cell, remove=False):
        """
        Adds the cell to the segmentation in the mask area,
        overlapping with existing cells.
        """
        # Rewrite values inside mask to encode label
        values = np.unique(self.labels[mask])
        for value in values:
            # Get value to encode new set of labels
            cells = self.get_cells(value)
            if remove:
                if cell in cells:
                    cells.remove(cell)
            else:
                cells.append(cell)
            new_value = self.get_value(cells)
            self.labels[mask & (self.labels == value)] = new_value

    def clean_cell(self, cell):
        """Ensures that a cell is a positive integer"""
        return int(max(0, cell))

    def clean_labels(self, labeled, cells):
        """
        Ensures that labels do not include any values that do not correspond
           to cells (eg. for deleted cells.)

        Args:
            labeled: numpy array of shape (height, width)
            cells: list of cells labels like { "cell": 1, "value": 1, "t": 0}

        Returns:
            (numpy array of shape (height, width), cells with updated values)
        """
        values = [cell['value'] for cell in cells]  # get list of values
        deleted_mask = np.isin(labeled, values, invert=True)
        labeled[deleted_mask] = 0  # delete any labels not in values
        return labeled

    def dispatch_action(self):
        """
        Call an action method based on an action type.

        Args:
            action (str): name of action method after "action_"
                          e.g. "draw" to call "action_draw"
            info (dict): key value pairs with arguments for action
        """
        attr_name = 'action_{}'.format(self.action)
        try:
            action_fn = getattr(self, attr_name)
        except AttributeError:
            raise ValueError('Invalid action "{}"'.format(self.action))
        action_fn(**self.args)

    def action_draw(self, trace, brush_size, cell, erase=False):
        """
        Use a "brush" to draw in the brush value along trace locations of
        the annotated data.

        Args:
            trace (list): list of (x, y) coordinates where the brush has painted
            brush_size (int): radius of the brush in pixels
            cell (int): cell to edit with the brush
            erase (bool): whether to add or remove label from brush stroke area
        """
        trace = json.loads(trace)
        # Create mask for brush stroke
        brush_mask = np.zeros(self.labels.shape, dtype=bool)
        for loc in trace:
            x = loc[0]
            y = loc[1]
            disk = skimage.draw.disk((y, x), brush_size, shape=self.labels.shape)
            brush_mask[disk] = True

        if erase:
            self.remove_mask(brush_mask, cell)
        else:
            self.add_mask(brush_mask, cell)

    def action_trim_pixels(self, cell, x, y):
        """
        Removes parts of cell not connected to (x, y).

        Args:
            cell (int): cell to trim
            x (int): x position of seed
            y (int): y position of seed
        """
        mask = self.get_mask(cell)
        if mask[y, x]:
            connected_mask = flood(mask, (y, x))
            self.remove_mask(~connected_mask, cell)

    # TODO: come back to flooding with overlaps...
    def action_flood(self, foreground, background, x, y):
        """
        Floods the connected component of the background label at (x, y) with the foreground label.
        When the background label is 0, does not flood diagonally connected pixels.

        Args:
            foreground (int): label to flood with
            bacgkround (int): label to flood
            x (int): x coordinate of region to flood
            y (int): y coordinate of region to flood
        """
        mask = self.get_mask(background)
        flooded = flood(mask, (y, x), connectivity=2 if background != 0 else 1)
        self.add_mask(flooded, foreground)

    def action_watershed(self, cell, new_cell, x1, y1, x2, y2):
        """Use watershed to segment different objects"""
        # Create markers for to seed watershed labels
        markers = np.zeros(self.labels.shape)
        markers[y1, x1] = cell
        markers[y2, x2] = new_cell

        # Cut images to cell bounding box
        mask = self.get_mask(cell)
        props = regionprops(mask.astype(np.uint8))
        top, left, bottom, right = props[0].bbox
        raw = np.copy(self.raw[top:bottom, left:right])
        markers = np.copy(markers[top:bottom, left:right])
        mask = np.copy(mask[top:bottom, left:right])

        # Contrast adjust and invert the raw image
        raw = -rescale_intensity(raw)
        # Apply watershed
        results = watershed(raw, markers, mask=mask)

        # Dilate small cells to prevent "dimmer" cell from being eroded by the "brighter" cell
        if np.sum(results == new_cell) < 5:
            dilated = dilation(results == new_cell, disk(3))
            results[dilated] = new_cell
        if np.sum(results == cell) < 5:
            dilated = dilation(results == cell, disk(3))
            results[dilated] = cell

        # Update cells where watershed changed cell
        new_cell_mask = np.zeros(self.labels.shape, dtype=bool)
        cell_mask = np.zeros(self.labels.shape, dtype=bool)
        new_cell_mask[top:bottom, left:right] = results == new_cell
        cell_mask[top:bottom, left:right] = results == cell
        self.remove_mask(self.get_mask(cell), cell)
        self.add_mask(cell_mask, cell)
        self.add_mask(new_cell_mask, new_cell)

    def action_threshold(self, y1, x1, y2, x2, cell):
        """
        Threshold the raw image for annotation prediction within the
        user-determined bounding box.

        Args:
            y1 (int): first y coordinate to bound threshold area
            x1 (int): first x coordinate to bound threshold area
            y2 (int): second y coordinate to bound threshold area
            x2 (int): second x coordinate to bound threshold area
            cell (int): cell drawn in threshold area
        """
        cell = self.clean_cell(cell)
        # Make bounding box from coordinates
        top = min(y1, y2)
        bottom = max(y1, y2) + 1
        left = min(x1, x2)
        right = max(x1, x2) + 1
        image = self.raw[top:bottom, left:right].astype('float64')
        # Hysteresis thresholding strategy needs two thresholds
        # triangle threshold picked after trying a few on one dataset
        # it may not be the best approach for other datasets!
        low = filters.threshold_triangle(image=image)
        high = 1.10 * low
        # Limit stray pixelst
        thresholded = filters.apply_hysteresis_threshold(image, low, high)
        mask = np.zeros(self.labels.shape, dtype=bool)
        mask[top:bottom, left:right] = thresholded
        self.add_mask(mask, cell)

    def action_active_contour(self, cell, min_pixels=20, iterations=100, dilate=0):
        """
        Uses active contouring to reshape a cell to match the raw image.
        """
        mask = self.get_mask(cell)
        # Limit contouring to a bounding box twice the size of the cell
        props = regionprops(mask.astype(np.uint8))[0]
        top, left, bottom, right = props.bbox
        cell_height = bottom - top
        cell_width = right - left
        # Double size of bounding box
        height, width = self.labels.shape
        top = max(0, top - height // 2)
        bottom = min(height, bottom + cell_height // 2)
        left = max(0, left - width // 2)
        right = min(width, right + cell_width // 2)

        # Contour the cell
        init_level_set = mask[top:bottom, left:right]
        # Normalize to range [0., 1.]
        _vmin, _vmax = self.raw.min(), self.raw.max()
        if _vmin == _vmax:
            image = np.zeros_like(self.raw)
        else:
            image = self.raw.copy()
            image -= _vmin
            image = image / (_vmax - _vmin)
        image = image[top:bottom, left:right]
        contoured = morphological_chan_vese(
            image, iterations, init_level_set=init_level_set
        )

        # Dilate to adjust for tight fit
        contoured = dilation(contoured, disk(dilate))

        # Keep only the largest connected component
        regions = skimage.measure.label(contoured)
        if np.any(regions):
            largest_component = regions == (
                np.argmax(np.bincount(regions.flat)[1:]) + 1
            )
            mask = np.zeros(self.labels.shape, dtype=bool)
            mask[top:bottom, left:right] = largest_component

        # Throw away small contoured cells
        if np.count_nonzero(mask) >= min_pixels:
            self.remove_mask(~mask, cell)
            self.add_mask(mask, cell)

    def action_erode(self, cell):
        """
        Shrink the selected cell.
        """
        mask = self.get_mask(cell)
        eroded = erosion(mask, square(3))
        self.remove_mask(mask & ~eroded, cell)

    def action_dilate(self, cell):
        """
        Expand the selected cell.
        """
        mask = self.get_mask(cell)
        dilated = dilation(mask, square(3))
        self.add_mask(dilated, cell)
