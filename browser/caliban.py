from io import BytesIO

from imgutils import pngify
from matplotlib.colors import hsv_to_rgb, LinearSegmentedColormap
import matplotlib.pyplot as plt
from random import random

import io
import copy
import json
import matplotlib
import numpy as np
import os
import random
import tarfile
import tempfile
import boto3
import sys
from werkzeug.utils import secure_filename
from skimage import filters
import skimage.morphology
from skimage.morphology import watershed
from skimage.morphology import flood_fill, flood
from skimage.draw import circle
from skimage.measure import regionprops
from skimage.exposure import rescale_intensity

from config import S3_KEY, S3_SECRET

# Connect to the s3 service
s3 = boto3.client(
    "s3",
    aws_access_key_id=S3_KEY,
    aws_secret_access_key=S3_SECRET
)

class ZStackReview:
    def __init__(self, filename, input_bucket, output_bucket, subfolders):

        self.filename = filename
        self.input_bucket = input_bucket
        self.output_bucket = output_bucket
        self.subfolders = subfolders
        self.trial = self.load(filename)
        self.raw = self.trial["raw"]
        self.annotated = self.trial["annotated"]
        self.feature = 0
        self.feature_max = self.annotated.shape[-1]
        self.channel = 0
        self.max_frames, self.height, self.width, self.channel_max = self.raw.shape
        self.dimensions = (self.width, self.height)

        #create a dictionary that has frame information about each cell
        #analogous to .trk lineage but do not need relationships between cells included
        self.cell_ids = {}
        self.num_cells = {}
        self.cell_info = {}

        self.current_frame = 0

        for feature in range(self.feature_max):
            self.create_cell_info(feature)

        self.draw_raw = False
        self.max_intensity = {}
        for channel in range(self.channel_max):
            self.max_intensity[channel] = None

        self.dtype_raw = self.raw.dtype
        self.scale_factor = 2

        self.save_version = 0

        self.color_map = plt.get_cmap('viridis')
        self.color_map.set_bad('black')

        self.frames_changed = False
        self.info_changed = False

    @property
    def readable_tracks(self):
        """
        Preprocesses tracks for presentation on browser. For example,
        simplifying track['frames'] into something like [0-29] instead of
        [0,1,2,3,...].
        """
        cell_info = copy.deepcopy(self.cell_info)
        for _, feature in cell_info.items():
            for _, label in feature.items():
                slices = list(map(list, consecutive(label['frames'])))
                slices = '[' + ', '.join(["{}".format(a[0])
                                if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                for a in slices]) + ']'
                label["slices"] = str(slices)

        return cell_info

    def get_frame(self, frame, raw):
        if raw:
            frame = self.raw[frame][:,:, self.channel]
            return pngify(imgarr=frame,
                          vmin=0,
                          vmax=self.max_intensity[self.channel],
                          cmap="cubehelix")
        else:
            frame = self.annotated[frame][:,:, self.feature]
            frame = np.ma.masked_equal(frame, 0)
            return pngify(imgarr=frame,
                         vmin=0,
                         vmax=np.max(self.cell_ids[self.feature]),
                         cmap=self.color_map)

    def get_array(self, frame):
        frame = self.annotated[frame][:,:,self.feature]
        return frame

    def load(self, filename):

        global original_filename
        original_filename = filename
        s3 = boto3.client('s3')
        key = self.subfolders
        print(key)
        response = s3.get_object(Bucket=self.input_bucket, Key= key)
        return load_npz(response['Body'].read())

    def action(self, action_type, info):

        # change displayed channel or feature
        if action_type == "change_channel":
            self.action_change_channel(**info)
        elif action_type == "change_feature":
            self.action_change_feature(**info)

        # edit mode actions
        elif action_type == "handle_draw":
            self.action_handle_draw(**info)
        elif action_type == "threshold":
            self.action_threshold(**info)

        # modified click actions
        elif action_type == "flood_cell":
            self.action_flood_contiguous(**info)
        elif action_type == "trim_pixels":
            self.action_trim_pixels(**info)

        # single click actions
        elif action_type == "fill_hole":
            self.action_fill_hole(**info)
        elif action_type == "new_single_cell":
            self.action_new_single_cell(**info)
        elif action_type == "new_cell_stack":
            self.action_new_cell_stack(**info)
        elif action_type == "delete":
            self.action_delete_mask(**info)

        # multiple click actions
        elif action_type == "replace_single":
            self.action_replace_single(**info)
        elif action_type == "replace":
            self.action_replace(**info)
        elif action_type == "swap_single_frame":
            self.action_swap_single_frame(**info)
        elif action_type == "swap_all_frame":
            self.action_swap_all_frame(**info)
        elif action_type == "watershed":
            self.action_watershed(**info)

        # misc
        elif action_type == "predict_single":
            self.action_predict_single(**info)
        elif action_type == "predict_zstack":
            self.action_predict_zstack(**info)

        else:
            raise ValueError("Invalid action '{}'".format(action_type))

    def action_change_channel(self, channel):
        self.channel = channel
        self.frames_changed = True

    def action_change_feature(self, feature):
        self.feature = feature
        self.frames_changed = True

    def action_handle_draw(self, trace, target_value, brush_value, brush_size, erase, frame):

        annotated = np.copy(self.annotated[frame,:,:,self.feature])

        in_original = np.any(np.isin(annotated, brush_value))

        annotated_draw = np.where(annotated==target_value, brush_value, annotated)
        annotated_erase = np.where(annotated==brush_value, target_value, annotated)

        for loc in trace:
            # each element of trace is an array with [y,x] coordinates of array
            x_loc = loc[1]
            y_loc = loc[0]

            brush_area = circle(y_loc, x_loc, brush_size, (self.height,self.width))

            #do not overwrite or erase labels other than the one you're editing
            if not erase:
                annotated[brush_area] = annotated_draw[brush_area]
            else:
                annotated[brush_area] = annotated_erase[brush_area]

        in_modified = np.any(np.isin(annotated, brush_value))

        #cell deletion
        if in_original and not in_modified:
            self.del_cell_info(feature = self.feature, del_label = brush_value, frame = frame)

        #cell addition
        elif in_modified and not in_original:
            self.add_cell_info(feature = self.feature, add_label = brush_value, frame = frame)

        #check for image change, in case pixels changed but no new or del cell
        comparison = np.where(annotated != self.annotated[frame,:,:,self.feature])
        self.frames_changed = np.any(comparison)
        #if info changed, self.info_changed set to true with info helper functions

        self.annotated[frame,:,:,self.feature] = annotated

    def action_threshold(self, y1, x1, y2, x2, frame, label):
        '''
        thresholds the raw image for annotation prediction within user-determined bounding box
        '''
        top_edge = min(y1, y2)
        bottom_edge = max(y1, y2)
        left_edge = min(x1, x2)
        right_edge = max(x1, x2)

        # pull out the selection portion of the raw frame
        predict_area = self.raw[frame, top_edge:bottom_edge, left_edge:right_edge, self.channel]

        # triangle threshold picked after trying a few on one dataset
        # may not be the best threshold approach for other datasets!
        # pick two thresholds to use hysteresis thresholding strategy
        threshold = filters.threshold_triangle(image = predict_area)
        threshold_stringent = 1.10 * threshold

        # try to keep stray pixels from appearing
        hyst = filters.apply_hysteresis_threshold(image = predict_area, low = threshold, high = threshold_stringent)
        ann_threshold = np.where(hyst, label, 0)

        #put prediction in without overwriting
        predict_area = self.annotated[frame, top_edge:bottom_edge, left_edge:right_edge, self.feature]
        safe_overlay = np.where(predict_area == 0, ann_threshold, predict_area)

        self.annotated[frame,top_edge:bottom_edge,left_edge:right_edge,self.feature] = safe_overlay

        # don't need to update cell_info unless an annotation has been added
        if np.any(np.isin(self.annotated[frame,:,:,self.feature], label)):
            self.add_cell_info(feature=self.feature, add_label=label, frame = frame)

    def action_flood_contiguous(self, label, frame, x_location, y_location):
        '''
        flood fill a cell with a unique new label; alternative to watershed
        for fixing duplicate label issue if cells are not touching
        '''
        img_ann = self.annotated[frame,:,:,self.feature]
        old_label = label
        new_label = np.max(self.cell_ids[self.feature]) + 1

        in_original = np.any(np.isin(img_ann, old_label))

        filled_img_ann = flood_fill(img_ann, (int(y_location/self.scale_factor), int(x_location/self.scale_factor)), new_label)
        self.annotated[frame,:,:,self.feature] = filled_img_ann

        in_modified = np.any(np.isin(filled_img_ann, old_label))

        # update cell info dicts since labels are changing
        self.add_cell_info(feature=self.feature, add_label=new_label, frame = frame)

        if in_original and not in_modified:
            self.del_cell_info(feature = self.feature, del_label = old_label, frame = frame)

    def action_trim_pixels(self, label, frame, x_location, y_location):
        '''
        get rid of any stray pixels of selected label; pixels of value label
        that are not connected to the cell selected will be removed from annotation in that frame
        '''

        img_ann = self.annotated[frame,:,:,self.feature]
        contig_cell = flood(image = img_ann, seed_point = (int(y_location/self.scale_factor), int(x_location/self.scale_factor)))
        img_trimmed = np.where(np.logical_and(np.invert(contig_cell), img_ann == label), 0, img_ann)

        #check if image changed
        comparison = np.where(img_trimmed != img_ann)
        self.frames_changed = np.any(comparison)
        #this action should never change the cell info

        self.annotated[frame,:,:,self.feature] = img_trimmed

    def action_fill_hole(self, label, frame, x_location, y_location):
        '''
        fill a "hole" in a cell annotation with the cell label. Doesn't check
        if annotation at (y,x) is zero (hole to fill) because that logic is handled in
        javascript. Just takes the click location, scales it to match the actual annotation
        size, then fills the hole with label (using skimage flood_fill). connectivity = 1
        prevents hole fill from spilling out into background in some cases
        '''
        # rescale click location -> corresponding location in annotation array
        hole_fill_seed = (y_location // self.scale_factor, x_location // self.scale_factor)
        # fill hole with label
        img_ann = self.annotated[frame,:,:,self.feature]
        filled_img_ann = flood_fill(img_ann, hole_fill_seed, label, connectivity = 1)
        self.annotated[frame,:,:,self.feature] = filled_img_ann

        #never changes info but always changes annotation
        self.frames_changed = True

    def action_new_single_cell(self, label, frame):
        """
        Create new label in just one frame
        """
        old_label, single_frame = label, frame
        new_label = np.max(self.cell_ids[self.feature]) + 1

        # replace frame labels
        frame = self.annotated[single_frame,:,:,self.feature]
        frame[frame == old_label] = new_label

        # replace fields
        self.del_cell_info(feature = self.feature, del_label = old_label, frame = single_frame)
        self.add_cell_info(feature = self.feature, add_label = new_label, frame = single_frame)

    def action_new_cell_stack(self, label, frame):

        """
        Creates new cell label and replaces original label with it in all subsequent frames
        """
        old_label, start_frame = label, frame
        new_label = np.max(self.cell_ids[self.feature]) + 1

        # replace frame labels
        for frame in self.annotated[start_frame:,:,:,self.feature]:
            frame[frame == old_label] = new_label

        for frame in range(self.annotated.shape[0]):
            if new_label in self.annotated[frame,:,:,self.feature]:
                self.del_cell_info(feature = self.feature, del_label = old_label, frame = frame)
                self.add_cell_info(feature = self.feature, add_label = new_label, frame = frame)

    def action_delete_mask(self, label, frame):
        '''
        remove selected annotation from frame, replacing with zeros
        '''

        ann_img = self.annotated[frame,:,:,self.feature]
        ann_img = np.where(ann_img == label, 0, ann_img)

        self.annotated[frame,:,:,self.feature] = ann_img

        #update cell_info
        self.del_cell_info(feature = self.feature, del_label = label, frame = frame)

    def action_replace_single(self, label_1, label_2, frame):
        '''
        replaces label_2 with label_1, but only in one frame. Frontend checks
        to make sure labels are different and were selected within same frames
        before sending action
        '''
        annotated = self.annotated[frame,:,:,self.feature]
        # change annotation
        annotated = np.where(annotated == label_2, label_1, annotated)
        self.annotated[frame,:,:,self.feature] = annotated
        # update info
        self.add_cell_info(feature = self.feature, add_label = label_1, frame = frame)
        self.del_cell_info(feature = self.feature, del_label = label_2, frame = frame)

    def action_replace(self, label_1, label_2):
        """
        Replacing label_2 with label_1. Frontend checks to make sure these labels
        are different before sending action
        """
        # check each frame
        for frame in range(self.annotated.shape[0]):
            annotated = self.annotated[frame,:,:,self.feature]
            # if label being replaced is present, remove it from image and update cell info dict
            if np.any(np.isin(annotated, label_2)):
                annotated = np.where(annotated == label_2, label_1, annotated)
                self.annotated[frame,:,:,self.feature] = annotated
                self.add_cell_info(feature = self.feature, add_label = label_1, frame = frame)
                self.del_cell_info(feature = self.feature, del_label = label_2, frame = frame)

    def action_swap_single_frame(self, label_1, label_2, frame):

        ann_img = self.annotated[frame,:,:,self.feature]
        ann_img = np.where(ann_img == label_1, -1, ann_img)
        ann_img = np.where(ann_img == label_2, label_1, ann_img)
        ann_img = np.where(ann_img == -1, label_2, ann_img)

        self.annotated[frame,:,:,self.feature] = ann_img

        self.frames_changed = self.info_changed = True

    def action_swap_all_frame(self, label_1, label_2):

        for frame in range(self.annotated.shape[0]):
            ann_img = self.annotated[frame,:,:,self.feature]
            ann_img = np.where(ann_img == label_1, -1, ann_img)
            ann_img = np.where(ann_img == label_2, label_1, ann_img)
            ann_img = np.where(ann_img == -1, label_2, ann_img)
            self.annotated[frame,:,:,self.feature] = ann_img

        #update cell_info
        cell_info_1 = self.cell_info[self.feature][label_1].copy()
        cell_info_2 = self.cell_info[self.feature][label_2].copy()
        self.cell_info[self.feature][label_1].update({'frames': cell_info_2['frames']})
        self.cell_info[self.feature][label_2].update({'frames': cell_info_1['frames']})

        self.frames_changed = self.info_changed = True

    def action_watershed(self, label, frame, x1_location, y1_location, x2_location, y2_location):
        # Pull the label that is being split and find a new valid label
        current_label = label
        new_label = np.max(self.cell_ids[self.feature]) + 1

        # Locally store the frames to work on
        img_raw = self.raw[frame,:,:,self.channel]
        img_ann = self.annotated[frame,:,:,self.feature]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)
        # create two seed locations
        seeds_labeled[int(y1_location/self.scale_factor ), int(x1_location/self.scale_factor)]=current_label
        seeds_labeled[int(y2_location/self.scale_factor ), int(x2_location/self.scale_factor )]=new_label

        # define the bounding box to apply the transform on and select appropriate sections of 3 inputs (raw, seeds, annotation mask)
        props = regionprops(np.squeeze(np.int32(img_ann == current_label)))
        minr, minc, maxr, maxc = props[0].bbox

        # store these subsections to run the watershed on
        img_sub_raw = np.copy(img_raw[minr:maxr, minc:maxc])
        img_sub_ann = np.copy(img_ann[minr:maxr, minc:maxc])
        img_sub_seeds = np.copy(seeds_labeled[minr:maxr, minc:maxc])

        # contrast adjust the raw image to assist the transform
        img_sub_raw_scaled = rescale_intensity(img_sub_raw)

        # apply watershed transform to the subsections
        ws = watershed(-img_sub_raw_scaled, img_sub_seeds, mask=img_sub_ann.astype(bool))

        # only update img_sub_ann where ws has changed label from current_label to new_label
        img_sub_ann = np.where(np.logical_and(ws == new_label,img_sub_ann == current_label), ws, img_sub_ann)

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.annotated[frame,:,:,self.feature] = img_ann

        #update cell_info dict only if new label was created with ws
        if np.any(np.isin(self.annotated[frame,:,:,self.feature], new_label)):
            self.add_cell_info(feature=self.feature, add_label=new_label, frame = frame)

    def action_predict_single(self, frame):

        '''
        predicts zstack relationship for current frame based on previous frame
        useful for finetuning corrections one frame at a time
        '''

        annotated = self.annotated[:,:,:,self.feature]
        current_slice = frame
        if current_slice > 0:
            prev_slice = current_slice - 1
            img = self.annotated[prev_slice,:,:,self.feature]
            next_img = self.annotated[current_slice,:,:,self.feature]
            updated_slice = predict_zstack_cell_ids(img, next_img)

            #check if image changed
            comparison = np.where(next_img != updated_slice)
            self.frames_changed = np.any(comparison)

            #if the image changed, update self.annotated and remake cell info
            if self.frames_changed:
                self.annotated[current_slice,:,:,int(self.feature)] = updated_slice
                self.create_cell_info(feature = int(self.feature))

    def action_predict_zstack(self):
        '''
        use location of cells in image to predict which annotations are
        different slices of the same cell
        '''

        annotated = self.annotated[:,:,:,self.feature]

        for zslice in range(self.annotated.shape[0] -1):
            img = self.annotated[zslice,:,:,self.feature]

            next_img = self.annotated[zslice + 1,:,:,self.feature]
            predicted_next = predict_zstack_cell_ids(img, next_img)
            self.annotated[zslice + 1,:,:,self.feature] = predicted_next

        #remake cell_info dict based on new annotations
        self.frames_changed = True
        self.create_cell_info(feature = self.feature)

    def action_save_zstack(self):
        save_file = self.filename + "_save_version_{}.npz".format(self.save_version)

        # save secure version of data before storing on regular file system
        file = secure_filename(save_file)

        np.savez(file, raw = self.raw, annotated = self.annotated)
        path = self.subfolders
        s3.upload_file(file, self.output_bucket, path)

    def add_cell_info(self, feature, add_label, frame):
        '''
        helper function for actions that add a cell to the npz
        '''
        #if cell already exists elsewhere in npz:
        add_label = int(add_label)

        try:
            old_frames = self.cell_info[feature][add_label]['frames']
            updated_frames = np.append(old_frames, frame)
            updated_frames = np.unique(updated_frames).tolist()
            self.cell_info[feature][add_label].update({'frames': updated_frames})
        #cell does not exist anywhere in npz:
        except KeyError:
            self.cell_info[feature].update({add_label: {}})
            self.cell_info[feature][add_label].update({'label': str(add_label)})
            self.cell_info[feature][add_label].update({'frames': [frame]})
            self.cell_info[feature][add_label].update({'slices': ''})

            self.cell_ids[feature] = np.append(self.cell_ids[feature], add_label)

            self.num_cells[feature] += 1

        #if adding cell, frames and info have necessarily changed
        self.frames_changed = self.info_changed = True

    def del_cell_info(self, feature, del_label, frame):
        '''
        helper function for actions that remove a cell from the npz
        '''
        #remove cell from frame
        old_frames = self.cell_info[feature][del_label]['frames']
        updated_frames = np.delete(old_frames, np.where(old_frames == np.int64(frame))).tolist()
        self.cell_info[feature][del_label].update({'frames': updated_frames})

        #if that was the last frame, delete the entry for that cell
        if self.cell_info[feature][del_label]['frames'] == []:
            del self.cell_info[feature][del_label]

            #also remove from list of cell_ids
            ids = self.cell_ids[feature]
            self.cell_ids[feature] = np.delete(ids, np.where(ids == np.int64(del_label)))

        #if deleting cell, frames and info have necessarily changed
        self.frames_changed = self.info_changed = True

    def create_cell_info(self, feature):
        '''
        helper function for actions that make or remake the entire cell info dict
        '''
        feature = int(feature)
        annotated = self.annotated[:,:,:,feature]

        self.cell_ids[feature] = np.unique(annotated)[np.nonzero(np.unique(annotated))]

        self.num_cells[feature] = int(max(self.cell_ids[feature]))

        self.cell_info[feature] = {}

        for cell in self.cell_ids[feature]:
            cell = int(cell)

            self.cell_info[feature][cell] = {}
            self.cell_info[feature][cell]['label'] = str(cell)
            self.cell_info[feature][cell]['frames'] = []

            for frame in range(self.annotated.shape[0]):
                if cell in annotated[frame,:,:]:
                    self.cell_info[feature][cell]['frames'].append(int(frame))
            self.cell_info[feature][cell]['slices'] = ''

        self.info_changed = True

    def create_lineage(self):
        for cell in self.cell_ids[self.feature]:
            self.lineage[str(cell)] = {}
            cell_info = self.lineage[str(cell)]

            cell_info["label"] = int(cell)
            cell_info["daughters"] = []
            cell_info["frame_div"] = None
            cell_info["parent"] = None
            cell_info["capped"] = False
            cell_info["frames"] = self.cell_info[self.feature][cell]['frames']



