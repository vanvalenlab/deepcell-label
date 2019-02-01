from imgutils import pngify
from matplotlib.colors import hsv_to_rgb, LinearSegmentedColormap
from random import random

import copy
import matplotlib
import numpy as np
import os
import pickle
import random
import tempfile


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0]+1)


class TrackReview:
    def __init__(self, filename):
        self.trial = self.load(filename)
        self.tracks = self.trial["tracks"]
        self.num_tracks = max(self.tracks) + 1
        self.max_frames = self.trial["X"].shape[0]
        self.dimensions = self.trial["X"].shape[1:3][::-1]
        self.color_map = self.random_colormap()


    def random_colormap(self):
        max_val = max(self.tracks)

        # this is a random map from [0, max_val - 1] -> [1, max_val]
        shuffle_idx = list(range(1, max_val + 1))
        random.shuffle(shuffle_idx)

        colors = [(0, 0, 0), *[list(hsv_to_rgb([shuffle_idx[i] / max_val, 1, 1]))
                             for i in range(max_val)]]
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
            frame = self.trial["X"][frame][:,:,0]
            return pngify(frame, vmin=0, vmax=None, cmap="cubehelix")
        else:
            frame = self.trial["y"][frame][:,:,0]
            return pngify(frame,
                         vmin=0,
                         vmax=self.num_tracks,
                         cmap=self.color_map)

    def load(self, filename):
        with open(os.path.join("../data", filename), "rb") as file:
            return pickle.load(file)

    def action(self, action_type, info):
        if action_type == "set_parent":
            self.action_set_parent(**info)
        elif action_type == "replace":
            self.action_replace(**info)
        elif action_type == "new_track":
            self.action_new_track(**info)
        elif action_type == "swap_tracks":
            self.action_swap_tracks(**info)
        else:
            raise ValueError("Invalid action '{}'".format(action_type))

    def action_swap_tracks(self, label_1, label_2, frame_1, frame_2):
        def relabel(old_label, new_label):
            for frame in self.trial["y"]:
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
        for frame in self.trial["y"]:
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
        for frame in self.trial["y"][start_frame:]:
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

