"""Classes to view and edit DeepCell Label Projects"""
from __future__ import absolute_import, division, print_function

import jsonpatch
import numpy as np
import skimage
from matplotlib.colors import Normalize
from scipy.ndimage import find_objects
from skimage import filters
from skimage.exposure import rescale_intensity
from skimage.measure import regionprops
from skimage.morphology import dilation, disk, erosion, flood, square
from skimage.segmentation import morphological_chan_vese, watershed


def make_segments(labels):
    """
    Returns a list of the segments in a label image.
    """
    objects = find_objects(labels)
    segments = {
        (i + 1): {
            # Does not contain
            # image coordinates (t, z, c); could be added server side or client side
            # id: likely added on client side
            'x': obj[1].start,
            'y': obj[0].start,
            'width': obj[1].stop - obj[1].start,
            'height': obj[0].stop - obj[0].start,
        }
        for i, obj in enumerate(objects)
        if obj is not None
    }
    return segments


class Edit(object):
    """
    Class for editing label images in DeepCell Label.
    Expected lifespan is a single action.

    Actions have three phases:
        1. select and edit the image currently on display
        3. make changes to the label metadata
        4. assign the image to the frame

    NOTE: Actions must directly assign changes to the frame attribute for the
    MutableNdarray class to detect the change and for the database to persist the change.
    Changes to a view of a MutableNdarray will not be detected by the original
    TODO: modify MutableNdarray class to share changed() signals from arrays view
    """

    def __init__(self, labels, raw=None, overlaps=None, write_mode='overlap'):
        self.initial_labels = labels.copy()
        self.labels = labels
        self.raw = raw

        self.overlaps = overlaps
        self.new_value = self.overlaps.shape[0]
        self.new_label = self.overlaps.shape[1]

        self.write_mode = write_mode

    @property
    def patch(self):
        initial = make_segments(self.initial_labels)
        final = make_segments(self.labels)
        patch = jsonpatch.make_patch(initial, final)
        return patch.patch

    def add_label(self, label):
        if label == self.new_label:
            # TODO: error handling if new label is too large (or negative or 0 or non integer)
            new_column = np.zeros((self.overlaps.shape[0], 1))
            self.overlaps = np.append(self.overlaps, new_column, axis=1)

    def get_value(self, labels):
        """
        Returns the value that encodes the vector of labels
        """
        matchingValues = np.where(np.all(labels == self.overlaps, axis=1))[0]
        if matchingValues.size == 0:  # No matching value
            new_value = self.new_value
            self.new_value += 1
            self.overlaps = np.append(
                self.overlaps, np.expand_dims(labels, axis=0), axis=0
            )
            return new_value
        else:
            return matchingValues[0]

    def get_mask(self, label):
        """
        Returns a boolean mask of the label.
        """
        if label == 0:
            return self.labels == 0
        mask = np.zeros(self.labels.shape, dtype=bool)
        for value, encodes_label in enumerate(self.overlaps[:, label]):
            if encodes_label:
                mask[self.labels == value] = True
        return mask

    def add_mask(self, mask, label):
        if self.write_mode == 'overwrite':
            if np.any(mask):
                self.add_label(label)
            labels = np.zeros(self.overlaps.shape[1])
            labels[label] = True
            self.labels[mask] = self.get_value(labels)
        elif self.write_mode == 'exclude':
            mask = mask & (self.labels == 0)
            if np.any(mask):
                self.add_label(label)
            labels = np.zeros(self.overlaps.shape[1])
            labels[label] = True
            self.labels[mask] = self.get_value(labels)
        else:  # self.write_mode == 'overlap'
            self.overlap_mask(mask, label)

    def remove_mask(self, mask, label):
        self.overlap_mask(mask, label, remove=True)

    def overlap_mask(self, mask, label, remove=False):
        """
        Adds the label to the label image in the mask area,
        overlapping with existing labels.
        """
        if np.any(mask):
            self.add_label(label)
        # Rewrite values inside mask to encode label
        values = np.unique(self.labels[mask])
        for value in values:
            # Get value to encode new set of labels
            labels = np.copy(self.overlaps[value])
            labels[label] = not remove
            new_value = self.get_value(labels)
            self.labels[mask & (self.labels == value)] = new_value

    def clean_label(self, label):
        """Ensures that a label is a valid integer between 0 and an unused label"""
        return int(min(self.new_label, max(0, label)))

    def dispatch_action(self, action, info):
        """
        Call an action method based on an action type.

        Args:
            action (str): name of action method after "action_"
                          e.g. "handle_draw" to call "action_handle_draw"
            info (dict): key value pairs with arguments for action
        """
        attr_name = 'action_{}'.format(action)
        try:
            action_fn = getattr(self, attr_name)
            action_fn(**info)
        except AttributeError:
            raise ValueError('Invalid action "{}"'.format(action))

    def action_replace(self, a, b):
        """
        Replaces b with a in the current frame.
        """
        a = self.clean_label(a)
        b = self.clean_label(b)

        for value in np.unique(self.labels):
            labels = self.overlaps[value]
            if labels[b] == 1:
                new_labels = np.copy(labels)
                new_labels[b] = 0
                new_labels[a] = 1 if a != 0 else 0
                new_value = self.get_value(new_labels)
                self.labels[self.labels == value] = new_value

    def action_draw(self, trace, brush_size, label, erase=False):
        """
        Use a "brush" to draw in the brush value along trace locations of
        the annotated data.

        Args:
            trace (list): list of (x, y) coordinates where the brush has painted
            brush_size (int): radius of the brush in pixels
            label (int): label to edit with the brush
            erase (bool): whether to add or remove label from brush stroke area
        """

        # TODO: handle new labels (add column to overlaps)
        # TODO: switch between overwriting, overlapping, and excluding
        # overwrite: replace labels with label
        # exclude: prevent drawing over labels with label
        # overlap: keep both labels when drawing over labels
        # currently always uses over
        # TODO: specify behavior per label?

        # Create mask for brush stroke
        brush_mask = np.zeros(self.labels.shape, dtype=bool)
        for loc in trace:
            x = loc[0]
            y = loc[1]
            disk = skimage.draw.disk((y, x), brush_size, shape=self.labels.shape)
            brush_mask[disk] = True

        if erase:
            self.remove_mask(brush_mask, label)
        else:
            self.add_mask(brush_mask, label)

    def action_trim_pixels(self, label, x, y):
        """
        Removes label area that are not connected to (x, y).

        Args:
            label (int): label to trim
            x (int): x position of seed
                              remove label that is not connect to this seed
            y (int): y position of seed
        """
        seed_value = self.labels[y, x]
        if self.overlaps[seed_value][label]:
            label_mask = self.get_mask(label)
            connected_label_mask = flood(label_mask, (y, x))
            self.remove_mask(~connected_label_mask, label)

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
        if background == 0:
            mask = self.get_mask(background)
            # Lower connectivity helps prevent flooding whole image
            flooded = flood(mask, (y, x), connectivity=1)
            self.add_mask(flooded, foreground)
        else:
            mask = self.get_mask(background)
            flooded = flood(mask, (y, x), connectivity=2) & mask
            self.remove_mask(flooded, background)
            self.add_mask(flooded, foreground)

    def action_watershed(self, label, x1, y1, x2, y2):
        """Use watershed to segment different objects"""
        new_label = self.new_label
        # Create markers for to seed watershed labels
        markers = np.zeros(self.labels.shape)
        markers[y1, x1] = label
        markers[y2, x2] = new_label

        # Cut images to label bounding box
        mask = self.get_mask(label)
        props = regionprops(mask.astype(np.uint8))
        top, left, bottom, right = props[0].bbox
        raw = np.copy(self.raw[top:bottom, left:right])
        markers = np.copy(markers[top:bottom, left:right])
        mask = np.copy(mask[top:bottom, left:right])

        # Contrast adjust and invert the raw image
        raw = -rescale_intensity(raw)
        # Apply watershed
        results = watershed(raw, markers, mask=mask)

        # Dilate small labels to prevent "dimmer" label from being eroded by the "brighter" label
        if np.sum(results == new_label) < 5:
            dilated = dilation(results == new_label, disk(3))
            results[dilated] = new_label
        if np.sum(results == label) < 5:
            dilated = dilation(results == label, disk(3))
            results[dilated] = label

        # Update labels where watershed changed label
        new_label_mask = np.zeros(self.labels.shape, dtype=bool)
        label_mask = np.zeros(self.labels.shape, dtype=bool)
        new_label_mask[top:bottom, left:right] = results == new_label
        label_mask[top:bottom, left:right] = results == label
        self.remove_mask(self.get_mask(label), label)
        self.add_mask(label_mask, label)
        self.add_mask(new_label_mask, new_label)

    def action_threshold(self, y1, x1, y2, x2, label):
        """
        Threshold the raw image for annotation prediction within the
        user-determined bounding box.

        Args:
            y1 (int): first y coordinate to bound threshold area
            x1 (int): first x coordinate to bound threshold area
            y2 (int): second y coordinate to bound threshold area
            x2 (int): second x coordinate to bound threshold area
            label (int): label drawn in threshold area
        """
        label = self.clean_label(label)
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
        self.add_mask(mask, label)

    def action_active_contour(self, label, min_pixels=20, iterations=100, dilate=0):
        """
        Uses active contouring to reshape a label to match the raw image.
        """
        mask = self.get_mask(label)
        # Limit contouring to a bounding box twice the size of the label
        props = regionprops(mask.astype(np.uint8))[0]
        top, left, bottom, right = props.bbox
        height = bottom - top
        width = right - left
        # Double size of bounding box
        labels_height, labels_width = self.labels.shape
        top = max(0, top - height // 2)
        bottom = min(labels_height, bottom + height // 2)
        left = max(0, left - width // 2)
        right = min(labels_width, right + width // 2)

        # Contour the label
        init_level_set = mask[top:bottom, left:right]
        image = Normalize()(self.raw)[top:bottom, left:right]
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

        # Throw away small contoured labels
        if np.count_nonzero(mask) >= min_pixels:
            self.remove_mask(~mask, label)
            self.add_mask(mask, label)

    def action_erode(self, label):
        """
        Shrink the selected label.
        """
        mask = self.get_mask(label)
        eroded = erosion(mask, square(3))
        self.remove_mask(mask & ~eroded, label)

    def action_dilate(self, label):
        """
        Expand the selected label.
        """
        mask = self.get_mask(label)
        dilated = dilation(mask, square(3))
        self.add_mask(dilated, label)