#_______________________________________________________________________________________________________________

class TrackReview:
    def __init__(self, filename, input_bucket, output_bucket, subfolders):
        self.filename = filename
        self.input_bucket = input_bucket
        self.output_bucket = output_bucket
        self.subfolders = subfolders
        self.trial = self.load(filename)
        self.raw = self.trial["raw"]
        self.tracked = self.trial["tracked"]

        # lineages is a list of dictionaries. There should be only a single one
        # when using a .trk file
        if len(self.trial["lineages"]) != 1:
            raise ValueError("Input file has multiple trials/lineages.")

        self.tracks = self.trial["lineages"][0]

        self.max_frames = self.raw.shape[0]
        self.dimensions = self.raw.shape[1:3][::-1]
        self.width, self.height = self.dimensions

        self.scale_factor = 2

        self.color_map = plt.get_cmap('viridis')
        self.color_map.set_bad('black')

        self.current_frame = 0

        self.frames_changed = False
        self.info_changed = False

    @property
    def readable_tracks(self):
        """
        Preprocesses tracks for presentation on browser. For example,
        simplifying track['frames'] into something like [0-29] instead of
        [0,1,2,3,...].
        """
        tracks = copy.deepcopy(self.tracks)
        for _, track in tracks.items():
            frames = list(map(list, consecutive(track["frames"])))
            frames = '[' + ', '.join(["{}".format(a[0])
                                if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                for a in frames]) + ']'
            track["frames"] = frames

        return tracks

    def get_frame(self, frame, raw):
        self.current_frame = frame
        if raw:
            frame = self.raw[frame][:,:,0]
            return pngify(imgarr=frame,
                          vmin=0,
                          vmax=None,
                          cmap="cubehelix")
        else:
            frame = self.tracked[frame][:,:,0]
            frame = np.ma.masked_equal(frame, 0)
            return pngify(imgarr=frame,
                         vmin=0,
                         vmax=max(self.tracks),
                         cmap=self.color_map)

    def get_array(self, frame):
        frame = self.tracked[frame][:,:,0]
        return frame

    def load(self, filename):
        global original_filename
        original_filename = filename
        s3 = boto3.client('s3')
        response = s3.get_object(Bucket=self.input_bucket, Key=self.subfolders)
        return load_trks(response['Body'].read())

    def action(self, action_type, info):

        # edit mode action
        if action_type == "handle_draw":
            self.action_handle_draw(**info)

        # modified click actions
        elif action_type == "flood_cell":
            self.action_flood_contiguous(**info)
        elif action_type == "trim_pixels":
            self.action_trim_pixels(**info)

        # single click actions
        elif action_type == "fill_hole":
            self.action_fill_hole(**info)
        elif action_type == "create_single_new":
            self.action_new_single_cell(**info)
        elif action_type == "create_all_new":
            self.action_new_track(**info)
        elif action_type == "delete_cell":
            self.action_delete(**info)

        # multiple click actions
        elif action_type == "set_parent":
            self.action_set_parent(**info)
        elif action_type == "replace":
            self.action_replace(**info)
        elif action_type == "swap_single_frame":
            self.action_swap_single_frame(**info)
        elif action_type == "swap_tracks":
            self.action_swap_tracks(**info)
        elif action_type == "watershed":
            self.action_watershed(**info)

        # misc
        elif action_type == "save_track":
            self.action_save_track(**info)

        else:
            raise ValueError("Invalid action '{}'".format(action_type))

    def action_handle_draw(self, trace, edit_value, brush_size, erase, frame):

        annotated = np.copy(self.tracked[frame])

        in_original = np.any(np.isin(annotated, edit_value))

        annotated_draw = np.where(annotated==0, edit_value, annotated)
        annotated_erase = np.where(annotated==edit_value, 0, annotated)

        for loc in trace:
            # each element of trace is an array with [y,x] coordinates of array
            x_loc = loc[1]
            y_loc = loc[0]

            brush_area = circle(y_loc, x_loc, brush_size, (self.height,self.width))

            #do not overwrite or erase labels other than the one you're editing
            if not erase:
                annotated[brush_area] = annotated_draw[brush_area]
            else:
                annotated[brush_area] = annotated_erase[brush_area]

        in_modified = np.any(np.isin(annotated, edit_value))

        # cell deletion
        if in_original and not in_modified:
            self.del_cell_info(del_label = edit_value, frame = frame)

        # cell addition
        elif in_modified and not in_original:
            self.add_cell_info(add_label = edit_value, frame = frame)

        comparison = np.where(annotated != self.tracked[frame])
        self.frames_changed = np.any(comparison)

        self.tracked[frame] = annotated

    def action_flood_contiguous(self, label, frame, x_location, y_location):
        '''
        flood fill a cell with a unique new label; alternative to watershed
        for fixing duplicate label issue if cells are not touching
        '''
        img_ann = self.tracked[frame,:,:,0]
        old_label = label
        new_label = max(self.tracks) + 1

        in_original = np.any(np.isin(img_ann, old_label))

        filled_img_ann = flood_fill(img_ann, (int(y_location/self.scale_factor), int(x_location/self.scale_factor)), new_label)
        self.tracked[frame,:,:,0] = filled_img_ann

        in_modified = np.any(np.isin(filled_img_ann, old_label))

        # update cell info dicts since labels are changing
        self.add_cell_info(add_label=new_label, frame = frame)

        if in_original and not in_modified:
            self.del_cell_info(del_label = old_label, frame = frame)

    def action_trim_pixels(self, label, frame, x_location, y_location):
        '''
        get rid of any stray pixels of selected label; pixels of value label
        that are not connected to the cell selected will be removed from annotation in that frame
        '''

        img_ann = self.tracked[frame,:,:,0]
        contig_cell = flood(image = img_ann, seed_point = (int(y_location/self.scale_factor), int(x_location/self.scale_factor)))
        img_trimmed = np.where(np.logical_and(np.invert(contig_cell), img_ann == label), 0, img_ann)

        comparison = np.where(img_trimmed != img_ann)
        self.frames_changed = np.any(comparison)

        self.tracked[frame,:,:,0] = img_trimmed

    def action_fill_hole(self, label, frame, x_location, y_location):
        '''
        fill a "hole" in a cell annotation with the cell label. Doesn't check
        if annotation at (y,x) is zero (hole to fill) because that logic is handled in
        javascript. Just takes the click location, scales it to match the actual annotation
        size, then fills the hole with label (using skimage flood_fill). connectivity = 1
        prevents hole fill from spilling out into background in some cases
        '''
        # rescale click location -> corresponding location in annotation array
        hole_fill_seed = (y_location // self.scale_factor, x_location // self.scale_factor)
        # fill hole with label
        img_ann = self.tracked[frame,:,:,0]
        filled_img_ann = flood_fill(img_ann, hole_fill_seed, label, connectivity = 1)
        self.tracked[frame,:,:,0] = filled_img_ann

        self.frames_changed = True

    def action_new_single_cell(self, label, frame):
        """
        Create new label in just one frame
        """
        old_label = label
        new_label = max(self.tracks) + 1

        # replace frame labels
        self.tracked[frame] = np.where(self.tracked[frame] == old_label,
            new_label, self.tracked[frame])

        # replace fields
        self.del_cell_info(del_label = old_label, frame = frame)
        self.add_cell_info(add_label = new_label, frame = frame)

    def action_new_track(self, label, frame):

        """
        Replacing label - create in all subsequent frames
        """
        old_label, start_frame = label, frame
        new_label = max(self.tracks) + 1

        if start_frame != 0:
            # replace frame labels
            for frame in self.tracked[start_frame:]:
                frame[frame == old_label] = new_label

            # replace fields
            track_old = self.tracks[old_label]
            track_new = self.tracks[new_label] = {}

            idx = track_old["frames"].index(start_frame)

            frames_before = track_old["frames"][:idx]
            frames_after = track_old["frames"][idx:]

            track_old["frames"] = frames_before
            track_new["frames"] = frames_after
            track_new["label"] = new_label

            # only add daughters if they aren't in the same frame as the new track
            track_new["daughters"] = []
            for d in track_old["daughters"]:
                if start_frame not in self.tracks[d]["frames"]:
                    track_new["daughters"].append(d)

            track_new["frame_div"] = track_old["frame_div"]
            track_new["capped"] = track_old["capped"]
            track_new["parent"] = None

            track_old["daughters"] = []
            track_old["frame_div"] = None
            track_old["capped"] = True

            self.frames_changed = self.info_changed = True

    def action_delete(self, label, frame):
        """
        Deletes label from current frame only
        """
        # Set frame labels to 0
        ann_img = self.tracked[frame]
        ann_img = np.where(ann_img == label, 0, ann_img)
        self.tracked[frame] = ann_img

        self.del_cell_info(del_label = label, frame = frame)

    def action_set_parent(self, label_1, label_2):
        """
        label_1 gave birth to label_2
        """
        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        last_frame_parent = max(track_1['frames'])
        first_frame_daughter = min(track_2['frames'])

        if last_frame_parent < first_frame_daughter:
            track_1["daughters"].append(label_2)
            daughters = np.unique(track_1["daughters"]).tolist()
            track_1["daughters"] = daughters

            track_2["parent"] = label_1

            if track_1["frame_div"] is None:
                track_1["frame_div"] = first_frame_daughter
            else:
                track_1["frame_div"] = min(track_1["frame_div"], first_frame_daughter)

            self.info_changed = True

    def action_replace(self, label_1, label_2):
        """
        Replacing label_2 with label_1
        """
        # replace arrays
        for frame in range(self.max_frames):
            annotated = self.tracked[frame]
            annotated = np.where(annotated == label_2, label_1, annotated)
            self.tracked[frame] = annotated

        # replace fields
        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        for d in track_1["daughters"]:
            self.tracks[d]["parent"] = None

        track_1["frames"].extend(track_2["frames"])
        track_1["frames"] = sorted(set(track_1["frames"]))
        track_1["daughters"] = track_2["daughters"]
        track_1["frame_div"] = track_2["frame_div"]
        track_1["capped"] = track_2["capped"]

        del self.tracks[label_2]
        for _, track in self.tracks.items():
            try:
                track["daughters"].remove(label_2)
            except ValueError:
                pass

        self.frames_changed = self.info_changed = True

    def action_swap_single_frame(self, label_1, label_2, frame):
        '''swap the labels of two cells in one frame, but do not
        change any of the lineage information'''

        ann_img = self.tracked[frame,:,:,0]
        ann_img = np.where(ann_img == label_1, -1, ann_img)
        ann_img = np.where(ann_img == label_2, label_1, ann_img)
        ann_img = np.where(ann_img == -1, label_2, ann_img)

        self.tracked[frame,:,:,0] = ann_img

        self.frames_changed = True

    def action_swap_tracks(self, label_1, label_2):
        def relabel(old_label, new_label):
            for frame in self.tracked:
                frame[frame == old_label] = new_label

            # replace fields
            track_new = self.tracks[new_label] = self.tracks[old_label]
            track_new["label"] = new_label
            del self.tracks[old_label]

            for d in track_new["daughters"]:
                self.tracks[d]["parent"] = new_label

            if track_new["parent"] is not None:
                parent_track = self.tracks[track_new["parent"]]
                parent_track["daughters"].remove(old_label)
                parent_track["daughters"].append(new_label)

        relabel(label_1, -1)
        relabel(label_2, label_1)
        relabel(-1, label_2)

        self.frames_changed = self.info_changed = True

    def action_watershed(self, label, frame, x1_location, y1_location, x2_location, y2_location):

        # Pull the label that is being split and find a new valid label
        current_label = label
        new_label = max(self.tracks) + 1

        # Locally store the frames to work on
        img_raw = self.raw[frame]
        img_ann = self.tracked[frame]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)

        # create two seed locations
        seeds_labeled[int(y1_location/self.scale_factor),
            int(x1_location/self.scale_factor)] = current_label

        seeds_labeled[int(y2_location/self.scale_factor),
            int(x2_location/self.scale_factor)] = new_label

        # define the bounding box to apply the transform on and select appropriate sections of 3 inputs (raw, seeds, annotation mask)
        props = regionprops(np.squeeze(np.int32(img_ann == current_label)))
        minr, minc, maxr, maxc = props[0].bbox

        # store these subsections to run the watershed on
        img_sub_raw = np.copy(img_raw[minr:maxr, minc:maxc])
        img_sub_ann = np.copy(img_ann[minr:maxr, minc:maxc])
        img_sub_seeds = np.copy(seeds_labeled[minr:maxr, minc:maxc])

        # contrast adjust the raw image to assist the transform
        img_sub_raw_scaled = rescale_intensity(img_sub_raw)

        # apply watershed transform to the subsections
        ws = watershed(-img_sub_raw_scaled, img_sub_seeds, mask=img_sub_ann.astype(bool))

        # only update img_sub_ann where ws has changed label from current_label to new_label
        img_sub_ann = np.where(np.logical_and(ws == new_label,img_sub_ann == current_label),
            ws, img_sub_ann)

        #reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.tracked[frame] = img_ann

        #update cell_info dict only if new label was created with ws
        if np.any(np.isin(self.tracked[frame,:,:,0], new_label)):
            self.add_cell_info(add_label=new_label, frame = frame)

    def action_save_track(self):
        # clear any empty tracks before saving file
        empty_tracks = []
        for key in self.tracks:
            if not self.tracks[key]['frames']:
                empty_tracks.append(self.tracks[key]['label'])
        for track in empty_tracks:
            del self.tracks[track]

        file = secure_filename(self.filename)

        with tarfile.open(file, "w") as trks:
            with tempfile.NamedTemporaryFile("w") as lineage_file:
                json.dump(self.tracks, lineage_file, indent=1)
                lineage_file.flush()
                trks.add(lineage_file.name, "lineage.json")

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, self.raw)
                raw_file.flush()
                trks.add(raw_file.name, "raw.npy")

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, self.tracked)
                tracked_file.flush()
                trks.add(tracked_file.name, "tracked.npy")
        try:
            s3.upload_file(file, self.output_bucket, self.subfolders)

        except Exception as e:
            print("Something Happened: ", e, file=sys.stderr)
            raise

        #os.remove(file)
        return "Success!"

    def add_cell_info(self, add_label, frame):
        '''
        helper function for actions that add a cell to the trk
        '''
        #if cell already exists elsewhere in trk:
        try:
            old_frames = self.tracks[add_label]['frames']
            updated_frames = np.append(old_frames, frame)
            updated_frames = np.unique(updated_frames).tolist()
            self.tracks[add_label].update({'frames': updated_frames})
        #cell does not exist anywhere in trk:
        except KeyError:
            self.tracks.update({add_label: {}})
            self.tracks[add_label].update({'label': int(add_label)})
            self.tracks[add_label].update({'frames': [frame]})
            self.tracks[add_label].update({'daughters': []})
            self.tracks[add_label].update({'frame_div': None})
            self.tracks[add_label].update({'parent': None})
            self.tracks[add_label].update({'capped': False})

        self.frames_changed = self.info_changed = True

    def del_cell_info(self, del_label, frame):
        '''
        helper function for actions that remove a cell from the trk
        '''
        #remove cell from frame
        old_frames = self.tracks[del_label]['frames']
        updated_frames = np.delete(old_frames, np.where(old_frames == np.int64(frame))).tolist()
        self.tracks[del_label].update({'frames': updated_frames})

        #if that was the last frame, delete the entry for that cell
        if self.tracks[del_label]['frames'] == []:
            del self.tracks[del_label]

            # If deleting lineage data, remove parent/daughter entries
            for _, track in self.tracks.items():
                try:
                    track["daughters"].remove(del_label)
                except ValueError:
                    pass
                if track["parent"] == del_label:
                    track["parent"] = None

        self.frames_changed = self.info_changed = True


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0]+1)


