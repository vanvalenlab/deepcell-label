"""Classes to view and edit DeepCell Label Projects"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import io
import json
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

from labelmaker import LabelInfoMaker


class ChangeDisplay(object):
    """
    Class to change the frame, feature or channel displayed and edited by a DeepCell Label Project.
    """

    def __init__(self, project):
        self.project = project
        self.num_frames = project.num_frames
        self.num_channels = project.num_channels
        self.num_features = project.num_features

    def change(self, display_attribute, value):
        """
        Call a change view based on the passed view attribute name.

        Args:
            display_attribute (str): name of attribute to change (e.g. 'frame')
            value (int): value to set for view attribute

        Returns:
            dict: payload to send to frontend application
        """
        fn_name = 'change_{}'.format(display_attribute)
        try:
            change_fn = getattr(self, fn_name)
            payload = change_fn(value)
        except AttributeError:
            raise ValueError(
                'Invalid display attribute "{}"'.format(display_attribute))
        return payload

    def change_frame(self, frame):
        """
        Args:
            frame (int): index of frame to display

        Raises:
            ValueError: raised by out-of-range frame index
        """
        if frame < 0 or frame > self.num_frames - 1:
            raise ValueError('Frame {} is outside of range [0, {}].'.format(
                frame, self.num_frames - 1))
        self.project.frame = frame
        return self.project.make_payload(x=True, y=True)

    def change_channel(self, channel):
        """
        Args:
            channel (int): index of channel to display

        Raises:
            ValueError: raised by out of range channel index
        """
        if channel < 0 or channel > self.num_channels - 1:
            raise ValueError('Channel {} is outside of range [0, {}].'.format(
                channel, self.num_channels - 1))
        self.project.channel = channel
        return self.project.make_payload(x=True)

    def change_feature(self, feature):
        """
        Args:
            feature (int): index of feature to display

        Raises:
            ValueError: raised by out of range channel index
        """
        if feature < 0 or feature > self.num_features - 1:
            raise ValueError('Feature {} is outside of range [0, {}].'.format(
                feature, self.num_features - 1))
        self.project.feature = feature
        return self.project.make_payload(y=True)


class BaseEdit(object):
    """
    Base class for editing frames in DeepCell Label.
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

        self.y_changed = False
        self.labels_changed = False

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

    # Access dynamic display attributes
    @property
    def frame_id(self):
        """
        Returns:
            int: index of the current frame
        """
        return self.project.frame

    @property
    def feature(self):
        """
        Returns:
            int: index of the current feature
        """
        return self.project.feature

    @property
    def channel(self):
        """
        Returns:
            int: index of the current channel
        """
        return self.project.channel

    @property
    def scale_factor(self):
        """
        Returns:
            float: current scale_factor
        """
        return self.project.scale_factor

    def dispatch_action(self, action, info):
        """
        Call an action method based on an action type.

        Args:
            action (str): name of action method after "action_"
                          e.g. "handle_draw" to call "action_handle_draw"
            info (dict): key value pairs with arguments for action

        Returns:
            dict: payload to send to frontend application
        """
        attr_name = 'action_{}'.format(action)
        try:
            action_fn = getattr(self, attr_name)
            action_fn(**info)
        except AttributeError:
            raise ValueError('Invalid action "{}"'.format(action))
        return self.project.make_payload(y=self.y_changed,
                                         labels=self.labels_changed)

    def add_cell_info(self, add_label, frame):
        raise NotImplementedError(
            'add_cell_info is not implemented in BaseEdit')

    def del_cell_info(self, del_label, frame):
        raise NotImplementedError(
            'del_cell_info is not implemented in BaseEdit')

    def action_new_single_cell(self, label):
        """
        Create new label that replaces an existing label in one frame.

        Args:
            label (int): label to replace
        """
        # Get and edit the displayed labels
        img = self.frame[..., self.feature]
        new_label = self.project.get_max_label() + 1
        img[img == label] = new_label
        # Update label metadata
        self.del_cell_info(del_label=label, frame=self.frame_id)
        self.add_cell_info(add_label=new_label, frame=self.frame_id)
        # Assign the image to the frame
        self.frame[..., self.feature] = img

    def action_delete_mask(self, label):
        """
        Deletes label from one frame, replacing the label with 0.

        Args:
            label (int): label to delete
        """
        # TODO: update the action name?
        img = self.frame[..., self.feature]
        img = np.where(img == label, 0, img)
        self.del_cell_info(del_label=label, frame=self.frame_id)
        self.frame[..., self.feature] = img

    def action_swap_single_frame(self, label_1, label_2):
        """
        Swap labels of two objects in one frame.
        Does not update cell info as the frames for the labels do not change.

        Args:
            label_1 (int): first label to swap
            label_2 (int): second label to swap
        """
        img = self.frame[..., self.feature]
        img = np.where(img == label_1, -1, img)
        img = np.where(img == label_2, label_1, img)
        img = np.where(img == -1, label_2, img)
        # TODO: does info change?
        self.y_changed = self.labels_changed = True
        self.frame[..., self.feature] = img

    def action_handle_draw(self, trace, target_value, brush_value, brush_size, erase):
        """
        Use a "brush" to draw in the brush value along trace locations of
        the annotated data.
        Updates cell info if a change is detected.

        Args:
            trace (list): list of (x, y) coordinates where the brush has painted
            target_value (int): label overwritten by the brush
            brush_value (int): label written by the bush
            brush_size (int): radius of the brush
            erase (bool): sets target_value in trace area to 0 when True
        """
        # import pdb; pdb.set_trace()
        img = np.copy(self.frame[..., self.feature])
        in_original = np.any(np.isin(img, brush_value))

        img_draw = np.where(img == target_value, brush_value, img)
        img_erase = np.where(img == brush_value, target_value, img)

        for loc in trace:
            # each element of trace is an array with [y,x] coordinates of array
            x_loc = loc[1]
            y_loc = loc[0]

            brush_area = circle(y_loc, x_loc,
                                brush_size // self.scale_factor,
                                (self.project.height, self.project.width))

            # do not overwrite or erase labels other than the one you're editing
            if not erase:
                img[brush_area] = img_draw[brush_area]
            else:
                img[brush_area] = img_erase[brush_area]

        in_modified = np.any(np.isin(img, brush_value))

        # cell deletion
        if in_original and not in_modified:
            self.del_cell_info(del_label=brush_value, frame=self.frame_id)

        # cell addition
        elif in_modified and not in_original:
            self.add_cell_info(add_label=brush_value, frame=self.frame_id)

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

        seed_point = (int(y_location // self.scale_factor),
                      int(x_location // self.scale_factor))
        contig_cell = flood(image=img_ann, seed_point=seed_point)
        stray_pixels = np.logical_and(np.invert(contig_cell), img_ann == label)
        img_trimmed = np.where(stray_pixels, 0, img_ann)

        self.y_changed = np.any(np.where(img_trimmed != img_ann))

        self.frame[..., self.feature] = img_trimmed

    def action_flood(self, label, x_location, y_location):
        """
        Floods the region at (x, y) with the label.

        Args:

        """
        img = self.frame[..., self.feature]
        # Rescale click location to corresponding location in label array
        hole_fill_seed = (int(y_location // self.scale_factor),
                          int(x_location // self.scale_factor))
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
        new_label = self.project.get_max_label() + 1

        # Locally store the frames to work on
        img_raw = self.raw_frame[..., self.channel]
        img_ann = self.frame[..., self.feature]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)

        # create two seed locations
        seeds_labeled[int(y1_location / self.scale_factor),
                      int(x1_location / self.scale_factor)] = current_label

        seeds_labeled[int(y2_location / self.scale_factor),
                      int(x2_location / self.scale_factor)] = new_label

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
            dilated_ws = dilation(
                np.where(ws == current_label, ws, 0), disk(3))
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
        top_edge = min(y1, y2)
        bottom_edge = max(y1, y2)
        left_edge = min(x1, x2)
        right_edge = max(x1, x2)

        # pull out the selection portion of the raw frame
        predict_area = self.raw_frame[top_edge:bottom_edge,
                                      left_edge:right_edge, self.channel]

        # triangle threshold picked after trying a few on one dataset
        # may not be the best threshold approach for other datasets!
        # pick two thresholds to use hysteresis thresholding strategy
        threshold = filters.threshold_triangle(image=predict_area)
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
        contoured = morphological_chan_vese(
            predict_area, iterations, init_level_set=level_set)

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

        img_ann = np.where(np.logical_and(
            img_dilate == label, img_ann == 0), img_dilate, img_ann)

        self.frame[..., self.feature] = img_ann
        self.y_changed = True


class ZStackEdit(BaseEdit):

    def __init__(self, project):
        super(ZStackEdit, self).__init__(project)

    def action_new_cell_stack(self, label):
        """
        Creates new cell label and replaces original label with it in all subsequent frames.

        Args:
            label (int): label to replace with a new label
        """
        new_label = self.project.get_max_label() + 1
        # Replace old label with new in every frame until end
        for label_frame in self.project.label_frames[self.frame_id:]:
            img = label_frame.frame[..., self.feature]
            img[img == label] = new_label
            # Update cell info for this frame
            if new_label in img:
                self.del_cell_info(del_label=label, frame=label_frame.frame_id)
                self.add_cell_info(add_label=new_label,
                                   frame=label_frame.frame_id)
            label_frame.frame[..., self.feature] = img

    def action_replace_single(self, label_1, label_2):
        """
        replaces label_2 with label_1, but only in one frame. Frontend checks
        to make sure labels are different and were selected within same frames
        before sending action
        """
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

    def action_replace(self, label_1, label_2):
        """
        Replacing label_2 with label_1. Frontend checks to make sure these labels
        are different before sending action
        """
        # TODO: check on backend that labels are different?
        # Check each frame for label_2
        for label_frame in self.project.label_frames:
            img = label_frame.frame[..., self.feature]
            # if label being replaced is present, remove it from image and update cell info dict
            if np.any(np.isin(img, label_2)):
                img = np.where(img == label_2, label_1, img)
                self.add_cell_info(add_label=label_1, frame=self.frame_id)
                self.del_cell_info(del_label=label_2, frame=self.frame_id)
                label_frame.frame[..., self.feature] = img

    def action_predict_single(self):
        """
        predicts zstack relationship for current frame based on previous frame
        useful for finetuning corrections one frame at a time
        """
        if self.frame_id > 0:
            prev_frame = self.frame_id - 1
            img = self.project.label_frames[prev_frame].frame[..., self.feature]
            next_img = self.frame[..., self.feature]
            updated_img = predict_zstack_cell_ids(img, next_img)

            # check if image changed
            comparison = np.where(next_img != updated_img)
            self.y_changed = np.any(comparison)

            # if the image changed, update cell info and label frame
            if self.y_changed:
                self.remake_cell_info()
                self.frame[..., self.feature] = updated_img

    def action_predict_zstack(self):
        """
        use location of cells in image to predict which annotations are
        different slices of the same cell
        """
        for frame_id in range(self.project.num_frames - 1):
            img = self.project.label_frames[frame_id].frame[..., self.feature]
            next_img = self.project.label_frames[frame_id +
                                                 1].frame[..., self.feature]
            predicted_next = predict_zstack_cell_ids(img, next_img)
            self.project.label_frames[frame_id +
                                      1].frame[..., self.feature] = predicted_next

        # remake cell_info dict based on new annotations
        self.y_changed = True
        self.remake_cell_info()

    def action_save_zstack(self, bucket):
        # save file to BytesIO object
        store_npz = io.BytesIO()

        # X and y are array names by convention
        np.savez(store_npz, X=self.project.raw_array,
                 y=self.project.label_array)
        store_npz.seek(0)

        # store npz file object in bucket/path
        s3 = self.project._get_s3_client()
        s3.upload_fileobj(store_npz, bucket, self.project.path)

    def add_cell_info(self, add_label, frame):
        """Add a cell to the npz"""
        add_label = int(add_label)
        # if cell already exists elsewhere in npz
        try:
            old_frames = self.labels.cell_info[self.feature][add_label]['frames']
            new_frames = np.append(old_frames, frame)
            new_frames = np.unique(new_frames).tolist()
            self.labels.cell_info[self.feature][add_label]['frames'] = new_frames
        # cell does not exist anywhere in npz
        except KeyError:
            self.labels.cell_info[self.feature][add_label] = {
                'label': str(add_label),
                'frames': [frame],
                'slices': ''
            }
            self.labels.cell_ids[self.feature] = np.append(self.labels.cell_ids[self.feature],
                                                           add_label)

        # if adding cell, frames and info have necessarily changed
        self.y_changed = self.labels_changed = True

    def del_cell_info(self, del_label, frame):
        """Remove a cell from the npz"""
        # remove cell from frame
        old_frames = self.labels.cell_info[self.feature][del_label]['frames']
        new_frames = np.delete(old_frames, np.where(
            old_frames == np.int64(frame))).tolist()
        self.labels.cell_info[self.feature][del_label]['frames'] = new_frames

        # if that was the last frame, delete the entry for that cell
        if self.labels.cell_info[self.feature][del_label]['frames'] == []:
            del self.labels.cell_info[self.feature][del_label]

            # also remove from list of cell_ids
            ids = self.labels.cell_ids[self.feature]
            ids = np.delete(ids, np.where(ids == np.int64(del_label)))
            self.labels.cell_ids[self.feature] = ids

        # if deleting cell, frames and info have necessarily changed
        self.y_changed = self.labels_changed = True

    def remake_cell_info(self):
        """Remake the entire cell_info and cell_ids dicts"""
        label_maker = LabelInfoMaker(self.project.label_array)
        self.labels.cell_info = label_maker.cell_info
        self.labels.cell_ids = label_maker.cell_ids
        self.labels_changed = True


class TrackEdit(BaseEdit):
    def __init__(self, project):
        super(TrackEdit, self).__init__(project)

    def action_new_track(self, label):
        """
        Replaces label with a new label in all subsequent frames after self.frame_id

        Args:
            label (int): label to replace in subsequent frames
        """
        new_label = self.project.get_max_label() + 1
        track = self.labels.tracks[label]

        # Don't create a new track on the first frame of a track
        if self.frame_id == track['frames'][0]:
            return

        # replace frame labels
        for label_frame in self.project.label_frames[self.frame_id:]:
            img = label_frame.frame
            img[img == label] = new_label
            label_frame.frame = img

        # replace fields
        track_new = self.labels.tracks[new_label] = {}

        idx = track['frames'].index(self.frame_id)

        frames_before = track['frames'][:idx]
        frames_after = track['frames'][idx:]

        track['frames'] = frames_before
        track_new['frames'] = frames_after
        track_new['label'] = new_label

        # only add daughters if they aren't in the same frame as the new track
        track_new['daughters'] = []
        for d in track['daughters']:
            if self.frame_id not in self.labels.tracks[d]['frames']:
                track_new['daughters'].append(d)

        track_new['frame_div'] = track['frame_div']
        track_new['capped'] = track['capped']
        track_new['parent'] = None

        track['daughters'] = []
        track['frame_div'] = None
        track['capped'] = True

        self.labels.cell_ids[0] = np.append(self.labels.cell_ids[0], new_label)

        self.y_changed = self.labels_changed = True

    def action_set_parent(self, label_1, label_2):
        """
        label_1 gave birth to label_2
        """
        track_1 = self.labels.tracks[label_1]
        track_2 = self.labels.tracks[label_2]

        last_frame_parent = max(track_1['frames'])
        first_frame_daughter = min(track_2['frames'])

        if last_frame_parent < first_frame_daughter:
            track_1['daughters'].append(label_2)
            daughters = np.unique(track_1['daughters']).tolist()
            track_1['daughters'] = daughters

            track_2['parent'] = label_1

            if track_1['frame_div'] is None:
                track_1['frame_div'] = first_frame_daughter
            else:
                track_1['frame_div'] = min(
                    track_1['frame_div'], first_frame_daughter)

            self.labels_changed = True

    def action_replace(self, label_1, label_2):
        """
        Replacing label_2 with label_1 in all frames.
        """
        # replace arrays
        for label_frame in self.project.label_frames:
            img = label_frame.frame
            img = np.where(img == label_2, label_1, img)
            label_frame.frame = img

        # TODO: is this the same as add/remove?
        # replace fields
        track_1 = self.labels.tracks[label_1]
        track_2 = self.labels.tracks[label_2]

        for d in track_1['daughters']:
            self.labels.tracks[d]['parent'] = None

        track_1['frames'].extend(track_2['frames'])
        track_1['frames'] = sorted(set(track_1['frames']))
        track_1['daughters'] = track_2['daughters']
        track_1['frame_div'] = track_2['frame_div']
        track_1['capped'] = track_2['capped']

        del self.labels.tracks[label_2]
        for _, track in self.labels.tracks.items():
            try:
                track['daughters'].remove(label_2)
            except ValueError:
                pass

        self.y_changed = self.labels_changed = True

    def action_swap_tracks(self, label_1, label_2):
        """
        Replace label_1 with label_2 on all frames and vice versa.
        """
        def relabel(old_label, new_label):
            for label_frame in self.project.label_frames:
                img = label_frame.frame
                img[img == old_label] = new_label
                label_frame.frame = img

            # replace fields
            track_new = self.labels.tracks[new_label] = self.labels.tracks[old_label]
            track_new['label'] = new_label
            del self.labels.tracks[old_label]

            for d in track_new['daughters']:
                self.labels.tracks[d]['parent'] = new_label

            if track_new['parent'] is not None:
                parent_track = self.labels.tracks[track_new['parent']]
                parent_track['daughters'].remove(old_label)
                parent_track['daughters'].append(new_label)

        relabel(label_1, -1)
        relabel(label_2, label_1)
        relabel(-1, label_2)

        self.y_changed = self.labels_changed = True

    def action_save_track(self, bucket):
        # clear any empty tracks before saving file
        empty_tracks = []
        for key in self.labels.tracks:
            if not self.labels.tracks[key]['frames']:
                empty_tracks.append(self.labels.tracks[key]['label'])
        for track in empty_tracks:
            del self.labels.tracks[track]

        # create file object in memory instead of writing to disk
        trk_file_obj = io.BytesIO()

        with tarfile.open(fileobj=trk_file_obj, mode='w') as trks:
            with tempfile.NamedTemporaryFile('w') as lineage_file:
                json.dump(self.labels.tracks, lineage_file, indent=1)
                lineage_file.flush()
                trks.add(lineage_file.name, 'lineage.json')

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, self.project.raw_array)
                raw_file.flush()
                trks.add(raw_file.name, 'raw.npy')

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, self.project.label_array)
                tracked_file.flush()
                trks.add(tracked_file.name, 'tracked.npy')
        try:
            # go to beginning of file object
            trk_file_obj.seek(0)
            s3 = self.project._get_s3_client()
            s3.upload_fileobj(trk_file_obj, bucket, self.project.path)

        except Exception as e:
            print('Something Happened: ', e, file=sys.stderr)
            raise

    def add_cell_info(self, add_label, frame):
        """Add a cell to the trk"""
        # if cell already exists elsewhere in trk:
        add_label = int(add_label)
        try:
            old_frames = self.labels.tracks[add_label]['frames']
            updated_frames = np.append(old_frames, frame)
            updated_frames = np.unique(updated_frames).tolist()
            self.labels.tracks[add_label]['frames'] = updated_frames
        # cell does not exist anywhere in trk:
        except KeyError:
            self.labels.tracks[add_label] = {
                'label': str(add_label),
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
        """Remove a cell from the trk"""
        # remove cell from frame
        old_frames = self.labels.tracks[del_label]['frames']
        updated_frames = np.delete(old_frames, np.where(
            old_frames == np.int64(frame))).tolist()
        self.labels.tracks[del_label]['frames'] = updated_frames

        # if that was the last frame, delete the entry for that cell
        if self.labels.tracks[del_label]['frames'] == []:
            del self.labels.tracks[del_label]

            # also remove from list of cell_ids
            ids = self.labels.cell_ids[self.feature]
            self.labels.cell_ids[self.feature] = np.delete(
                ids, np.where(ids == np.int64(del_label))
            )

            # If deleting lineage data, remove parent/daughter entries
            for _, track in self.labels.tracks.items():
                try:
                    track['daughters'].remove(del_label)
                except ValueError:
                    pass
                if track['parent'] == del_label:
                    track['parent'] = None

        self.y_changed = self.labels_changed = True


def predict_zstack_cell_ids(img, next_img, threshold=0.1):
    """
    Predict labels for next_img based on intersection over union (iou)
    with img. If cells don't meet threshold for iou, they don't count as
    matching enough to share label with "matching" cell in img. Cells
    that don't have a match in img (new cells) get a new label so that
    output relabeled_next does not skip label values (unless label values
    present in prior image need to be skipped to avoid conflating labels).
    """

    # relabel to remove skipped values, keeps subsequent predictions cleaner
    next_img = relabel_frame(next_img)

    # create np array that can hold all pairings between cells in one
    # image and cells in next image
    iou = np.zeros((np.max(img) + 1, np.max(next_img) + 1))

    vals = np.unique(img)
    cells = vals[np.nonzero(vals)]

    # nothing to predict off of
    if len(cells) == 0:
        return next_img

    next_vals = np.unique(next_img)
    next_cells = next_vals[np.nonzero(next_vals)]

    # no values to reassign
    if len(next_cells) == 0:
        return next_img

    # calculate IOUs
    for i in cells:
        for j in next_cells:
            intersection = np.logical_and(img == i, next_img == j)
            union = np.logical_or(img == i, next_img == j)
            iou[i, j] = intersection.sum(axis=(0, 1)) / union.sum(axis=(0, 1))

    # relabel cells appropriately

    # relabeled_next holds cells as they get relabeled appropriately
    relabeled_next = np.zeros(next_img.shape, dtype=np.uint16)

    # max_indices[cell_from_next_img] -> cell from first image that matches it best
    max_indices = np.argmax(iou, axis=0)

    # put cells that into new image if they've been matched with another cell

    # keep track of which (next_img)cells don't have matches
    # this can be if (next_img)cell matched background, or if (next_img)cell matched
    # a cell already used
    unmatched_cells = []
    # don't reuse cells (if multiple cells in next_img match one particular cell)
    used_cells_src = []

    # next_cell ranges between 0 and max(next_img)
    # matched_cell is which cell in img matched next_cell the best

    # this for loop does the matching between cells
    for next_cell, matched_cell in enumerate(max_indices):
        # if more than one match, look for best match
        # otherwise the first match gets linked together, not necessarily reproducible

        # matched_cell != 0 prevents adding the background to used_cells_src
        if matched_cell != 0 and matched_cell not in used_cells_src:
            bool_matches = np.where(max_indices == matched_cell)
            count_matches = np.count_nonzero(bool_matches)
            if count_matches > 1:
                # for a given cell in img, which next_cell has highest iou
                matching_next_options = np.argmax(iou, axis=1)
                best_matched_next = matching_next_options[matched_cell]

                # ignore if best_matched_next is the background
                if best_matched_next != 0:
                    if next_cell != best_matched_next:
                        unmatched_cells = np.append(unmatched_cells, next_cell)
                        continue
                    else:
                        # don't add if bad match
                        if iou[matched_cell][best_matched_next] > threshold:
                            relabeled_next = np.where(next_img == best_matched_next,
                                                      matched_cell, relabeled_next)

                        # if it's a bad match, we still need to add next_cell back
                        # into relabeled next later
                        elif iou[matched_cell][best_matched_next] <= threshold:
                            unmatched_cells = np.append(
                                unmatched_cells, best_matched_next)

                        # in either case, we want to be done with the "matched_cell" from img
                        used_cells_src = np.append(
                            used_cells_src, matched_cell)

            # matched_cell != 0 is still true
            elif count_matches == 1:
                # add the matched cell to the relabeled image
                if iou[matched_cell][next_cell] > threshold:
                    relabeled_next = np.where(
                        next_img == next_cell, matched_cell, relabeled_next)
                else:
                    unmatched_cells = np.append(unmatched_cells, next_cell)

                used_cells_src = np.append(used_cells_src, matched_cell)

        elif matched_cell in used_cells_src and next_cell != 0:
            # skip that pairing, add next_cell to unmatched_cells
            unmatched_cells = np.append(unmatched_cells, next_cell)

        # if the cell in next_img didn't match anything (and is not the background):
        if matched_cell == 0 and next_cell != 0:
            unmatched_cells = np.append(unmatched_cells, next_cell)
            # note: this also puts skipped (nonexistent) labels into unmatched cells,
            # main reason to relabel first

    # figure out which labels we should use to label remaining, unmatched cells

    # these are the values that have already been used in relabeled_next
    relabeled_values = np.unique(relabeled_next)[
        np.nonzero(np.unique(relabeled_next))]

    # to account for any new cells that appear, create labels by adding to the max number of cells
    # assumes that these are new cells and that all prev labels have been assigned
    # only make as many new labels as needed

    current_max = max(np.max(cells), np.max(relabeled_values)) + 1

    stringent_allowed = []
    for additional_needed in range(len(unmatched_cells)):
        stringent_allowed.append(current_max)
        current_max += 1

    # replace each unmatched cell with a value from the stringent_allowed list,
    # add that relabeled cell to relabeled_next
    if len(unmatched_cells) > 0:
        for reassigned_cell in range(len(unmatched_cells)):
            relabeled_next = np.where(next_img == unmatched_cells[reassigned_cell],
                                      stringent_allowed[reassigned_cell], relabeled_next)

    return relabeled_next


def relabel_frame(img, start_val=1):
    '''relabel cells in frame starting from 1 without skipping values'''

    # cells in image to be relabeled
    cell_list = np.unique(img)
    cell_list = cell_list[np.nonzero(cell_list)]

    relabeled_cell_list = range(start_val, len(cell_list) + start_val)

    relabeled_img = np.zeros(img.shape, dtype=np.uint16)
    for i, cell in enumerate(cell_list):
        relabeled_img = np.where(
            img == cell, relabeled_cell_list[i], relabeled_img)

    return relabeled_img
