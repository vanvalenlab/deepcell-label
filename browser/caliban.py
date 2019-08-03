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
from skimage.morphology import watershed
from skimage.measure import regionprops
from skimage.exposure import rescale_intensity

# Withheld keys and secret code currently prevents the application from successfully retrieving files from S3 bucket.
S3_KEY ='WITHELD'
S3_SECRET ='WITHELD'
S3_BUCKET = 'caliban-output'

# ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'trk'])

# def allowed_file(name):
#     return "." in name and name.split(".")[1].lower() in ALLOWED_EXTENSIONS

# Connect to the s3 service
s3 = boto3.client(
    "s3",
    aws_access_key_id=S3_KEY,
    aws_secret_access_key=S3_SECRET
)


class TrackReview:
    def __init__(self, filename):
        self.filename = filename
        self.trial = self.load(filename)

        # lineages is a list of dictionaries. There should be only a single one
        # when using a .trk file
        if len(self.trial["lineages"]) != 1:
            raise ValueError("Input file has multiple trials/lineages.")

        self.tracks = self.trial["lineages"][0]


        self.num_tracks = max(self.tracks)
        self.max_frames = self.trial["raw"].shape[0]
        self.dimensions = self.trial["raw"].shape[1:3][::-1]
        self.color_map = self.random_colormap()

        self.highlight = False
        self.highlight_cell_one = -1
        self.highlight_cell_two = -1

    def random_colormap(self):
        max_val = max(self.tracks)

        # this is a random map from [0, max_val - 1] -> [1, max_val]
        shuffle_idx = list(range(1, max_val + 1))
        # check if workers really prefer this
        #random.shuffle(shuffle_idx)

        shuffle_idx = [shuffle_idx[i] * .8 for i in range(max_val)]

        colors = [(0, 0, 0), * (list(hsv_to_rgb([shuffle_idx[i] / max_val, 1, 1]))
                             for i in range(max_val))]

        return LinearSegmentedColormap.from_list('new_map',
                                                 colors,
                                                 N=max_val + 1)
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

    @property
    def png_colormap(self):
        return {str(self.color_map(v, bytes=True)): int(v)
                  for v in range(max(self.tracks) + 1)}

    def get_frame(self, frame, raw):
        if raw:
            frame = self.trial["raw"][frame][:,:,0]
            return pngify(imgarr=frame, 
                          vmin=0, 
                          vmax=None, 
                          cmap="cubehelix")
        else:

            frame = self.trial["tracked"][frame][:,:,0]
            self.color_map.set_bad('red')
        
            print(self.highlight_cell_one)
            print(self.highlight_cell_two)
            if (self.highlight):
                if (self.highlight_cell_one != -1):
                    frame = np.ma.masked_equal(frame, self.highlight_cell_one)
                if (self.highlight_cell_two != -1):
                    frame = np.ma.masked_equal(frame, self.highlight_cell_two)

            return pngify(imgarr=frame,
                         vmin=0,
                         vmax=self.num_tracks,
                         cmap=self.color_map)

    def load(self, filename):
        global original_filename
        original_filename = filename
 
        s3 = boto3.client('s3')
        response = s3.get_object(Bucket="caliban-input", Key=filename)
        return load_trks(response['Body'].read())

    def action(self, action_type, info):

        if action_type == "set_parent":
            self.action_set_parent(**info)
        elif action_type == "replace":
            self.action_replace(**info)
        elif action_type == "new_track":
            self.action_new_track(**info)
        elif action_type == "swap_tracks":
            self.action_swap_tracks(**info)
        elif action_type == "save_track":
            self.action_save_track(**info)
        elif action_type == "watershed":
            self.action_watershed(**info)
        elif action_type == "delete_cell":
            self.action_delete(**info)
        elif action_type == "change_highlight":
            self.highlight = not self.highlight
        elif action_type == "change_highlighted_cells":
            self.action_change_highlighted_cells(**info)
        else:
            raise ValueError("Invalid action '{}'".format(action_type))


    def action_change_highlighted_cells(self, cell_one, cell_two, decrease, increase):
        self.highlight_cell_one = cell_one
        self.highlight_cell_two = cell_two

        if (self.highlight_cell_two != -1):
            if increase != -1:
                if (self.highlight_cell_two < self.num_tracks):
                    self.highlight_cell_two += 1
                else:
                    self.highlight_cell_two = 1
            elif decrease != -1:
                if (self.highlight_cell_two > 1):
                    self.highlight_cell_two -= 1
                else:
                    self.highlight_cell_two = self.num_tracks

    def action_watershed(self, label_1, label_2, frame, x1_location, y1_location, x2_location, y2_location):

        # Pull the label that is being split and find a new valid label
        current_label = label_1
        new_label = self.num_tracks + 1

        # Locally store the frames to work on
        img_raw = self.trial["raw"][frame]
        img_ann = self.trial["tracked"][frame]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotaiton imgs
        seeds_labeled = np.zeros(img_ann.shape)
        
        # create two seed locations
        seeds_labeled[int(y1_location / 2), int(x1_location / 2)] = current_label
        seeds_labeled[int(y2_location / 2), int(x2_location / 2)] = new_label

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

        cell_loc = np.where(img_sub_ann == current_label)
        img_sub_ann[cell_loc] = ws[cell_loc]

        #reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.trial["tracked"][frame] = img_ann

        # current label doesn't change, but add the neccesary bookkeeping for the new track
        track_new = self.tracks[new_label] = {}
        track_new["label"] = new_label
        track_new["frames"] = [frame]
        track_new["parent"] = None
        track_new["daughters"] = []
        track_new["frame_div"] = None
        track_new["capped"] = False


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
                np.save(raw_file, self.trial["raw"])
                raw_file.flush()
                trks.add(raw_file.name, "raw.npy")

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, self.trial["tracked"])
                tracked_file.flush()
                trks.add(tracked_file.name, "tracked.npy")
        try:  
            s3.upload_file(file, S3_BUCKET, file)

        except Exception as e:
            print("Something Happened: ", e, file=sys.stderr)
            raise

        os.remove(file)
        return "Success!"

    def action_swap_tracks(self, label_1, label_2, frame_1, frame_2):
        def relabel(old_label, new_label):
            for frame in self.trial["tracked"]:
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

    def action_set_parent(self, label_1, label_2, frame_1, frame_2):
        """
        label_1 gave birth to label_2
        """
        frame_div = frame_2

        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        track_1["daughters"].append(label_2)
        track_2["parent"] = label_1
        track_1["frame_div"] = frame_div

    def action_replace(self, label_1, label_2, frame_1, frame_2):
        """
        Replacing label_2 with label_1
        """
        # replace arrays
        for frame in self.trial["tracked"]:
            frame[frame == label_2] = label_1

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

    def action_delete(self, label, frame):
        """
        Deletes label from current frame only
        """
        selected_label, current_frame = label, frame

        # Set frame labels to 0
        for frame in self.trial["tracked"][current_frame]:
            frame[frame == selected_label] = 0

        # Removes current frame from list of frames cell appears in
        selected_track = self.tracks[selected_label]
        selected_track["frames"].remove(current_frame)

        # Deletes lineage data if current frame is only frame cell appears in
        if not selected_track["frames"]:
            del self.tracks[selected_label]
            for _, track in self.tracks.items():
                try:
                    track["daughters"].remove(selected_label)
                except ValueError:
                    pass

    def action_new_track(self, label, frame):
        """
        Replacing label
        """
        old_label, start_frame = label, frame
        new_label = self.num_tracks + 1
        self.num_tracks += 1

        if start_frame == 0:
            raise ValueError("new_track cannot be called on the first frame")

        # replace frame labels
        for frame in self.trial["tracked"][start_frame:]:
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

        self.color_map = self.random_colormap()

def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0]+1)

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