def predict_zstack_cell_ids(img, next_img, threshold = 0.1):
    '''
    Predict labels for next_img based on intersection over union (iou)
    with img. If cells don't meet threshold for iou, they don't count as
    matching enough to share label with "matching" cell in img. Cells
    that don't have a match in img (new cells) get a new label so that
    output relabeled_next does not skip label values (unless label values
    present in prior image need to be skipped to avoid conflating labels).
    '''

    # relabel to remove skipped values, keeps subsequent predictions cleaner
    next_img = relabel_frame(next_img)

    #create np array that can hold all pairings between cells in one
    #image and cells in next image
    iou = np.zeros((np.max(img)+1, np.max(next_img)+1))

    vals = np.unique(img)
    cells = vals[np.nonzero(vals)]

    #nothing to predict off of
    if len(cells) == 0:
        return next_img

    next_vals = np.unique(next_img)
    next_cells = next_vals[np.nonzero(next_vals)]

    #no values to reassign
    if len(next_cells) == 0:
        return next_img

    #calculate IOUs
    for i in cells:
        for j in next_cells:
            intersection = np.logical_and(img==i,next_img==j)
            union = np.logical_or(img==i,next_img==j)
            iou[i,j] = intersection.sum(axis=(0,1)) / union.sum(axis=(0,1))

    #relabel cells appropriately

    #relabeled_next holds cells as they get relabeled appropriately
    relabeled_next = np.zeros(next_img.shape, dtype = np.uint16)

    #max_indices[cell_from_next_img] -> cell from first image that matches it best
    max_indices = np.argmax(iou, axis = 0)

    #put cells that into new image if they've been matched with another cell

    #keep track of which (next_img)cells don't have matches
    #this can be if (next_img)cell matched background, or if (next_img)cell matched
    #a cell already used
    unmatched_cells = []
    #don't reuse cells (if multiple cells in next_img match one particular cell)
    used_cells_src = []

    #next_cell ranges between 0 and max(next_img)
    #matched_cell is which cell in img matched next_cell the best

    # this for loop does the matching between cells
    for next_cell, matched_cell in enumerate(max_indices):
        #if more than one match, look for best match
        #otherwise the first match gets linked together, not necessarily reproducible

        # matched_cell != 0 prevents adding the background to used_cells_src
        if matched_cell != 0 and matched_cell not in used_cells_src:
            bool_matches = np.where(max_indices == matched_cell)
            count_matches = np.count_nonzero(bool_matches)
            if count_matches > 1:
                #for a given cell in img, which next_cell has highest iou
                matching_next_options = np.argmax(iou, axis =1)
                best_matched_next = matching_next_options[matched_cell]

                #ignore if best_matched_next is the background
                if best_matched_next != 0:
                    if next_cell != best_matched_next:
                        unmatched_cells = np.append(unmatched_cells, next_cell)
                        continue
                    else:
                        # don't add if bad match
                        if iou[matched_cell][best_matched_next] > threshold:
                            relabeled_next = np.where(next_img == best_matched_next, matched_cell, relabeled_next)

                        # if it's a bad match, we still need to add next_cell back into relabeled next later
                        elif iou[matched_cell][best_matched_next] <= threshold:
                            unmatched_cells = np.append(unmatched_cells, best_matched_next)

                        # in either case, we want to be done with the "matched_cell" from img
                        used_cells_src = np.append(used_cells_src, matched_cell)

            # matched_cell != 0 is still true
            elif count_matches == 1:
                #add the matched cell to the relabeled image
                if iou[matched_cell][next_cell] > threshold:
                    relabeled_next = np.where(next_img == next_cell, matched_cell, relabeled_next)
                else:
                    unmatched_cells = np.append(unmatched_cells, next_cell)

                used_cells_src = np.append(used_cells_src, matched_cell)

        elif matched_cell in used_cells_src and next_cell != 0:
            #skip that pairing, add next_cell to unmatched_cells
            unmatched_cells = np.append(unmatched_cells, next_cell)

        #if the cell in next_img didn't match anything (and is not the background):
        if matched_cell == 0 and next_cell !=0:
            unmatched_cells = np.append(unmatched_cells, next_cell)
            #note: this also puts skipped (nonexistent) labels into unmatched cells, main reason to relabel first

    #figure out which labels we should use to label remaining, unmatched cells

    #these are the values that have already been used in relabeled_next
    relabeled_values = np.unique(relabeled_next)[np.nonzero(np.unique(relabeled_next))]

    #to account for any new cells that appear, create labels by adding to the max number of cells
    #assumes that these are new cells and that all prev labels have been assigned
    #only make as many new labels as needed

    current_max = max(np.max(cells), np.max(relabeled_values)) + 1

    stringent_allowed = []
    for additional_needed in range(len(unmatched_cells)):
        stringent_allowed.append(current_max)
        current_max += 1

    #replace each unmatched cell with a value from the stringent_allowed list,
    #add that relabeled cell to relabeled_next
    if len(unmatched_cells) > 0:
        for reassigned_cell in range(len(unmatched_cells)):
            relabeled_next = np.where(next_img == unmatched_cells[reassigned_cell],
                                 stringent_allowed[reassigned_cell], relabeled_next)

    return relabeled_next


