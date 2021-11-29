"""Classes to view and edit DeepCell Label Projects"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import io
import json
from math import inf
import sys
import tarfile
import tempfile

import numpy as np
from matplotlib.colors import Normalize
from skimage import filters
from skimage.morphology import flood_fill, flood
from skimage.morphology import watershed, dilation, disk, square, closing, erosion
from skimage.draw import circle
from skimage.exposure import rescale_intensity
from skimage.measure import regionprops
from skimage.segmentation import morphological_chan_vese
from scipy.ndimage import find_objects

from deepcell_label.labelmaker import LabelInfoMaker


class Edit(object):
    """
    Class for editing label images in DeepCell Label.
    Expected lifespan is a single action.

    Actions have three phases:
        1. select and edit the image currently on display
        3. make changes to the label metadata
        4. assign the image to the frame

    NOTE: Actions must directly assign changes to the frame attribute
    for the MutableNdarray class to detect the change and for the database to persist the change.
    Changes to a view of a MutableNdarray will not be detected by the original
    TODO: modify MutableNdarray class to share changed() signals from arrays view
    """

    def __init__(self, project):
        self.project = project
        self.labels = project.labels
        self.frame_id = project.frame
        self.feature = project.feature
        self.channel = project.channel

        self.y_changed = False
        self.labels_changed = False

    @property
    def tracks(self):
        return self.labels.cell_info[self.feature]

    @property
    def frame(self):
        """
        Returns:
            ndarray: the current label frame
        """
        return self.project.label_frames[self.frame_id].frame

    @property
    def raw_frame(self):
        """
        Returns:
            ndarray: the current raw frame
        """
        return self.project.raw_frames[self.frame_id].frame

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

    def add_cell_info(self, add_label, frame):
        """Add a cell to a frame in the cell_info."""
        # if cell already exists elsewhere in trk:
        add_label = int(add_label)
        try:
            old_frames = self.tracks[add_label]['frames']
            updated_frames = np.append(old_frames, frame)
            updated_frames = np.unique(updated_frames).tolist()
            self.tracks[add_label]['frames'] = updated_frames
        # cell does not exist anywhere in trk:
        except KeyError:
            self.tracks[add_label] = {
                'label': add_label,
                'frames': [frame],
                'daughters': [],
                'frame_div': None,
                'parent': None,
                'capped': False,
            }
            ids = np.append(self.labels.cell_ids[self.feature], add_label)
            self.labels.cell_ids[self.feature] = ids

        self.y_changed = self.labels_changed = True

    def del_cell_info(self, del_label, frame):
        """Remove a cell from a frame in the cell_info."""
        # remove cell from frame
        track = self.tracks[del_label]
        track['frames'] = [i for i in track['frames'] if i != frame]

        # if that was the last frame, delete the entry for that cell
        if track['frames'] == []:
            del self.tracks[del_label]

            # also remove from list of cell_ids
            ids = self.labels.cell_ids[self.feature]
            self.labels.cell_ids[self.feature] = np.delete(
                ids, np.where(ids == np.int64(del_label))
            )

            # If deleting lineage data, remove parent/daughter entries
            for _, track in self.tracks.items():
                try:
                    track['daughters'].remove(del_label)
                    if track['daughters'] == []:
                        track['frame_div'] = None
                        track['capped'] = False
                except ValueError:
                    pass
                if track['parent'] == del_label:
                    track['parent'] = None

        self.y_changed = self.labels_changed = True

    def action_swap_single_frame(self, label_1, label_2):
        """
        Swap labels of two objects in one frame.

        Args:
            label_1 (int): first label to swap
            label_2 (int): second label to swap
        """
        if label_1 is -inf:
            label_1 = 0
        if label_2 is -inf:
            label_2 = 0

        img = self.frame[..., self.feature]
        label_1_present = label_1 in img
        label_2_present = label_2 in img

        img = np.where(img == label_1, -1, img)
        img = np.where(img == label_2, label_1, img)
        img = np.where(img == -1, label_2, img)

        if label_1_present != label_2_present:
            if label_1_present:
                self.add_cell_info(label_2, self.frame_id)
                self.del_cell_info(label_1, self.frame_id)
            else:
                self.add_cell_info(label_1, self.frame_id)
                self.del_cell_info(label_2, self.frame_id)

        # TODO: does info change?
        self.y_changed = self.labels_changed = True
        self.frame[..., self.feature] = img

    def action_replace_single(self, label_1, label_2):
        """
        Replaces label_2 with label_1 in the current frame.
        """
        if label_1 is -inf:
            label_1 = 0

        img = self.frame[..., self.feature]
        label_2_present = np.any(np.isin(label_2, img))

        img = np.where(img == label_2, label_1, img)

        # Img only changes when label_2 is in the frame
        if label_2_present:
            if label_1 != 0:
                self.add_cell_info(add_label=label_1, frame=self.frame_id)
            if label_2 != 0:
                self.del_cell_info(del_label=label_2, frame=self.frame_id)
            self.y_changed = True

        self.frame[..., self.feature] = img

    def action_handle_draw(self, trace, foreground, background, brush_size):
        """
        Use a "brush" to draw in the brush value along trace locations of
        the annotated data.
        Updates cell info if a change is detected.

        Args:
            trace (list): list of (x, y) coordinates where the brush has painted
            foreground (int): label written by the bush
            background (int): label overwritten by the brush
            brush_size (int): radius of the brush in pixels
        """
        if foreground is -inf:
            foreground = 0

        img = np.copy(self.frame[..., self.feature])
        foreground_in_before = np.any(np.isin(img, foreground))
        background_in_before = np.any(np.isin(img, background))
        # only overwrite the background image
        img_replaced = np.where(img == background, foreground, img)

        for loc in trace:
            x_loc = loc[0]
            y_loc = loc[1]
            brush_area = circle(y_loc, x_loc, brush_size,
                                (self.project.height, self.project.width))
            img[brush_area] = img_replaced[brush_area]

        foreground_in_after = np.any(np.isin(img, foreground))
        background_in_after = np.any(np.isin(img, background))

        foreground_added = not foreground_in_before and foreground_in_after and foreground != 0
        background_deleted = background_in_before and not background_in_after and background != 0

        # cell deletion
        if background_deleted:
            self.del_cell_info(del_label=background, frame=self.frame_id)

        # cell addition
        elif foreground_added:
            self.add_cell_info(add_label=foreground, frame=self.frame_id)

        # check for image change, in case pixels changed but no new or del cell
        comparison = np.where(img != self.frame[..., self.feature])
        self.y_changed = np.any(comparison)
        # if label metadata changed, labels_changed set to true with info helper functions

        self.frame[..., self.feature] = img

    def action_trim_pixels(self, label, x_location, y_location):
        """
        Remove any pixels with value label that are not connected to the
        selected cell in the given frame.

        Args:
            label (int): label to trim
            x_location (int): x position of seed
                              remove label that is not connect to this seed
            y_location (int): y position of seed
        """
        img_ann = self.frame[..., self.feature]

        seed_point = (int(y_location),
                      int(x_location))
        contig_cell = flood(image=img_ann, seed_point=seed_point)
        stray_pixels = np.logical_and(np.invert(contig_cell), img_ann == label)
        img_trimmed = np.where(stray_pixels, 0, img_ann)

        self.y_changed = np.any(np.where(img_trimmed != img_ann))

        self.frame[..., self.feature] = img_trimmed

    def action_flood(self, label, x_location, y_location):
        """
        Floods the region at (x, y) with the label.
        Only floods diagonally connected pixels (connectivity == 2) when label != 0.

        Args:
            label (int): label to fill region with
            x_location (int): x coordinate of region to flood
            y_location (int): y coordinate of region to flood
        """
        if label is -inf:
            label = 0

        img = self.frame[..., self.feature]
        # Rescale click location to corresponding location in label array
        hole_fill_seed = (int(y_location),
                          int(x_location))
        # Check current label
        old_label = img[hole_fill_seed]

        # Flood region with label
        # helps prevents hole fill from spilling into background
        connectivity = 1 if old_label == 0 else 2
        flooded = flood_fill(img, hole_fill_seed, label,
                             connectivity=connectivity)

        # Update cell info dicts
        label_in_original = np.any(np.isin(label, img))
        label_in_flooded = np.any(np.isin(label, flooded))
        old_label_in_flooded = np.any(np.isin(old_label, flooded))

        if label != 0 and not label_in_original and label_in_flooded:
            self.add_cell_info(add_label=label, frame=self.frame_id)
        if old_label != 0 and not old_label_in_flooded:
            self.del_cell_info(del_label=old_label, frame=self.frame_id)

        self.frame[..., self.feature] = flooded
        self.y_changed = True

    def action_watershed(self, label, x1_location, y1_location, x2_location, y2_location):
        """Use watershed to segment different objects"""
        # Pull the label that is being split and find a new valid label
        current_label = label
        new_label = self.project.get_max_label(self.feature) + 1

        # Locally store the frames to work on
        img_raw = self.raw_frame[..., self.channel]
        img_ann = self.frame[..., self.feature]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)

        # create two seed locations
        seeds_labeled[int(y1_location),
                      int(x1_location)] = current_label

        seeds_labeled[int(y2_location),
                      int(x2_location)] = new_label

        # define the bounding box to apply the transform on and select
        # appropriate sections of 3 inputs (raw, seeds, annotation mask)
        props = regionprops(np.squeeze(np.int32(img_ann == current_label)))
        minr, minc, maxr, maxc = props[0].bbox

        # store these subsections to run the watershed on
        img_sub_raw = np.copy(img_raw[minr:maxr, minc:maxc])
        img_sub_ann = np.copy(img_ann[minr:maxr, minc:maxc])
        img_sub_seeds = np.copy(seeds_labeled[minr:maxr, minc:maxc])

        # contrast adjust the raw image to assist the transform
        img_sub_raw_scaled = rescale_intensity(img_sub_raw)

        # apply watershed transform to the subsections
        ws = watershed(-img_sub_raw_scaled, img_sub_seeds,
                       mask=img_sub_ann.astype(bool))

        # did watershed effectively create a new label?
        new_pixels = np.count_nonzero(np.logical_and(
            ws == new_label, img_sub_ann == current_label))

        # if only a few pixels split, dilate them; new label is "brightest"
        # so will expand over other labels and increase area
        if new_pixels < 5:
            ws = dilation(ws, disk(3))

        # ws may only leave a few pixels of old label
        old_pixels = np.count_nonzero(ws == current_label)
        if old_pixels < 5:
            # create dilation image to prevent "dimmer" label from being eroded
            # by the "brighter" label
            dilated_ws = dilation(np.where(ws == current_label, ws, 0), disk(3))
            ws = np.where(dilated_ws == current_label, dilated_ws, ws)

        # only update img_sub_ann where ws has changed label
        # from current_label to new_label
        idx = np.logical_and(ws == new_label, img_sub_ann == current_label)
        img_sub_ann = np.where(idx, ws, img_sub_ann)

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann

        # update cell_info dict only if new label was created with ws
        if np.any(np.isin(img_ann, new_label)):
            self.add_cell_info(add_label=new_label, frame=self.frame_id)

        self.frame[..., self.feature] = img_ann

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
        if label is -inf:
            label = 0

        top_edge = min(y1, y2)
        bottom_edge = max(y1, y2) + 1
        left_edge = min(x1, x2)
        right_edge = max(x1, x2) + 1

        # pull out the selection portion of the raw frame
        predict_area = self.raw_frame[top_edge:bottom_edge,
                                      left_edge:right_edge, self.channel]

        # triangle threshold picked after trying a few on one dataset
        # may not be the best threshold approach for other datasets!
        # pick two thresholds to use hysteresis thresholding strategy
        threshold = filters.threshold_triangle(image=predict_area.astype('float64'))
        threshold_stringent = 1.10 * threshold

        # try to keep stray pixels from appearing
        hyst = filters.apply_hysteresis_threshold(image=predict_area,
                                                  low=threshold,
                                                  high=threshold_stringent)
        ann_threshold = np.where(hyst, label, 0)

        # put prediction in without overwriting
        predict_area = self.frame[top_edge:bottom_edge,
                                  left_edge:right_edge, self.feature]
        safe_overlay = np.where(predict_area == 0, ann_threshold, predict_area)

        self.frame[top_edge:bottom_edge,
                   left_edge:right_edge, self.feature] = safe_overlay

        # don't need to update cell_info unless an annotation has been added
        if np.any(np.isin(self.frame[..., self.feature], label)):
            self.add_cell_info(add_label=label, frame=self.frame_id)

    def action_active_contour(self, label, min_pixels=20, iterations=100):
        label_img = np.copy(self.frame[..., self.feature])

        # get centroid of selected label
        props = regionprops(np.where(label_img == label, label, 0))[0]

        # make bounding box size to encompass some background
        box_height = props['bbox'][2] - props['bbox'][0]
        y1 = max(0, props['bbox'][0] - box_height // 2)
        y2 = min(self.project.height, props['bbox'][2] + box_height // 2)

        box_width = props['bbox'][3] - props['bbox'][1]
        x1 = max(0, props['bbox'][1] - box_width // 2)
        x2 = min(self.project.width, props['bbox'][3] + box_width // 2)

        # relevant region of label image to work on
        label_img = label_img[y1:y2, x1:x2]

        # use existing label as initial level set for contour calculations
        level_set = np.where(label_img == label, 1, 0)

        # normalize input 2D frame data values to range [0.0, 1.0]
        adjusted_raw_frame = Normalize()(self.raw_frame[..., self.channel])
        predict_area = adjusted_raw_frame[y1:y2, x1:x2]

        # returns 1 where label is predicted to be based on contouring, 0 background
        contoured = morphological_chan_vese(predict_area, iterations, init_level_set=level_set)

        # contoured area should get original label value
        contoured_label = contoured * label
        # contours tend to fit very tightly, a small expansion here works well
        contoured_label = dilation(contoured_label, disk(3))

        # don't want to leave the original (un-contoured) label in the image
        # never overwrite other labels with new contoured label
        cond = np.logical_or(label_img == label, label_img == 0)
        safe_overlay = np.where(cond, contoured_label, label_img)

        # label must be present in safe_overlay for this to be a valid contour result
        # very few pixels of contoured label indicate contour prediction not worth keeping
        pixel_count = np.count_nonzero(safe_overlay == label)
        if pixel_count < min_pixels:
            safe_overlay = np.copy(self.frame[y1:y2, x1:x2, self.feature])

        # put it back in the full image so can use centroid coords for post-contour cleanup
        full_frame = np.copy(self.frame[..., self.feature])
        full_frame[y1:y2, x1:x2] = safe_overlay

        # avoid automated label cleanup if the centroid (flood seed point) is not the right label
        if full_frame[int(props['centroid'][0]), int(props['centroid'][1])] != label:
            img_trimmed = full_frame
        else:
            # morphology and logic used by pixel-trimming action, with object centroid as seed
            contig_cell = flood(image=full_frame,
                                seed_point=(int(props['centroid'][0]), int(props['centroid'][1])))

            # any pixels in img_ann that have value 'label' and are NOT connected to hole_fill_seed
            # get changed to 0, all other pixels retain their original value
            img_trimmed = np.where(np.logical_and(np.invert(contig_cell),
                                                  full_frame == label),
                                   0, full_frame)

        # update image; cell_info should never change as a result of this
        self.frame[y1:y2, x1:x2, self.feature] = img_trimmed[y1:y2, x1:x2]
        self.y_changed = True

    def action_erode(self, label):
        """
        Use morphological erosion to incrementally shrink the selected label.
        """
        img_ann = self.frame[..., self.feature]

        # if label is adjacent to another label, don't let that interfere
        img_erode = np.where(img_ann == label, label, 0)
        # erode the label
        img_erode = erosion(img_erode, square(3))

        # put the label back in
        img_ann = np.where(img_ann == label, img_erode, img_ann)

        in_modified = np.any(np.isin(img_ann, label))
        if not in_modified:
            self.del_cell_info(del_label=label, frame=self.frame_id)

        self.frame[..., self.feature] = img_ann
        self.y_changed = True

    def action_dilate(self, label):
        """
        Use morphological dilation to incrementally increase the selected label.
        Does not overwrite bordering labels.
        """
        img_ann = self.frame[..., self.feature]

        img_dilate = np.where(img_ann == label, label, 0)
        img_dilate = dilation(img_dilate, square(3))

        img_ann = np.where(np.logical_and(img_dilate == label, img_ann == 0), img_dilate, img_ann)

        self.frame[..., self.feature] = img_ann
        self.y_changed = True

    def action_add_daughter(self, parent, daughter):
        """
        Adds a daughter to a division event.

        Args:
            parent (int): parent label in division
            daughter (int): daughter label in division
        """
        parent_track = self.tracks[parent]
        daughter_track = self.tracks[daughter]

        # Add new daughter
        if parent == daughter:
            # Don't create a new daughter on the first frame of the parent
            if self.frame_id == parent_track['frames'][0]:
                return

            # Replace parent with new label for rest of movie
            daughter = self.project.get_max_label(self.feature) + 1

            for label_frame in self.project.label_frames[self.frame_id:]:
                img = label_frame.frame
                img[img == parent] = daughter
                label_frame.frame = img

            # Split parent frames between parent and daughter
            frames_before = [frame for frame in parent_track['frames'] if frame < self.frame_id]
            frames_after = [frame for frame in parent_track['frames'] if frame >= self.frame_id]

            parent_track['frames'] = frames_before
            daughter_track = {
                'frames': frames_after,
                'label': daughter,
                'daughters': [],
                'frame_div': None,
                'capped': False,
                'parent': parent,
            }

            # Move divisions after current frame from parent to daughter
            if parent_track['frame_div'] and parent_track['frame_div'] > self.frame_id:
                future_daughters = [d for d in parent_track['daughters']
                                    if min(self.tracks[d]['frames']) > self.frame_id]
                past_daughters = [d for d in parent_track['daughters']
                                  if d not in future_daughters]

                for d in future_daughters:
                    self.tracks[d]['parent'] = daughter

                daughter_track['capped'] = True
                daughter_track['frame_div'] = parent_track['frame_div']
                daughter_track['daughters'] = future_daughters
                parent_track['frame_div'] = self.frame_id
                parent_track['daughters'] = past_daughters

            self.tracks[daughter] = daughter_track

            self.labels.cell_ids[self.feature] = np.append(
                self.labels.cell_ids[self.feature],
                daughter)
            self.y_changed = True
        # Add existing daughter
        else:
            if daughter_track['parent'] is not None:
                raise ValueError(
                    f'Daughter {daughter} already has parent {daughter_track["parent"]}')
            daughter_track['parent'] = parent

        # Add daughter
        if daughter not in parent_track['daughters']:
            parent_track['daughters'] += [daughter]
        # Add new division info to parent
        if not parent_track['capped']:
            parent_track['frame_div'] = self.frame_id
            parent_track['capped'] = True

        self.labels_changed = True

    def action_remove_daughter(self, daughter):
        """
        Removes a daughter from the division event that spawns it.
        Does not edit the segmentation .

        Args:
            daughter (int): daughter label to remove from division event
        """
        # Get daughter and parent tracks
        daughter_track = self.tracks[daughter]
        parent = daughter_track['parent']
        parent_track = self.tracks[parent]
        # Compute new daughters
        daughters = [label for label in parent_track['daughters'] if label != daughter]
        # Update tracks
        if daughters == []:
            parent_track['capped'] = False
            parent_track['frame_div'] = None
        parent_track['daughters'] = daughters
        daughter_track['parent'] = None

        self.labels_changed = True

    def action_replace_with_parent(self, daughter):
        """
        Replaces daughter with its parent after the division
        and removes the division.
        Future divisions with the daughter become part of the parent's lineage.
        """
        daughter_track = self.tracks[daughter]
        parent = daughter_track['parent']
        parent_track = self.tracks[parent]
        frame = parent_track['frame_div']

        # Remove division
        for d in parent_track['daughters']:
            self.tracks[d]['parent'] = None
        # Link future division to parent
        if (daughter_track['frame_div'] is None or
                parent_track['frame_div'] < daughter_track['frame_div']):
            for d in daughter_track['daughters']:
                self.tracks[d]['parent'] = parent
            parent_track['daughters'] = daughter_track['daughters']
            parent_track['frame_div'] = daughter_track['frame_div']
            parent_track['capped'] = daughter_track['capped']
        # Past divisions remain with daughter
        else:
            parent_track['daughters'] = []
            parent_track['frame_div'] = None
            parent_track['capped'] = False

        # Replace daughter with parent after division frame
        for label_frame in self.project.label_frames[frame:]:
            img = label_frame.frame[..., self.feature]
            if np.any(np.isin(img, daughter)):
                img = np.where(img == daughter, parent, img)
                self.add_cell_info(add_label=parent, frame=label_frame.frame_id)
                self.del_cell_info(del_label=daughter, frame=label_frame.frame_id)
                label_frame.frame[..., self.feature] = img

    def action_new_track(self, label):
        """
        Replaces label with a new label in all frames after the current frame

        Args:
            label (int): label to replace with a new label
        """
        track = self.tracks[label]
        new_label = self.project.get_max_label(self.feature) + 1

        # Don't create a new track on the first frame of a track
        if self.frame_id == track['frames'][0]:
            return

        # replace frame labels
        for label_frame in self.project.label_frames[self.frame_id:]:
            img = label_frame.frame
            if np.isin(label, img):
                img[img == label] = new_label
                label_frame.frame = img

        # replace fields
        new_track = self.tracks[new_label] = {}

        idx = track['frames'].index(self.frame_id)

        frames_before = track['frames'][:idx]
        frames_after = track['frames'][idx:]

        track['frames'] = frames_before
        new_track['frames'] = frames_after
        new_track['label'] = new_label

        # only add daughters if they aren't in the same frame as the new track
        new_track['daughters'] = []
        for d in track['daughters']:
            if self.frame_id not in self.tracks[d]['frames']:
                new_track['daughters'].append(d)

        new_track['frame_div'] = track['frame_div']
        new_track['capped'] = track['capped']
        new_track['parent'] = None

        track['daughters'] = []
        track['frame_div'] = None
        track['capped'] = False

        self.labels.cell_ids[0] = np.append(self.labels.cell_ids[0], new_label)

        self.y_changed = self.labels_changed = True
