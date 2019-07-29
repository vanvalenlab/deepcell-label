# Copyright 2018-2019 The Van Valen Lab at the California Institute of
# Technology (Caltech), with support from the Paul Allen Family Foundation,
# Google, & National Institutes of Health (NIH) under Grant U24CA224309-01.
# All rights reserved.
#
# Licensed under a modified Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.github.com/vanvalenlab/Caliban/LICENSE
#
# The Work provided may be used for non-commercial academic purposes only.
# For any other use of the Work, including commercial use, please contact:
# vanvalenlab@gmail.com
#
# Neither the name of Caltech nor the names of its contributors may be used
# to endorse or promote products derived from this software without specific
# prior written permission.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Displaying and Curating annotations tracked over time in multiple frames."""
from mode import Mode

import json
import numpy as np
import matplotlib.pyplot as plt
import os
import pathlib
import pyglet
import pyglet.gl as gl
import pyglet.window.key as key
import shutil
import sys
import tarfile
import tempfile

from io import BytesIO
from skimage.morphology import watershed, flood_fill
from skimage.measure import regionprops
from skimage.exposure import rescale_intensity

gl.glEnable(gl.GL_TEXTURE_2D)


class TrackReview:
    possible_keys = {"label", "daughters", "frames", "parent", "frame_div",
                     "capped"}
    def __init__(self, filename, lineage, raw, tracked):
        self.filename = filename
        self.tracks = lineage
        self.raw = raw
        self.tracked = tracked

        self.sidebar_width = 300

        # if not all of these keys are present, actions are not supported
        self.incomplete = {*self.tracks[1]} < TrackReview.possible_keys

        if self.incomplete:
            print("Incomplete trk file loaded. Missing keys: {}".format(
                TrackReview.possible_keys - {*self.tracks[1]}))
            print("Actions will not be supported")

        # `label` should appear first
        self.track_keys = ["label", *sorted(set(self.tracks[1]) - {"label"})]
        self.num_tracks = max(self.tracks) + 1

        self.num_frames, self.height, self.width, _ = raw.shape
        self.window = pyglet.window.Window(resizable=True)
        self.window.set_minimum_size(self.width + self.sidebar_width, self.height + 20)
        self.window.on_draw = self.on_draw
        self.window.on_key_press = self.on_key_press
        self.window.on_mouse_motion = self.on_mouse_motion
        self.window.on_mouse_scroll = self.on_mouse_scroll
        self.window.on_mouse_press = self.on_mouse_press

        self.current_frame = 0
        self.draw_raw = False
        self.max_intensity = None
        self.x = 0
        self.y = 0
        self.mode = Mode.none()
        self.adjustment = 0
        self.scale_factor = 1

        pyglet.app.run()

    def on_mouse_press(self, x, y, button, modifiers):
        if self.incomplete:
            print()
            print("This .trk file is incomplete.")
            print("Missing keys: {}".format(
                TrackReview.possible_keys - {*self.tracks[1]}))
            print("Actions will not be supported.")
            return

        if self.mode.kind is None:
            frame = self.tracked[self.current_frame]
            label = int(frame[self.y, self.x])
            if label != 0:
                self.mode = Mode("SELECTED",
                                 label=label,
                                 frame=self.current_frame,
                                 y_location=self.y, x_location=self.x)
        elif self.mode.kind == "SELECTED":
            frame = self.tracked[self.current_frame]
            label = int(frame[self.y, self.x])
            if label != 0:
                self.mode = Mode("MULTIPLE",
                                 label_1=self.mode.label,
                                 frame_1=self.mode.frame,
                                 y1_location = self.mode.y_location,
                                 x1_location = self.mode.x_location,
                                 label_2=label,
                                 frame_2=self.current_frame,
                                 y2_location = self.y,
                                 x2_location = self.x)

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        if self.draw_raw:
            if self.max_intensity == None:
                self.max_intensity = np.max(self.get_current_frame())
            else:
                self.max_intensity = max(self.max_intensity - 2 * scroll_y, 2)
        else:
            if self.num_tracks + (self.adjustment - 2 * scroll_y) >= 0:
                self.adjustment = self.adjustment - 2 * scroll_y

    def on_mouse_motion(self, x, y, dx, dy):
        x -= self.sidebar_width
        x //= self.scale_factor
        y = self.height - y // self.scale_factor

        if 0 <= x < self.width and 0 <= y < self.height:
            self.x, self.y = x, y

    def on_draw(self):
        self.window.clear()
        self.scale_screen()
        self.draw_current_frame()
        self.draw_line()
        self.draw_label()

    def scale_screen(self):
        #Scales sidebar width
        if self.window.width - self.width * self.scale_factor > 300:
            self.sidebar_width = self.window.width - self.width * self.scale_factor

        #Determine whether to base scale factor on width or height 
        if self.height < self.width:
            self.scale_factor = self.window.height // self.height
            if self.window.width < self.sidebar_width + self.width * self.scale_factor:
                self.window.set_size(self.sidebar_width + self.width * self.scale_factor, self.window.height)

        elif self.height >= self.width:
            self.scale_factor = self.window.width // self.width
            if self.window.height < self.height * self.scale_factor:
                self.window.set_size(self.window.height, self.height * self.scale_factor)

    def on_key_press(self, symbol, modifiers):
        # Set scroll speed (through sequential frames) with offset
        offset = 5 if modifiers & key.MOD_SHIFT else 1
        if symbol == key.ESCAPE:
            self.mode = Mode.none()
        elif symbol in {key.LEFT, key.A}:
            self.current_frame = max(self.current_frame - offset, 0)
        elif symbol in {key.RIGHT, key.D}:
            self.current_frame = min(self.current_frame + offset, self.num_frames - 1)
        elif symbol == key.Z:
            self.draw_raw = not self.draw_raw
        else:
            self.mode_handle(symbol)

    def mode_handle(self, symbol):
        if symbol == key.C:
            if self.mode.kind == "SELECTED":
                self.mode = Mode("QUESTION",
                                 action="NEW TRACK", **self.mode.info)
        if symbol == key.P:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="PARENT", **self.mode.info)
        if symbol == key.R:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="REPLACE", **self.mode.info)
        if symbol == key.S:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="SWAP", **self.mode.info)
            elif self.mode.kind is None:
                self.mode = Mode("QUESTION",
                                 action="SAVE")
        if symbol == key.W:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="WATERSHED", **self.mode.info)


        if symbol == key.SPACE:
            if self.mode.kind == "QUESTION":
                if self.mode.action == "SAVE":
                    self.save()
                elif self.mode.action == "NEW TRACK":
                    self.action_new_track()
                elif self.mode.action == "PARENT":
                    self.action_parent()
                elif self.mode.action == "REPLACE":
                    self.action_replace()
                elif self.mode.action == "SWAP":
                    self.action_swap()
                elif self.mode.action == "WATERSHED":
                    self.action_watershed()
                self.mode = Mode.none()

    def get_current_frame(self):
        if self.draw_raw:
            return self.raw[self.current_frame]
        else:
            return self.tracked[self.current_frame]

    def draw_line(self):
        pyglet.graphics.draw(4, pyglet.gl.GL_LINES,
            ("v2f", (self.sidebar_width, self.window.height,
                     self.sidebar_width, 0,
                     self.sidebar_width, 0,
                     self.window.width, 0))
        )

    def draw_label(self):
        # always use segmented output for label, not raw
        frame = self.tracked[self.current_frame]
        label = int(frame[self.y, self.x])
        if label != 0:
            track = self.tracks[label].copy()
            frames = list(map(list, consecutive(track["frames"])))
            frames = '[' + ', '.join(["{}".format(a[0])
                                if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                for a in frames]) + ']'

            track["frames"] = frames
            text = '\n'.join("{:10} {}".format(k+':', track[k])
                             for k in self.track_keys)
        else:
            text = ''

        text += self.mode.render()

        info_label = pyglet.text.Label(text, font_name="monospace",
                                       anchor_x="left", anchor_y="bottom",
                                       width=self.sidebar_width,
                                       multiline=True,
                                       x=5, y=5, color=[255]*4)

        frame_label = pyglet.text.Label("frame: {}".format(self.current_frame),
                                        font_name="monospace",
                                        anchor_x="left", anchor_y="top",
                                        width=self.sidebar_width,
                                        multiline=True,
                                        x=5, y=self.window.height - 5,
                                        color=[255]*4)

        info_label.draw()
        frame_label.draw()

    def draw_current_frame(self):
        frame = self.get_current_frame()
        with tempfile.TemporaryFile() as file:
            if self.draw_raw:
                plt.imsave(file, frame[:, :, 0],
                           vmax=self.max_intensity,
                           cmap="cubehelix",
                           format="png")
            else:
                plt.imsave(file, frame[:, :, 0],
                           vmin=0,
                           vmax=self.num_tracks + self.adjustment,
                           cmap="cubehelix",
                           format="png")
            image = pyglet.image.load("frame.png", file)

            sprite = pyglet.sprite.Sprite(image, x=self.sidebar_width, y=0)
            sprite.update(scale_x=self.scale_factor,
                          scale_y=self.scale_factor)

            gl.glTexParameteri(gl.GL_TEXTURE_2D,
                               gl.GL_TEXTURE_MAG_FILTER,
                               gl.GL_NEAREST)
            sprite.draw()

    def action_new_track(self):
        """
        Replacing label
        """
        old_label, start_frame = self.mode.label, self.mode.frame
        new_label = self.num_tracks + 1
        self.num_tracks += 1

        if start_frame == 0:
            raise ValueError("new_track cannot be called on the first frame")

        # replace frame labels
        for frame in self.tracked[start_frame:]:
            frame[frame == old_label] = new_label

        # replace fields
        track_old = self.tracks[old_label]
        track_new = self.tracks[new_label] = {}

        idx = track_old["frames"].index(start_frame)
        frames_before, frames_after = track_old["frames"][:idx], track_old["frames"][idx:]

        track_old["frames"] = frames_before
        track_new["frames"] = frames_after

        track_new["label"] = new_label
        track_new["daughters"] = track_old["daughters"]
        track_new["frame_div"] = track_old["frame_div"]
        track_new["capped"] = track_old["capped"]
        track_new["parent"] = None

        track_old["daughters"] = []
        track_old["frame_div"] = None
        track_old["capped"] = True


    def action_watershed(self):
        # Pull the label that is being split and find a new valid label
        current_label = self.mode.label_1
        new_label = self.num_tracks + 1

        # Locally store the frames to work on
        img_raw = self.raw[self.current_frame]
        img_ann = self.tracked[self.current_frame]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotaiton imgs
        seeds_labeled = np.zeros(img_ann.shape)
        # create two seed locations
        seeds_labeled[self.mode.y1_location, self.mode.x1_location]=current_label
        seeds_labeled[self.mode.y2_location, self.mode.x2_location]=new_label

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

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.tracked[self.current_frame] = img_ann

        # current label doesn't change, but add the neccesary bookkeeping for the new track
        track_new = self.tracks[new_label] = {}
        track_new["label"] = new_label
        track_new["frames"] = [self.current_frame]
        track_new["parent"] = None
        track_new["daughters"] = []
        track_new["frame_div"] = None
        track_new["capped"] = False


    def action_swap(self):
        def relabel(old_label, new_label):
            for frame in self.tracked:
                frame[frame == old_label] = new_label

            # replace fields
            track_new = self.tracks[new_label] = self.tracks[old_label]
            track_new["label"] = new_label
            del self.tracks[old_label]

            for d in track_new["daughters"]:
                self.tracks[d]["parent"] = new_label

        relabel(self.mode.label_1, -1)
        relabel(self.mode.label_2, self.mode.label_1)
        relabel(-1, self.mode.label_2)

    def action_parent(self):
        """
        label_1 gave birth to label_2
        """
        label_1, label_2, frame_div = self.mode.label_1, self.mode.label_2, self.mode.frame_2

        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        track_1["daughters"].append(label_2)
        track_2["parent"] = label_1
        track_1["frame_div"] = frame_div


    def action_replace(self):
        """
        Replacing label_2 with label_1
        """
        label_1, label_2 = self.mode.label_1, self.mode.label_2


        # replace arrays
        for frame in self.tracked:
            frame[frame == label_2] = label_1

        # replace fields
        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        for d in track_1["daughters"]:
            self.tracks[d]["parent"] = None

        track_1["frames"] = sorted(set(track_1["frames"] + track_2["frames"]))
        track_1["daughters"] = track_2["daughters"]
        track_1["frame_div"] = track_2["frame_div"]
        track_1["capped"] = track_2["capped"]

        del self.tracks[label_2]
        for _, track in self.tracks.items():
            try:
                track["daughters"].remove(label_2)
            except ValueError:
                pass

        # in case label_2 was a daughter of label_1
        try:
            track_1["daughters"].remove(label_2)
        except ValueError:
            pass

    def save(self):
        backup_file = self.filename + "_original.trk"
        if not os.path.exists(backup_file):
            shutil.copyfile(self.filename + ".trk", backup_file)

        with tarfile.open(self.filename + ".trk", "w") as trks:
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
                