def relabel_frame(img, start_val = 1):
    '''relabel cells in frame starting from 1 without skipping values'''

    #cells in image to be relabeled
    cell_list = np.unique(img)
    cell_list = cell_list[np.nonzero(cell_list)]

    relabeled_cell_list = range(start_val, len(cell_list)+start_val)

    relabeled_img = np.zeros(img.shape, dtype = np.uint16)
    for i, cell in enumerate(cell_list):
        relabeled_img = np.where(img == cell, relabeled_cell_list[i], relabeled_img)

    return relabeled_img


def load_npz(filename):

    data = BytesIO(filename)
    npz = np.load(data)

    if 'y' in npz.files:
        raw_stack = npz['X']
        annotation_stack = npz['y']

    elif 'raw' in npz.files:
        raw_stack = npz['raw']
        annotation_stack = npz['annotated']
    else:
        raw_stack = npz[npz.files[0]]
        annotation_stack = npz[npz.files[1]]

    return {"raw": raw_stack, "annotated": annotation_stack}

# copied from:
# vanvalenlab/deepcell-tf/blob/master/deepcell/utils/tracking_utils.py3
def load_trks(trkfile):
    """Load a trk/trks file.
    Args:
        trks_file: full path to the file including .trk/.trks
    Returns:
        A dictionary with raw, tracked, and lineage data
    """
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(trkfile)
        with tarfile.open(temp.name, 'r') as trks:

            # numpy can't read these from disk...
            array_file = BytesIO()
            array_file.write(trks.extractfile('raw.npy').read())
            array_file.seek(0)
            raw = np.load(array_file)
            array_file.close()

            array_file = BytesIO()
            array_file.write(trks.extractfile('tracked.npy').read())
            array_file.seek(0)
            tracked = np.load(array_file)
            array_file.close()

            # trks.extractfile opens a file in bytes mode, json can't use bytes.
            __, file_extension = os.path.splitext(original_filename)

            if file_extension == '.trks':
                trk_data = trks.getmember('lineages.json')
                lineages = json.loads(trks.extractfile(trk_data).read().decode())
                # JSON only allows strings as keys, so convert them back to ints
                for i, tracks in enumerate(lineages):
                    lineages[i] = {int(k): v for k, v in tracks.items()}

            elif file_extension == '.trk':
                trk_data = trks.getmember('lineage.json')
                lineage = json.loads(trks.extractfile(trk_data).read().decode())
                # JSON only allows strings as keys, so convert them back to ints
                lineages = []
                lineages.append({int(k): v for k, v in lineage.items()})

        return {'lineages': lineages, 'raw': raw, 'tracked': tracked}