class ZStackReview:
    def __init__(self, filename, raw, annotated):
        self.filename = filename
        self.raw = raw
        self.annotated = annotated

        self.sidebar_width = 300
        
        #create a dictionary that has frame information about each cell
        #analogous to .trk lineage but do not need relationships between cells included
        self.cell_ids = np.unique(annotated)[np.nonzero(np.unique(annotated))]
        self.num_cells = max(self.cell_ids)
        self.cell_info = {}
        for cell in self.cell_ids:
            self.cell_info[cell] = {}
            self.cell_info[cell]['label'] = str(cell)
            self.cell_info[cell]['frames'] = [] 
            
            for frame in range(self.annotated.shape[0]):
                if cell in annotated[frame,:,:]:
                    self.cell_info[cell]['frames'].append(frame)
            self.cell_info[cell]['slices'] = ''

        #don't display 'frames' just 'slices' (updated on_draw)
        self.display_info = [*sorted(set(self.cell_info[1]) - {'frames'})]
        
        # `label` should appear first
        
#        self.track_keys = ["label", *sorted(set(self.tracks[1]) - {"label"})]
#        self.num_tracks = max(self.tracks) + 1
        try:    
            self.num_frames, self.height, self.width, _ = raw.shape
        except:
            self.num_frames, self.height, self.width = raw.shape
            
        self.window = pyglet.window.Window(resizable=True)
        self.window.set_minimum_size(self.width + self.sidebar_width, self.height + 20)
        self.window.on_draw = self.on_draw
        self.window.on_key_press = self.on_key_press
        self.window.on_mouse_motion = self.on_mouse_motion
        self.window.on_mouse_scroll = self.on_mouse_scroll
        self.window.on_mouse_press = self.on_mouse_press

        self.current_frame = 0
        self.draw_raw = False
        self.max_intensity = None
        self.x = 0
        self.y = 0
        self.mode = Mode.none()
        self.adjustment = 0
        self.scale_factor = 1
        
        self.hole_fill_seed = None
        self.save_version = 0

        pyglet.app.run()
        
    def on_mouse_press(self, x, y, button, modifiers):

        if self.mode.kind is None:
            frame = self.annotated[self.current_frame]
            label = int(frame[self.y, self.x])
            if label != 0:
                self.mode = Mode("SELECTED",
                                 label=label,
                                 frame=self.current_frame,
                                 y_location=self.y, x_location=self.x)
        elif self.mode.kind == "SELECTED":
            frame = self.annotated[self.current_frame]
            label = int(frame[self.y, self.x])
            if label != 0:
                self.mode = Mode("MULTIPLE",
                                 label_1=self.mode.label,
                                 frame_1=self.mode.frame,
                                 y1_location = self.mode.y_location,
                                 x1_location = self.mode.x_location,
                                 label_2=label,
                                 frame_2=self.current_frame,
                                 y2_location = self.y,
                                 x2_location = self.x)
        elif self.mode.kind == "PROMPT" and self.mode.action == "FILL HOLE":
            frame = self.annotated[self.current_frame]
            label = int(frame[self.y, self.x])
            if label == 0:
                self.hole_fill_seed = (self.y, self.x)
            if self.hole_fill_seed is not None:
                self.action_fill_hole()
                self.mode = Mode.none()

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        if self.draw_raw:
            if self.max_intensity == None:
                self.max_intensity = np.max(self.get_current_frame())
            else:
                self.max_intensity = max(self.max_intensity - 2 * scroll_y, 2)
        else:
            if self.num_cells + (self.adjustment - 1 * scroll_y) > 0:
                self.adjustment = self.adjustment - 1 * scroll_y

    def on_mouse_motion(self, x, y, dx, dy):
        x -= self.sidebar_width
        x //= self.scale_factor
        y = self.height - y // self.scale_factor

        if 0 <= x < self.width and 0 <= y < self.height:
            self.x, self.y = x, y

    def on_draw(self):
        self.window.clear()
        self.scale_screen()
        self.draw_current_frame()
        self.draw_line()
        self.draw_label()

    def scale_screen(self):
        #User can resize window and images will expand to fill space if possible
        #Determine whether to base scale factor on width or height 
        y_scale = self.window.height // self.height
        x_scale = (self.window.width - 300) // self.width
        self.scale_factor = min(y_scale, x_scale)

    def on_key_press(self, symbol, modifiers):
        # Set scroll speed (through sequential frames) with offset
        offset = 5 if modifiers & key.MOD_SHIFT else 1
        if symbol == key.ESCAPE:
            self.mode = Mode.none()
        elif symbol in {key.LEFT, key.A}:
            self.current_frame = max(self.current_frame - offset, 0)
        elif symbol in {key.RIGHT, key.D}:
            self.current_frame = min(self.current_frame + offset, self.num_frames - 1)
        elif symbol == key.Z:
            self.draw_raw = not self.draw_raw
        else:
            self.mode_handle(symbol)

    def mode_handle(self, symbol):

        if symbol == key.C:
            if self.mode.kind == "SELECTED":
                self.mode = Mode("QUESTION",
                                action="CREATE NEW", **self.mode.info)
                                
        if symbol == key.F:
            if self.mode.kind == "SELECTED":
                self.mode = Mode("PROMPT",
                                action="FILL HOLE", **self.mode.info)
                                
        if symbol == key.S:
            if self.mode.kind is None:
                self.mode = Mode("QUESTION",
                                 action="SAVE")
            elif self.mode.kind == "QUESTION" and self.mode.action == "CREATE NEW":
                self.action_new_single_cell()
                self.mode = Mode.none()
            elif self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="SWAP", **self.mode.info)
            elif self.mode.kind == "QUESTION" and self.mode.action == "SWAP":
                self.action_swap_single_frame()
                self.mode = Mode.none()
        
        if symbol == key.R:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="REPLACE", **self.mode.info)
                                 
        if symbol == key.X:
            if self.mode.kind == "SELECTED":
                self.mode = Mode("QUESTION",
                                action="DELETE", **self.mode.info)
        
        if symbol == key.W:
            if self.mode.kind == "MULTIPLE":
                self.mode = Mode("QUESTION",
                                 action="WATERSHED", **self.mode.info)

        if symbol == key.SPACE:
            if self.mode.kind == "QUESTION":
                if self.mode.action == "REPLACE":
                    self.action_replace()
                elif self.mode.action == "CREATE NEW":
                    self.action_new_cell_stack()
                elif self.mode.action == "SWAP":
                    self.action_swap_all()
                elif self.mode.action == "DELETE":
                    self.action_delete_mask()
                elif self.mode.action == "WATERSHED":
                    self.action_watershed()
                elif self.mode.action == "SAVE":
                    self.save()
                self.mode = Mode.none()

    def get_current_frame(self):
        if self.draw_raw:
            return self.raw[self.current_frame]
        else:
            return self.annotated[self.current_frame]

    def draw_line(self):
        pyglet.graphics.draw(4, pyglet.gl.GL_LINES,
            ("v2f", (self.sidebar_width, self.window.height,
                     self.sidebar_width, 0,
                     self.sidebar_width, 0,
                     self.window.width, 0))
        )

    def draw_label(self):
        # always use segmented output for label, not raw
        frame = self.annotated[self.current_frame]
        label = int(frame[self.y, self.x])
        if label != 0:
            cell_info = self.cell_info[label].copy()

            slices = list(map(list, consecutive(cell_info['frames'])))
            slices = '[' + ', '.join(["{}".format(a[0])
                                if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                for a in slices]) + ']'
                                
            self.cell_info[label].update({'slices' : slices})

            text = '\n'.join("{:10}{}".format(str(k)+':', self.cell_info[label][k])
                              for k in self.display_info)
        else:
            text = ''

        text += self.mode.render()

        info_label = pyglet.text.Label(text, font_name="monospace",
                                       anchor_x="left", anchor_y="bottom",
                                       width=self.sidebar_width,
                                       multiline=True,
                                       x=5, y=5, color=[255]*4)

        frame_label = pyglet.text.Label("frame: {}".format(self.current_frame),
                                        font_name="monospace",
                                        anchor_x="left", anchor_y="top",
                                        width=self.sidebar_width,
                                        multiline=True,
                                        x=5, y=self.window.height - 5,
                                        color=[255]*4)

        info_label.draw()
        frame_label.draw()

    def draw_current_frame(self):
        frame = self.get_current_frame()
        with tempfile.TemporaryFile() as file:
            if self.draw_raw:
                plt.imsave(file, frame[:,:],
                #plt.imsave(file, frame[:, :, 0],
                           vmax=self.max_intensity,
                           cmap="cubehelix",
                           format="png")
            else:
                plt.imsave(file, frame[:,:],
                #plt.imsave(file, frame[:, :, 0],
                           vmin=0,
                           vmax= self.num_cells + self.adjustment,
                           cmap="cubehelix",
                           format="png")
            image = pyglet.image.load("frame.png", file)

            sprite = pyglet.sprite.Sprite(image, x=self.sidebar_width, y=0)
            sprite.update(scale_x=self.scale_factor,
                          scale_y=self.scale_factor)

            gl.glTexParameteri(gl.GL_TEXTURE_2D,
                               gl.GL_TEXTURE_MAG_FILTER,
                               gl.GL_NEAREST)
            sprite.draw()
            
    def action_new_single_cell(self):
        """
        Create new label in just one frame
        """
        old_label, single_frame = self.mode.label, self.mode.frame
        new_label = self.num_cells + 1
        self.num_cells += 1

        # replace frame labels
        frame = self.annotated[single_frame]
        frame[frame == old_label] = new_label

        # replace fields
        old_label_frames = self.cell_info[old_label]['frames']
        if old_label_frames == [single_frame]:
            del self.cell_info[old_label]
        else:
            updated_frames = np.delete(old_label_frames, np.where(old_label_frames == np.int64(single_frame)))
            self.cell_info[old_label].update({'frames': updated_frames})
            
        self.cell_info.update({new_label: {}})
        self.cell_info[new_label].update({'label': str(new_label)})
        self.cell_info[new_label].update({'frames': [single_frame]})
        self.cell_info[new_label].update({'slices': ''})
        
        np.append(self.cell_ids, new_label)
        
    def action_new_cell_stack(self):          
        """
        Creates new cell label and replaces original label with it in all subsequent frames
        """
        old_label, start_frame = self.mode.label, self.mode.frame
        new_label = self.num_cells + 1
        self.num_cells += 1

        # replace frame labels
        for frame in self.annotated[start_frame:]:
            frame[frame == old_label] = new_label
            
        # replace fields
        old_label_frames = self.cell_info[old_label]['frames']
        new_label_frames = []
        
        for frame in range(self.annotated.shape[0]):
            if new_label in self.annotated[frame,:,:]:
                new_label_frames.append(frame)

        updated_old_label_frames = np.setdiff1d(old_label_frames, new_label_frames)

        if updated_old_label_frames == []:
            del self.cell_info[old_label]
        else:
            self.cell_info[old_label].update({'frames': updated_old_label_frames})     
            
        self.cell_info.update({new_label: {}})
        self.cell_info[new_label].update({'label': str(new_label)})
        self.cell_info[new_label].update({'frames': new_label_frames})
        self.cell_info[new_label].update({'slices': ''})
        
        np.append(self.cell_ids, new_label)
            
    def action_replace(self):
        """
        Replacing label_2 with label_1
        """
        label_1, label_2 = self.mode.label_1, self.mode.label_2

        # replace arrays
        for frame in self.annotated:
            frame[frame == label_2] = label_1
            
        # update cell_info dict
        del self.cell_info[label_2]
        self.cell_ids = np.delete(self.cell_ids, np.where(self.cell_ids == label_2))
        
    def action_swap_all(self):
        label_1 = self.mode.label_1
        label_2 = self.mode.label_2
        
        for frame in range(self.annotated.shape[0]):
            ann_img = self.annotated[frame]
            ann_img = np.where(ann_img == label_1, -1, ann_img)
            ann_img = np.where(ann_img == label_2, label_1, ann_img)
            ann_img = np.where(ann_img == -1, label_2, ann_img)
            self.annotated[frame] = ann_img
            
        #update cell_info
        cell_info_1 = self.cell_info[label_1].copy()
        cell_info_2 = self.cell_info[label_2].copy()
        self.cell_info[label_1].update({'frames': cell_info_2['frames']})
        self.cell_info[label_2].update({'frames': cell_info_1['frames']})
        
    def action_swap_single_frame(self):
        label_1 = self.mode.label_1
        label_2 = self.mode.label_2
        
        frame = self.current_frame
        
        ann_img = self.annotated[frame]
        ann_img = np.where(ann_img == label_1, -1, ann_img)
        ann_img = np.where(ann_img == label_2, label_1, ann_img)
        ann_img = np.where(ann_img == -1, label_2, ann_img)
        
        self.annotated[frame] = ann_img

    def action_watershed(self):
        # Pull the label that is being split and find a new valid label
        current_label = self.mode.label_1
        new_label = self.num_cells + 1

        # Locally store the frames to work on
        img_raw = self.raw[self.current_frame]
        img_ann = self.annotated[self.current_frame]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotaiton imgs
        seeds_labeled = np.zeros(img_ann.shape)
        # create two seed locations
        seeds_labeled[self.mode.y1_location, self.mode.x1_location]=current_label
        seeds_labeled[self.mode.y2_location, self.mode.x2_location]=new_label

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

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.annotated[self.current_frame] = img_ann
        
        #update cell_info dict
        self.cell_info.update({new_label: {}})
        self.cell_info[new_label].update({'label': str(new_label)})
        self.cell_info[new_label].update({'frames': [self.current_frame]})
        self.cell_info[new_label].update({'slices': ''})
        
        np.append(self.cell_ids, new_label)
        
        self.num_cells += 1
        
        label = self.mode.label
        
    def action_delete_mask(self):
        '''
        remove selected annotation from frame, replacing with zeros
        '''
        
        label = self.mode.label
        frame = self.current_frame
        
        ann_img = self.annotated[frame]
        ann_img = np.where(ann_img == label, 0, ann_img)
        
        self.annotated[frame] = ann_img
        
        #update cell_info
        if self.cell_info[label]['frames'] == [frame]:
            del self.cell_info[label]
        else:
            old_frames = self.cell_info[label]['frames']
            updated_frames = np.delete(old_frames, np.where(old_frames == np.int64(frame)))
            self.cell_info[label].update({'frames': updated_frames})
        
    def action_fill_hole(self):
        '''
        fill a "hole" in a cell annotation with the cell label
        '''
        img_ann = self.annotated[self.current_frame]
        
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, self.mode.label, connectivity = 1)
        self.annotated[self.current_frame] = filled_img_ann
                
    def save(self):
        save_file = self.filename + "_save_version_{}.npz".format(self.save_version)
        np.savez(save_file, raw = self.raw, annotated = self.annotated)
        self.save_version += 1

def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0]+1)


def load_trk(filename):
    with tarfile.open(filename, "r") as trks:
        # trks.extractfile opens a file in bytes mode, json can't use bytes.
        lineage = json.loads(
                trks.extractfile(
                    trks.getmember("lineage.json")).read().decode())

        # numpy can't read these from disk...
        array_file = BytesIO()
        array_file.write(trks.extractfile("raw.npy").read())
        array_file.seek(0)
        raw = np.load(array_file)
        array_file.close()

        array_file = BytesIO()
        array_file.write(trks.extractfile("tracked.npy").read())
        array_file.seek(0)
        tracked = np.load(array_file)
        array_file.close()

    # JSON only allows strings as keys, so we convert them back to ints here
    lineage = {int(k): v for k, v in lineage.items()}

    return {"lineage": lineage, "raw": raw, "tracked": tracked}
    
def load_npz(filename):
    npz = np.load(filename)
    try:
        raw_stack = npz['raw']
        annotation_stack = npz['annotated']
    except:
        raw_stack = npz[npz.files[0]]
        annotation_stack = npz[npz.files[1]]
        
    return {"raw": raw_stack, "annotated": annotation_stack}
    

def review(filename):
    filetype = os.path.splitext(filename)[1]
    if filetype == '.trk':
        track_review = TrackReview(str(pathlib.Path(filename).with_suffix('')),
            **load_trk(filename))
    if filetype == '.npz':
        zstack_review = ZStackReview(str(pathlib.Path(filename).with_suffix('')),
            **load_npz(filename))
            


if __name__ == "__main__":
    review(sys.argv[1])

