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

import argparse
import cv2
import json
import math
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
from skimage.morphology import watershed, flood_fill, flood, dilation, disk
from skimage.draw import circle
from skimage.measure import regionprops
from skimage.exposure import rescale_intensity, equalize_adapthist
from skimage import color, img_as_float, filters
from skimage.util import invert
from skimage.segmentation import find_boundaries

import matplotlib.cm as cmaps
from matplotlib.colors import Normalize

gl.glEnable(gl.GL_TEXTURE_2D)

platform = pyglet.window.get_platform()
display = platform.get_default_display()
USER_SCREEN = display.get_default_screen()

class CalibanWindow:
    '''
    Pyglet window and associated functions for displaying images in the window.
    For now, also contains some other methods as a first pass at splitting out
    functionality from its child classes (TrackReview and ZStackReview), namely
    for label generation and responses to mouse input.

    This parent class does not contain any methods for using keybinds or
    applying actions to data.

    To work correctly, child classes must provide their own methods for:
    get_raw_current_frame
    get_ann_current_frame
    get_label
    get_max_label
    handle_draw
    handle_threshold
    create_frame_text
    get_label_info

    And must contain attributes:
    brush (CalibanBrush)
    mode (Mode)
    highlight (bool)
    highlighted_cell_one (int)
    highlighted_cell_two (int)
    current_frame (int)
    hole_fill_seed (tuple of ints (y,x))
    current_cmap (string for valid matplotlib cmap)
    adjustment (int)
    max_intensity (float)
    '''
    # 8bit RGB color values for misc display methods
    white = (255, 255, 255)
    red = (255, 0, 0)
    black = (0, 0, 0)

    # blank area to the left of displayed image where text info is displayed
    sidebar_width = 300

    # pad image with blank area so we can draw a border around it
    image_padding = 10

    # window is always a resizable pyglet window
    window = pyglet.window.Window(resizable=True)

    # use crosshair cursor instead of usual cursor
    cursor = window.get_system_mouse_cursor(window.CURSOR_CROSSHAIR)
    window.set_mouse_cursor(cursor)

    def __init__(self):
        '''
        Initialize CalibanWindow by binding events to window and setting display
        attributes (eg, raw image adjustment toggles, colormap for creating overlaid
        labels, scale factor, zoom bookkeeping, which view to display, and an empty
        composite_view).
        '''
        # stores the location of mouse on screen (used to update mouse pos in image
        # if image changes without cursor changing location)
        self._mouse_x = 0
        self._mouse_y = 0

        # how much to scale image by (start with no scaling, but can expand to
        # fill window when window changes size)
        self.scale_factor = 1

        # start at 1x zoom
        self.zoom = 1

        # starting point for currently visible x and y portions of displayed array
        self.view_start_y = 0
        self.view_start_x = 0

        # number of pixels of space available in viewing pane
        self.max_y = int(self.window.height) - 2*self.image_padding
        self.max_x = int(self.window.width) - self.sidebar_width - 2*self.image_padding

        # update number of pixels of image we can display in viewing pane
        self.visible_y_pix = min(self.max_y, self.height)
        self.visible_x_pix = min(self.max_x, self.width)

        # can't resize window to be smaller than the display area when viewed at 1x scale
        if not (self.height > self.max_y or self.width > self.max_x):
            self.window.set_minimum_size(width = self.visible_x_pix + self.sidebar_width + 2*self.image_padding,
                                     height = self.visible_y_pix + 2*self.image_padding)
        # can't resize window to be smaller than sidebar and image padding
        else:
            # +1 prevents exception raised when trying to blit image
            self.window.set_minimum_size(width = self.sidebar_width + 2*self.image_padding + 1,
                                     height = 2 * self.image_padding + 1)

        # bind custom event handlers to window
        self.window.on_draw = self.on_draw
        self.window.on_key_press = self.on_key_press
        self.window.on_mouse_motion = self.on_mouse_motion
        self.window.on_mouse_scroll = self.on_mouse_scroll
        self.window.on_mouse_press = self.on_mouse_press
        self.window.on_mouse_drag = self.on_mouse_drag
        self.window.on_mouse_release = self.on_mouse_release

        # add this handler instead of replacing the default on_resize handler
        self.window.push_handlers(self.on_resize)

        # KeyStateHandler can be queried as dict during other events
        # to check which keys are being held down
        # expands potential use of modifiers during different mouse events
        self.key_states = key.KeyStateHandler()
        self.window.push_handlers(self.key_states)

        # start with cursor visible, but this can be toggled
        self.mouse_visible = True

        # start in label-editing mode
        self.edit_mode = False
        # start with display showing annotations
        self.draw_raw = False

        # IMAGE ADJUSTMENT TOGGLES
        # invert grayscale light/dark of raw image
        self.invert = False
        # apply sobel filter (emphasizes edges) to raw image
        self.sobel_on = False
        # apply adaptive histogram equalization to raw image
        self.adapthist_on = False
        # show only raw image instead of composited image
        self.hide_annotations = False

        # set cmap for labels here (easier to set_bad just once)
        self.labels_cmap = plt.get_cmap("viridis")
        self.labels_cmap.set_bad('black')

        # composite_view used to store RGB image (composite of raw and annotated) so it can be
        # accessed and updated as needed
        self.composite_view = np.zeros((1,self.height,self.width,3))

        # default vmin for brightness adjustments (when viewing raw image)
        self.vmin = 0

        # "dirty rectangle" for raw + label compositing
        self.comp_dy1, self.comp_dy2 = None, None
        self.comp_dx1, self.comp_dx2 = None, None

        # trigger drawing of images upon first call to on_draw
        self.update_image = True
        self.update_brush_image = True

    def on_resize(self, width, height):
        '''
        Event handler for when pyglet window changes size. Note: this
        is pushed to the event handler stack instead of overwriting pyglet
        default event handlers, as on_resize has other default behavior needed
        to properly display screen. Calls scale_screen when window resized, as
        this is the only occasion where we may need to update the screen scale
        factor.
        '''
        # calculate how much image can be resized without zooming
        self.scale_screen()

        # can use the full screen height and width to display Caliban while fullscreened
        if self.window.fullscreen:
            # number of pixels of space available in viewing pane
            self.max_y = USER_SCREEN.height - 2*self.image_padding
            self.max_x = USER_SCREEN.width - self.sidebar_width - 2*self.image_padding

            # update number of pixels of image we can display in viewing pane
            self.visible_y_pix = min(self.max_y, self.height)
            self.visible_x_pix = min(self.max_x, self.width)

        else:
            # number of pixels of space available in viewing pane
            self.max_y = int(self.window.height) - 2*self.image_padding
            self.max_x = int(self.window.width) - self.sidebar_width - 2*self.image_padding

            # smoother visual behavior if image is too large to be completely displayed
            if (self.height > self.max_y or self.width > self.max_x):
                self.update_image = True

            # update number of pixels of image we can display in viewing pane
            self.visible_y_pix = min(self.max_y, self.height)
            self.visible_x_pix = min(self.max_x, self.width)

    def scale_screen(self):
        '''
        Recalculate scaling factor for image display. Calculates largest
        integer scaling factor that can be applied to both height and width
        of the image, to best use the available window space. If image size
        is larger than available window space, scale factor will be set to 1
        and image/window will extend off-screen: for this reason, it is recommended
        that large images are reshaped or trimmed before editing in Caliban. Scale
        factor is calculated independent of current zoom level.

        Uses:
            self.window.height, self.window.width, self.image_padding, and
                self.sidebar_width to determine free window space
            self.height and self.width (image dimensions) to calculate scale factor
            self.scale_factor is updated with the smaller of the two scale factors
                (or 1, whichever is largest)
        '''
        # user can resize window and images will expand to fill space if possible
        # padding around image stays constant
        pad = 2*self.image_padding
        y_scale = (self.window.height - pad) // self.height
        x_scale = (self.window.width - (self.sidebar_width + pad)) // self.width

        # scale factor should always be at least 1, and accommodate both x and y dims
        new_scale_factor = min(y_scale, x_scale)
        new_scale_factor = max(1, new_scale_factor)

        # only update and redraw if scaling has changed
        if new_scale_factor != self.scale_factor:
            self.scale_factor = new_scale_factor
            self.update_image = True

    def update_mouse_position(self, x, y):
        '''
        Helper function for adjusting self.x and self.y upon mouse movement.
        Mouse movement and drag are mutually exclusive, so both event handlers
        (on_mouse_drag and on_mouse_motion) use this helper function. Converts
        window x and y into image x and y, as we need image x and y (self.x and
        self.y) to display label info and carry out actions, but we do not need
        window/event x and y for anything.

        Uses:
            x and y, values passed in from event handling, location of mouse cursor
                in the window (relative to corner of window)
            self._mouse_x and self._mouse_y to store cursor location independent of
                image coordinates
            self.sidebar_width and self.image_padding as offsets to cursor location
            self.scale_factor and self.zoom to rescale x and y coordinates down to
                scale of original image
            self.visible_region to check whether mouse cursor is in area of image
                (self.x and self.y will not update if mouse has moved outside of image)
            self.brush to update where the center of the brush is
        '''
        # store latest cursor location
        self._mouse_x = x
        self._mouse_y = y

        # cursor may change location without changing image coordinates, so
        # temporarily store old image coordinates to check this later
        old_y, old_x = self.y, self.x

        # convert event x to viewing pane x by accounting for sidebar width, then scale
        x -= (self.sidebar_width + self.image_padding)
        x //= self.scale_factor
        # convert viewing pane x to image x by accounting for offset and zoom
        x //= self.zoom
        x = int(self.view_start_x + x)

        # indices of what is currently displayed on screen
        y1, y2, x1, x2 = self.visible_region

        # convert pyglet y coordinate to relative position from bottom of image
        y = int((y - self.image_padding)//(self.zoom*self.scale_factor))
        # current position = index at bottom of displayed image - position relative to the bottom
        y = y2 - y

        # check that mouse cursor is within bounds of image before updating
        if y1 <= y < y2 and x1 <= x < x2:
            # mouse is now over a different displayed pixel of image
            if (old_y != y or old_x != x):
                # update to new image coordinate
                self.x, self.y = x, y
                # update brush attributes
                self.brush.update_center(y, x)
                if self.edit_mode and None not in self.brush.dirty_bbox:
                    self.update_brush_image = True

    def on_mouse_motion(self, x, y, dx, dy):
        '''
        Overwrite default pyglet window on_mouse_motion event.
        Takes x, y, dx, dy as params (these are what the window sends
        to this event when it is triggered by mouse motion), but dx and dy
        are not used in this custom event. X and y are used to update self.x
        and self.y (coordinates of mouse within the image; also updated during
        mouse drag). Updates brush preview (pixel-editing mode) when appropriate.
        Uses:
            self.update_mouse_position to update current self.x and self.y from
                event x and y (also updates brush location)
            self.brush method redraw_view to clear and redraw the brush preview

        Note: self.brush.show is not a user-toggled option but is used to display
            the correct preview (threshold box vs path of brush)
        '''
        # cursor may change location without changing image coordinates, so
        # temporarily store old image coordinates to check this later
        old_y, old_x = self.y, self.x

        # always update self.x and self.y when mouse has moved
        self.update_mouse_position(x, y)

        # if image coordinate where cursor is has changed, update the brush view
        if self.brush.show and (old_y != self.y or old_x != self.x):
            self.brush.redraw_view()

    def on_mouse_drag(self, x, y, dx, dy, buttons, modifiers):
        '''
        Overwrite default pyglet window on_mouse_drag event.
        Takes x, y, button, modifiers as params (there are what the
        window sends to this event when it is triggered by mouse drag),
        but button and modifiers are not used in this custom event. X and y
        are used to update self.x and self.y (coordinates of mouse within the
        image; also updated when mouse moves). Mouse drag behavior changes depending
        on edit mode, mode.kind, and mode.action. Helper functions are used for the
        different modes of behavior.

        Uses:
            self.update_mouse_position to update current self.x and self.y from
                event x and y
            self.edit_mode to determine response to mouse drag; if in pixel-editing mode,
                CalibanBrush add_to_view method handles appropriate display updating based
                on context
            self.handle_draw (must be defined in child class) to modify labels and update
                label information as needed
        '''
        # cursor may change location without changing image coordinates, so
        # temporarily store old image coordinates to check this later
        old_y, old_x = self.y, self.x

        # always update self.x and self.y when mouse has moved
        self.update_mouse_position(x, y)

        # holding down space = panning
        if self.key_states[key.SPACE]:
            self.pan(dx, dy)
        else:
            # mouse drag only has special behavior in pixel-editing mode
            # only update brush view if image coordinate has changed due to mouse movement
            if self.edit_mode and (old_y != self.y or old_x != self.x):
                # drawing with brush (normal or conversion)
                self.brush.add_to_view()
                # modify annotation
                self.handle_draw()

    def pan(self, dx, dy):
        '''
        Moves the viewed portion of the image by dx and dy. Can be triggered
        by spacebar+click and drag, or by jumping to portion of image with pg up/dn,
        home/end. Recalculates self.view_start_x and self.view_start_y; if they have
        changed, the image is updated appropriately.
        '''
        # y coords are inverted
        old_y_start = self.view_start_y
        new_y_start = self.view_start_y + dy/(self.zoom*self.scale_factor)
        # don't move this view start index out of appropriate bounds
        # (eg, stop panning if you are at top or bottom of image)
        new_y_start = min(new_y_start, self.height - int(self.visible_y_pix/self.zoom))
        self.view_start_y = max(0, new_y_start)

        # x coords
        old_x_start = self.view_start_x
        new_x_start = self.view_start_x - dx/(self.zoom*self.scale_factor)
        # don't move this view start index out of appropriate bounds
        # (eg, stop panning if you are at left or right edge of image)
        new_x_start = min(new_x_start, self.width - int(self.visible_x_pix/self.zoom))
        self.view_start_x = max(0, new_x_start)

        # don't trigger further updates unless the view has moved
        if old_y_start != self.view_start_y or old_x_start != self.view_start_x:
            # important to update mouse position if a pan button has been used
            self.update_mouse_position(x = self._mouse_x, y = self._mouse_y)
            # refresh the brush area
            if self.brush.show:
                self.brush.redraw_view()
            self.update_image = True

    def adjust_zoom(self, scroll_y):
        '''
        Change the level of zoom based on an input (-1 or 1, zoom out or zoom in).
        Updates visible portion of screen if zoom level changes. Restricts zoom
        levels to be in the range 0.1 to 10.
        '''
        # number of pixels of image actually on screen
        pixel_w = int(self.visible_x_pix/self.zoom)
        pixel_h = int(self.visible_y_pix/self.zoom)

        # how much to adjust zoom based on scroll
        if self.zoom == 1 and scroll_y < 0:
            new_zoom = max(self.zoom + 0.1 * scroll_y, 0.1)
        elif self.zoom < 1:
            new_zoom = max(self.zoom + 0.1 * scroll_y, 0.1)
        else:
            new_zoom = min(self.zoom + 0.5 * scroll_y, 10)

        # adjust start and end indices to center zoom on mouse position
        prop_y = (self.y - self.view_start_y)/pixel_h
        prop_x = (self.x - self.view_start_x)/pixel_w

        # don't zoom unnecessarily far out
        if (self.zoom < 1 and new_zoom < self.zoom and
            self.visible_x_pix/self.zoom > self.width and
            self.visible_y_pix/self.zoom > self.height):
            return

        # adjusting visible portion of screen
        else:
            # update visible y
            y_diff =  pixel_h - int(self.visible_y_pix/new_zoom)
            new_y_start = self.view_start_y + prop_y*y_diff
            new_y_start = min(self.height - int(self.visible_y_pix/new_zoom), new_y_start)
            self.view_start_y = max(0, new_y_start)

            # update visible x
            x_diff = pixel_w - int(self.visible_x_pix/new_zoom)
            new_x_start = self.view_start_x + prop_x*x_diff
            new_x_start = min(self.width - int(self.visible_x_pix/new_zoom), new_x_start)
            self.view_start_x = max(0, new_x_start)

            # store new zoom value
            self.zoom = new_zoom
            # which pixel of the image the mouse is over has changed
            self.update_mouse_position(x = self._mouse_x, y = self._mouse_y)
            self.brush.redraw_view()

            # full image should be redrawn
            self.update_image = True

    def on_mouse_press(self, x, y, button, modifiers):
        '''
        Overwrite pyglet default window on_mouse_press event.
        Takes x, y, button, modifiers as params (there are what the
        window sends to this event when it is triggered by mouse press),
        but x, y, and button are not used in this custom event.
        Mouse press behavior changes depending on edit mode, mode.kind,
        and mode.action. Helper methods are used for different behavior options.
        self.x and self.y are used for mouse position and are updated when the
        mouse moves.

        If space bar is being held down (stored in self.key_states), disable default
        behavior so panning can be used.

        Uses:
            self.edit_mode, self.mode.kind, self.mode.action to determine
                what the response to mouse press should be
            self.get_label (must be provided by child class) to determine which
                label was clicked on (or the background)
            self.mouse_press helper methods (included in this class) for updating mode
                and/or triggering actions appropriately
            self.handle_draw (must be provided by child class) to handle pixel-editing
                changes to labels
            self.pick_color, self.pick_conv_target, and self.pick_conv_value for
                appropriately updating brush attributes
            self.brush.set_box_corner for starting to draw a thresholding box
        '''
        if not self.key_states[key.SPACE]:
            if not self.edit_mode:
                label = self.get_label()
                if self.mode.kind is None:
                    self.mouse_press_none_helper(modifiers, label)
                elif self.mode.kind == "SELECTED":
                    self.mouse_press_selected_helper(label)
                elif self.mode.kind == "PROMPT":
                    self.mouse_press_prompt_helper(label)

            elif self.edit_mode:
                # draw using brush
                if self.mode.kind is None:
                    self.handle_draw()
                elif self.mode.kind is not None:
                    # conversion brush
                    if self.mode.kind == "DRAW":
                        self.handle_draw()

                    # color pick tool
                    elif self.mode.kind == "PROMPT" and self.mode.action == "PICK COLOR":
                        self.pick_color()

                    # color picking for conversion brush
                    elif self.mode.kind == "PROMPT" and self.mode.action == "CONVERSION BRUSH TARGET":
                        self.pick_conv_target()
                    elif self.mode.kind == "PROMPT" and self.mode.action == "CONVERSION BRUSH VALUE":
                        self.pick_conv_value()

                    # start drawing bounding box for threshold prediction
                    elif self.mode.kind == "PROMPT" and self.mode.action == "DRAW BOX":
                        self.brush.set_box_corner(self.y, self.x)

    def on_mouse_release(self, x, y, buttons, modifiers):
        '''
        Overwrite pyglet default window on_mouse_release event.
        Takes x, y, button, modifiers as params (these are what the
        window sends to this event when it is triggered by mouse press),
        but x, y, button, and modifiers are not used in this custom event.
        Mouse release only triggers special behavior while in pixel-editing
        mode; mode.action and self.brush.show are used to determine which
        actions to carry out (threholding, updating brush preview appropriately).
        Helper functions are called for some complex updates.

        If space bar is being held down (stored in self.key_states), disable default
        behavior, as panning behavior has been used instead.

        Uses:
            self.edit_mode, self.brush.show, self.mode.action, self.hide_annotations
                to determine which updates need to be carried out upon mouse release
                (if any)
            self.handle_threshold (must be provided by child class) finalizes
                thresholding bbox, carries out thresholding, and does necessary bookkeeping
            self.brush.redraw_view to clear brush trace or bbox and update with current
                brush view
            self.helper_update_composite to update the edit_mode display with whatever
                changes were applied to the annotation during mouse drag (brush) or as
                a result of mouse release (thresholding)
        '''
        if not self.key_states[key.SPACE]:
            # mouse release only has special behavior in pixel-editing mode; most custom
            # behavior during a mouse click is handled in the mouse press event
            if self.edit_mode:
                self.comp_dy1, self.comp_dy2 = self.brush.dirty_y1, self.brush.dirty_y2
                self.comp_dx1, self.comp_dx2 = self.brush.dirty_x1, self.brush.dirty_x2
                # releasing the mouse finalizes bounding box for thresholding
                if not self.brush.show and self.mode.action == "DRAW BOX":
                    self.handle_threshold()
                    # self.brush.show reset to True here, so brush preview will render

                # update brush view (prevents brush flickering)
                self.brush.redraw_view()
                # annotation has changed (either during mouse drag for brush, or upon release
                # for threshold), update the image composite with the current annotation
                if not self.hide_annotations:
                    self.helper_update_composite()
                    self.update_image = True

    def mouse_press_none_helper(self, modifiers, label):
        '''
        Handles mouse presses when not in edit mode and nothing is selected.
        With modifiers (keys held down), can trigger ctrl-click to flood label,
        shift-click to trim pixels, or normal click to select label.

        Uses:
            modifiers from mouse press event to determine if special click
            label from click location (determined in on_mouse_press)
            self.y and self.x to determine self.hole_fill_seed (special click functions)
                or to add to self.mode.info as y_location and x_location
            self.mode to prompt special click confirmation or to select label
            self.highlighted_cell_one to update highlight info with label
        '''
        if label != 0:
            if modifiers & key.MOD_CTRL:
                self.hole_fill_seed = (self.y, self.x)
                self.mode.update("QUESTION",
                                 action = "FLOOD CELL",
                                 label = label,
                                 frame = self.current_frame)
            elif modifiers & key.MOD_SHIFT:
                self.hole_fill_seed = (self.y, self.x)
                self.mode.update("QUESTION",
                                 action = "TRIM PIXELS",
                                 label = label,
                                 frame = self.current_frame)
            else:
                self.mode.update("SELECTED",
                                 label=label,
                                 frame=self.current_frame,
                                 y_location=self.y, x_location=self.x)
            self.highlighted_cell_one = label
            if self.highlight:
                self.update_image = True

    def mouse_press_selected_helper(self, label):
        '''
        Handles mouse presses when not in edit mode and when one label has already
        been selected. Modifies self.mode to include info about both labels that have
        been selected.

        Uses:
            label from click location (determined in on_mouse_press)
            self.mode to store info about both selected labels
            self.highlighted_cell_one and self.highlighted_cell_two to update
                highlights appropriately; update cell_one because user could have
                changed highlight with cycling after selecting first label
                (note: this should change soon so that cycling the highlight deselects
                whatever label is selected, as in browser caliban; ZStackReview has
                deselection upon highlight cycling but TrackReview does not)
        '''
        if label != 0:
            self.mode.update("MULTIPLE",
                             label_1=self.mode.label,
                             frame_1=self.mode.frame,
                             y1_location = self.mode.y_location,
                             x1_location = self.mode.x_location,
                             label_2=label,
                             frame_2=self.current_frame,
                             y2_location = self.y,
                             x2_location = self.x)
            self.highlighted_cell_one = self.mode.label_1
            self.highlighted_cell_two = label
            if self.highlight:
                self.update_image = True

    def mouse_press_prompt_helper(self, label):
        '''
        Handles mouse presses when not in edit mode and in response to a
        prompt (currently, hole fill is the only action with this pattern).
        Only fills hole if user has clicked on an empty/background pixel (label is 0).
        If appropriate pixel is clicked on, action_fill_hole is called before
        resetting the hole_fill_seed and self.mode.

        Uses:
            self.mode.action to determine what response to mouse press should be
            label from click location (determined in on_mouse_press) to check if
                action should be carried out
            self.hole_fill_seed to store start point for action_fill_hole
            self.mode to clear action info once action has finished
        '''
        if self.mode.action == "FILL HOLE":
            if label == 0:
                self.hole_fill_seed = (self.y, self.x)
                self.action_fill_hole()
                self.mode.clear()

    def pick_color(self):
        '''
        Takes the label clicked on, sets self.brush.edit_val to that label, and then
        exits color-picking mode. Doesn't change anything if click on background
        but still exits color-picking mode.

        Uses:
            self.get_label (must be provided by child class) to determine which
                label was clicked on
            self.brush.set_edit_val (modifies stored value)
            self.mode.clear to exit color picking
        '''
        # which label was clicked on
        label = self.get_label()
        if label != 0:
            self.brush.set_edit_val(label)
        self.mode.clear()

    def pick_conv_target(self):
        '''
        Click on a label while setting up conversion brush to choose "target"
        (label that will be overwritten by the conversion brush). Nothing happens
        if background is clicked on (remain in conversion brush target-picking mode,
        as opposed to normal color-picking). When color is picked, move to next
        step in setting conversion brush.

        Uses:
            self.get_label (must be provided by child class) to determine which
                label was clicked on
            self.brush.set_conv_target to store clicked value
            self.mode.update to move to next step of conversion brush setting
        '''
        # which label was clicked on
        label = self.get_label()
        if label != 0:
            self.brush.set_conv_target(label)
            # once value is set, move to setting next value
            self.mode.update("PROMPT", action = "CONVERSION BRUSH VALUE")

    def pick_conv_value(self):
        '''
        Click on a label while setting up conversion brush to choose "value"
        (label that will be drawn by the conversion brush). Nothing happens
        if background is clicked on (remain in conversion brush value-picking mode,
        as with conversion brush target-picking). After label is picked, conversion
        brush is set and will be in use. Note: setting conversion brush values in
        mode.update is not necessary for drawing, but allows those values to be
        displayed in mode prompt as a reminder to user.

        Uses:
            self.get_label (must be provided by child class) to determine which
                label was clicked on
            self.brush.set_conv_val to store clicked value
            self.mode.update to enter use of conversion brush
        '''
        # which label was clicked on
        label = self.get_label()
        if label != 0:
            self.brush.set_conv_val(label)
            # once value is set, turn on conversion brush
            self.mode.update("DRAW", action = "CONVERSION",
                conversion_brush_target = self.brush.conv_target,
                conversion_brush_value = self.brush.conv_val)

    def on_draw(self):
        '''
        Event handler for pyglet window, redraws all content of screen after
        window events. Clears window, calculates screen scaling, then redraws
        the displayed image, lines around that image (to distinguish from black
        background of the rest of the window), and information text in the sidebar.
        '''
        # clear old information
        self.window.clear()

        self.batch = pyglet.graphics.Batch()

        # add relevant image to batch
        self.draw_current_frame()
        # add lines around the image to distinguish it from rest of window
        self.draw_line()
        # add information text in sidebar to batch
        self.draw_label()

        # draw everything
        self.batch.draw()

    def draw_line(self):
        '''
        Draw thin white lines around the area of the window where the image
        is being displayed. Distinguishes interactable portion of window from
        information display more clearly. Indicates if highlighted/selected labels
        are present off-screen by drawing red lines instead of white on relevant
        edges. No line displayed on edge (black line) if image extends further in
        that direction.

        Uses:
            self.brush.h1, self.brush.h2, self.highlighted_cell_one,
                self.highlighted_cell_two are values to check off-screen for
            self.visible_region to determine which parts of image are off-screen
            self.scale_factor, self.zoom to calculate area of window where image
                is being displayed
            self.width, self.height to check if edges of image are being displayed
            self.sidebar_width, self.image_padding to offset lines appropriately
        '''
        if self.edit_mode:
            h1, h2 = self.brush.h1, self.brush.h2
        else:
            h1, h2 = self.highlighted_cell_one, self.highlighted_cell_two

        y1, y2, x1, x2 = self.visible_region
        frame_width = (x2 - x1) * self.zoom * self.scale_factor
        frame_height = (y2 - y1) * self.zoom * self.scale_factor

        pad = self.image_padding

        # determine where edges of image are
        top = frame_height + pad
        bottom = pad
        left = self.sidebar_width + pad
        right = self.sidebar_width + frame_width + pad

        # bottom line
        if y2 == self.height:
            r, g, b = self.white
        else:
            bottom_piece = self.get_ann_current_frame()[y2:self.height]
            if np.any(np.where(np.logical_or(bottom_piece == h1, bottom_piece == h2))):
                r, g, b = self.red
            else:
                r, g, b = self.black

        self.bottom_vlist = self.batch.add(2, pyglet.gl.GL_LINES, None,
            ("v2f", (left, bottom-1,
                 right+1, bottom-1)),
            ("c3B", (r, g, b, r, g, b))
        )

        # left line
        if x1 == 0:
            r, g, b = self.white
        else:
            left_piece = self.get_ann_current_frame()[:,0:x1]
            if np.any(np.where(np.logical_or(left_piece == h1, left_piece == h2))):
                r, g, b = self.red
            else:
                r, g, b = self.black

        self.left_vlist = self.batch.add(2, pyglet.gl.GL_LINES, None,
            ("v2f", (left, bottom -1,
                 left, top)),
            ("c3B", (r, g, b, r, g, b))
        )

        # right line
        if x2 == self.width:
            r, g, b = self.white
        else:
            right_piece = self.get_ann_current_frame()[:,x2:self.width]
            if np.any(np.where(np.logical_or(right_piece == h1, right_piece == h2))):
                r, g, b = self.red
            else:
                r, g, b = self.black

        self.right_vlist = self.batch.add(2, pyglet.gl.GL_LINES, None,
            ("v2f", (right+1, bottom-1,
                 right+1, top)),
            ("c3B", (r, g, b, r, g, b))
        )

        # top line
        if y1 == 0:
            r, g, b = self.white
        # check to see if values are outside this range
        else:
            top_piece = self.get_ann_current_frame()[0:y1]
            if np.any(np.where(np.logical_or(top_piece == h1, top_piece == h2))):
                r, g, b = self.red
            else:
                r, g, b = self.black

        self.top_vlist = self.batch.add(2, pyglet.gl.GL_LINES, None,
            ("v2f", (left, top,
                 right+1, top)),
            ("c3B", (r, g, b, r, g, b))
        )

    def draw_current_frame(self):
        '''
        Method called during on_draw to coordinate which method should be used
        to display current image.

        Uses:
            self.edit_mode, self.draw_raw to determine which view to show
            self.draw_pixel_edit_frame, self.draw_ann_frame, self.draw_raw_frame
                to display appropriate data
        '''
        if self.update_image:
            if self.edit_mode:
                self.draw_pixel_edit_frame()
            else:
                if self.draw_raw:
                    self.draw_raw_frame()
                else:
                    self.draw_ann_frame()

        elif self.update_brush_image and self.edit_mode:
            self.add_brush_preview()

        self.draw_pyglet_image()

    @property
    def visible_region(self):
        '''
        Shortcut for getting the start and end indices for image to be displayed.
        '''
        y1 = max(int(self.view_start_y), 0)
        y2 = min(int(y1 + self.visible_y_pix/self.zoom), self.height)
        x1 = max(int(self.view_start_x), 0)
        x2 = min(int(x1 + self.visible_x_pix/self.zoom), self.width)
        return y1, y2, x1, x2

    def draw_raw_frame(self):
        '''
        Displays raw image with any image adjustments and currently selected
        colormap.

        Uses:
            self.visible_region to get part of image to display
            self.get_raw_current_frame (must be provided by child class) to get
                the appropriate slice of raw array data
            self.apply_raw_image_adjustments (provided) and self.current_cmap
                (must be provided by child class) to create an appropriately-adjusted
                RGB array for displaying the data
            self.array_to_img to create a pyglet Image object from the RGB array
            self.draw_pyglet_image to display pyglet Image on screen in correct
                location with scaling
        '''
        y1, y2, x1, x2 = self.visible_region

        raw_array = self.get_raw_current_frame()
        adjusted_raw = self.apply_raw_image_adjustments(raw_array, cmap = self.current_cmap)[y1:y2, x1:x2]
        self.array_to_img(input_array = adjusted_raw,
            vmax = None,
            cmap = None,
            output = 'pyglet')

        self.update_image = False

    def draw_ann_frame(self):
        '''
        Displays annotations in modified viridis colormap with highlights applied in red.

        Uses:
            self.visible_region to get part of image to display
            self.get_ann_current_frame (must be provided by child class) to get
                the appropriate slice of label data
            self.highlight (must be provided by child class) to determine if array
                should be masked to show highlighted label(s)
            self.apply_label_highlight to mask array at highlighted label values
            self.array_to_img (provided), self.get_max_label and self.adjustment
                (must be provided by child class) to create a pyglet Image object
                from the array, with an appropriate range of colors
            self.draw_pyglet_image to display pyglet Image on screen in correct
                location with scaling
        '''
        y1, y2, x1, x2 = self.visible_region
        ann_array = self.get_ann_current_frame()[y1:y2,x1:x2]

        # annotations use cubehelix cmap with highlighting in red
        ann_array = np.ma.masked_equal(ann_array, 0)

        # create pyglet image
        image = self.array_to_img(input_array = ann_array,
                                                vmax = max(1, self.get_max_label() + self.adjustment),
                                                cmap = self.labels_cmap,
                                                output = 'array',
                                                vmin = 0)

        # if highlighting on, mask highlighted values so they appear red
        if self.highlight:
            image = self.apply_label_highlight(ann_array, image)

        self.array_to_img(input_array = image, vmax = None, cmap = None, output = 'pyglet')

        self.update_image = False

    def draw_pixel_edit_frame(self):
        '''
        Draws current frame for pixel-editing mode, along with brush preview
        (brush preview can display brush or thresholding). If drawing the image
        with annotations hidden, applies filters/adjustments to raw image and uses
        that, otherwise uses self.composite_view (generated and updated elsewhere)
        to show annotations overlaid on the adjusted raw image. Requires child
        class to have methods for get_max_label and get_raw_current_frame, and
        adjustment attribute.
        '''
        y1, y2, x1, x2 = self.visible_region

        # create pyglet image from only the adjusted raw, if hiding annotations
        if self.hide_annotations:
            # get whole raw image so that adjustments will be the same as they are in composite
            current_raw = self.get_raw_current_frame()
            # get the current view from adjusted image
            display = self.apply_raw_image_adjustments(np.copy(current_raw))[y1:y2, x1:x2]

        # create pyglet image from composite if you want to see annotation overlay
        # (self.composite view is generated/updated separately)
        if not self.hide_annotations:
            display = np.copy(self.composite_view[y1:y2, x1:x2])

        # highlighting in edit-mode is outline in white around label, sometimes also outline in red
        if self.highlight:
            # get region to highlight (where label is equal to brush value)
            white_mask = np.where(self.get_ann_current_frame()[y1:y2,x1:x2] == self.brush.h1, 1, 0)
            # only work on part of image that is affected, speeds up array operations
            dy1, dy2, dx1, dx2 = get_dirty_rectangle(white_mask)
            # within that region, create an outline mask and overlay it onto the display
            if not None in (dy1, dy2, dx1, dx2):
                white_mask = self.generate_ann_boundaries(white_mask[dy1:dy2, dx1:dx2])
                display[dy1:dy2, dx1:dx2] = self.overlay_RGB(display[dy1:dy2, dx1:dx2], white_mask)

            # add in red outline if currently using conversion brush
            if self.brush.h2 != -1:
                red_mask = np.where(self.get_ann_current_frame()[y1:y2,x1:x2] == self.brush.h2, 1, 0)
                dy1, dy2, dx1, dx2 = get_dirty_rectangle(red_mask)
                if not None in (dy1, dy2, dx1, dx2):
                    red_mask = self.generate_ann_boundaries(red_mask[dy1:dy2, dx1:dx2], color = 'red')
                    display[dy1:dy2, dx1:dx2] = self.overlay_RGB(display[dy1:dy2, dx1:dx2], red_mask)

        # update the display with appropriate RGB image based on steps above
        self.display = display

        # draw the brush over the display
        self.add_brush_preview()

        gl.glTexParameteri(gl.GL_TEXTURE_2D,
                           gl.GL_TEXTURE_MAG_FILTER,
                           gl.GL_NEAREST)

        self.update_image = False

    def draw_pyglet_image(self):
        '''
        Creates a pyglet ImageData object from self.array_data that is blitted
        to screen with an offset for padding around image. Array data must already
        be rescaled and adjusted for opacity/other image modifications.

        Uses:
            self.input_array to get appropriate sizes for ImageData object
            self.array_data, the actual data for creating the ImageData object
            self.image_padding and self.sidebar_width to set correct anchor point
                for image corner
        '''
        # converting RGB(A) array into image data without i/o step
        format_size = self.input_array.shape[-1]
        # 8 bit RGB(A) array -> 1 byte for each channel
        bytes_per_channel = 1
        pitch = self.input_array.shape[1] * format_size * bytes_per_channel
        if format_size == 4:
            format_str = "RGBA"
        else:
            format_str = "RGB"

        # create ImageData that pyglet can use
        # NOTE: the data it is using comes from self.array_data, which is assigned
        # in array_to_img(output = 'pyglet'), NOT self.input_array
        image_data = pyglet.image.ImageData(self.input_array.shape[1], self.input_array.shape[0],
            format_str, self.array_data, pitch = -pitch)

        # blit the ImageData onto the correct (offset) part of window
        pad = self.image_padding
        image_data.blit(x = self.sidebar_width + pad, y = pad)

        # TODO: how often does this actually need to be set?
        gl.glTexParameteri(gl.GL_TEXTURE_2D,
                           gl.GL_TEXTURE_MAG_FILTER,
                           gl.GL_NEAREST)

    def array_to_img(self, input_array, vmax, cmap, output, vmin = None):
        '''
        Helper function to take an input array and process it to be displayed.
        Can process grayscale images into RGB images based on colormap, or can process
        RGB images into pyglet-friendly format.

        Inputs:
            input_array: the array to be rendered as an image (either grayscale or RGB)
            vmax: vmax in pre-cmap normalization step (adjusts range of cmap and may vary)
            cmap: which matplotlib colormap to use when creating png image (can either be
                a colormap object or a string specifying the cmap)
            output: string specifying desired format ('pyglet' sets self.array_data based
                on input_array, 'array' returns RGB array representation of image data)
            vmin: optional argument to specify vmin, default None (used in
                normalization step before applying cmap to grayscale array)
        '''
        # pyglet image type
        if output == 'pyglet':

            # apply cmap to grayscale image first, if needed
            if cmap is not None:
                input_array = self.array_to_img(input_array, vmax, cmap, output = 'array')

            # rescale (if needed)
            scale = self.scale_factor * self.zoom
            # different interpolation depending on upsampling or downsampling
            if scale > 1:
                input_array = cv2.resize(input_array, None, fy = scale, fx = scale, interpolation = cv2.INTER_AREA)
            elif scale < 1:
                input_array = cv2.resize(input_array, None, fy = scale, fx = scale, interpolation = cv2.INTER_LINEAR)

            # make sure array is appropriate dtype
            input_array = input_array.astype(np.uint8)

            self.input_array = input_array

            # data format that pyglet can use for ImageData, adapted from stackoverflow
            self.array_data = (gl.GLubyte * self.input_array.size).from_buffer(self.input_array)

        # generate an RGB array (what the data 'looks like' but in array format)
        elif output == 'array':
            # can use a colormap object or fetch one based on the cmap string
            if type(cmap) is str:
                cmap = plt.get_cmap(cmap)
            # normalize the input array so we can apply the cmap
            input_array = Normalize(vmin = vmin, vmax = vmax)(input_array)
            # apply the colormap
            RGB_array = cmap(input_array, bytes = True)

            return RGB_array

        else:
            return None

    def add_brush_preview(self):
        '''
        Add a preview of the pixel-editing brush to the current display.
        Images are processed only within the brush's "dirty rectangle", the
        indices where changes need to be made. The interior of the brush is
        then given translucency and outlined with either red or white, depending
        on brush state. The image is then displayed.

        Uses:
            self.visible_region and self.brush.dirty_y1, y2, x1, x2 to restrict
                image processing to the areas that actually need it (speeds up
                process)
            self.display (composite image with any label highlighting applied)
                to copy for editing (adding brush image on top)
            self.brush.view as mask for modifying copy of display
            self.apply_transparent_highlight, self.generate_ann_boundaries, and
                self.overlay_RGB to add brush preview to image
            self.array_to_img for setting current image display data to updated
                display
            self.update_brush_image to prevent further image processing until
                something about brush changes
        '''
        # edges of what is currently being displayed
        y1, y2, x1, x2 = self.visible_region

        # region of full array affected by brush
        dy1, dy2 = self.brush.dirty_y1, self.brush.dirty_y2
        dx1, dx2 = self.brush.dirty_x1, self.brush.dirty_x2

        # if no dirty rectangle, don't need to update any more
        if None in (dy1, dy2, dx1, dx2):
            self.array_to_img(input_array = self.display.astype(np.uint8),
                                        vmax = None, cmap = None, output = 'pyglet')
            return

        # don't update outside of viewing window
        dy1 = max(dy1, y1)
        dy2 = min(dy2, y2)
        dx1 = max(dx1, x1)
        dx2 = min(dx2, x2)

        # brush has moved offscreen (can happen during click & drag panning)
        if dx2 <= dx1 or dy2 <= dy1:
            self.array_to_img(input_array = self.display.astype(np.uint8),
                                        vmax = None, cmap = None, output = 'pyglet')
            return

        # affected piece of brush.view that gets applied to display
        brush_arr = self.brush.view[dy1:dy2, dx1:dx2]

        # make copy of current display (self.display should remain unchanged by brush)
        self.brush_display = np.copy(self.display)

        # part of display affected by brush
        temp_display = self.brush_display[dy1-y1:dy2-y1, dx1-x1:dx2-x1]

        # apply transparent highlight to brush in this affected region
        self.brush_display[dy1-y1:dy2-y1, dx1-x1:dx2-x1] = self.apply_transparent_highlight(temp_display, brush_arr)

        # create solid outline of brush (red for normal erasing, white otherwise)
        if self.brush.erase and self.brush.conv_val == -1:
            brush_outline = self.generate_ann_boundaries(brush_arr, color ='red')
        else:
            brush_outline = self.generate_ann_boundaries(brush_arr)

        # add solid outline of brush to the affected part of image that will be displayed
        self.brush_display[dy1-y1:dy2-y1, dx1-x1:dx2-x1] = self.overlay_RGB(self.brush_display[dy1-y1:dy2-y1, dx1-x1:dx2-x1], brush_outline)

        # update state so this image is shown
        self.array_to_img(input_array = self.brush_display.astype(np.uint8),
                                    vmax = None, cmap = None, output = 'pyglet')

        # location of brush does not need to be updated unless brush moves
        self.update_brush_image = False

    def generate_ann_boundaries(self, img, color = 'white'):
        '''
        Generates an RGB image of an outline corresponding to an input mask.
        The input mask should only have one non-zero label and a background of 0.
        The returned RGB image can be overlaid on a different RGB image to visually
        highlight the edges of a label.
        '''
        # create mask of where edges are (0s and 1s)
        boundary_mask = find_boundaries(img, mode = 'inner')
        # add channels dimension back in to image
        boundary_mask = np.expand_dims(boundary_mask, axis = 2)
        # create RGB image where boundaries have a particular color
        if color == 'white':
            rgb_mask = np.where(boundary_mask ==1, [255, 255, 255], [0,0,0])
        elif color == 'red':
            rgb_mask = np.where(boundary_mask ==1, [255, 0, 0], [0,0,0])

        return rgb_mask

    def overlay_RGB(self, base_RGB, overlay_RGB):
        '''
        Totally replaces pixels in base_RGB with pixels from overlay_RGB.
        As such, does not create composite of two images (overlay_RGB completely
        obscures pixels from base_RGB). Used to draw outlines in overlay_RGB over
        base_RGB.
        '''
        # mask of which pixels in overlay_RGB are black
        overlay_mask = np.all(overlay_RGB == (0, 0, 0), axis=-1, keepdims = True)
        # where overlay_RGB is black, use the underlying image
        return np.where(overlay_mask, base_RGB, overlay_RGB)

    def apply_transparent_highlight(self, base_RGB, mask):
        '''
        Adds a fixed value to each channel of an RGB image based on mask.
        Has effect of lightening/making masked regions appear translucent.
        Used to display brush in pixel-editing mode.
        '''
        # create channels dimension in mask image
        mask = np.expand_dims(mask, axis = 2)

        # amount of translucency (higher value = more opaque)
        adjustment = 40

        # cast to uint16 so values don't overflow
        base_RGB = base_RGB.astype('uint16')
        # apply translucency based on mask
        base_RGB = np.where(mask != 0, base_RGB + adjustment, base_RGB)
        # clip values back down to between 0-255 to prevent overflow
        base_RGB = np.clip(base_RGB, a_min = 0, a_max = 255).astype('uint8')

        return base_RGB

    def apply_label_highlight(self, frame, RGB_frame):
        '''
        Masks pixels in input RGB array (RGB_frame) based on values in input
        array (frame). Masked pixels are displayed as red. If highlighted
        labels are not in frame (eg, if self.highlighted_cell_two = -1), there
        is no visual effect. Applies highlight regardless of self.kind as long
        as highlight is on.

        Currently requires that child class include attributes
        highlighted_cell_one and highlighted_cell_two.
        '''
        # same highlight gets applied to up to two labels
        mask = np.logical_or(frame == self.highlighted_cell_one, frame == self.highlighted_cell_two)
        # add channels dimension into mask
        mask = np.expand_dims(mask, axis = 2)
        # only work with RGB, not potential alpha channel
        RGB_frame = RGB_frame[:,:,0:3]
        # change RGB values to red wherever mask applies, leave untouched otherwise
        RGB_frame = np.where(mask, [255, 0,0], RGB_frame)

        return RGB_frame.astype(np.uint8)

    def apply_raw_image_adjustments(self, current_raw, cmap = 'gray'):
        '''
        Apply filter/adjustment options to raw image for display in
        pixel-editing mode. Input is unadjusted raw image, with object
        attributes to determine which filters and adjustments to apply. Can
        accept cmap as input, default value of 'gray' (used for composite images).
        Requires child class to have max_intensity attribute.

        Returns adjusted image as RGB array.
        '''
        #try sobel filter here
        if self.sobel_on:
            current_raw = filters.sobel(current_raw)

        # apply adaptive histogram equalization, if option toggled
        if self.adapthist_on:
            # rescale first (for equalization to work properly, I think)
            current_raw = rescale_intensity(current_raw, in_range = 'image', out_range = 'float')
            current_raw = equalize_adapthist(current_raw)
            # vmax appropriate for new range of image
            vmin = 0
            vmax = 1
        elif not self.adapthist_on:
            # appropriate vmax for image
            vmin = self.vmin
            vmax = self.max_intensity

        # want image to be in grayscale, but as RGB array, not array of intensities
        raw_img =  self.array_to_img(input_array = current_raw,
                    vmax = vmax,
                    cmap = cmap,
                    output = 'array',
                    vmin = vmin)

        # don't need alpha channel
        raw_RGB = raw_img[:,:,0:3]

        # apply dark/light inversion
        if self.invert:
            raw_RGB = invert(raw_RGB)

        return raw_RGB

    def make_composite_img(self, base_array, overlay_array, alpha = 0.6):
        '''
        Helper function to take two arrays and overlay one on top of the other
        using a conversion to HSV color space. Used to take greyscale RGB array
        of raw image and overlay colored labels on the image without obscuring
        image details. Used by helper_update_composite to generate composite image
        as needed. Returns the composite array as an RGB array (dimensions [M,N,3]).
        Can be used to composite all or part of an image.
        '''
        # TODO: investigate using glBlendFunc to do compositing for me?

        # Convert the input image and color mask to Hue Saturation Value (HSV) colorspace
        img_hsv = color.rgb2hsv(base_array)
        color_mask_hsv = color.rgb2hsv(overlay_array)

        # Replace the hue and saturation of the original image
        # with that of the color mask
        img_hsv[..., 0] = color_mask_hsv[..., 0]
        # reduce saturation of colors
        img_hsv[..., 1] = color_mask_hsv[..., 1] * alpha

        # convert HSV image back to 8bit RGB
        img_masked = color.hsv2rgb(img_hsv)

        # rescale values from float (0 to 1) to uint8 (0 to 255)
        img_masked = rescale_intensity(img_masked, in_range = (0,1), out_range = np.uint8)
        img_masked = img_masked.astype(np.uint8)

        return img_masked

    def helper_update_composite(self):
        '''
        Helper function that updates self.composite_view from self.raw and
        self.annotated when needed. self.composite_view is the image drawn
        in edit mode, but does not need to be recalculated each time the image
        refreshes (on_draw is triggered after every event, including mouse motion).
        Takes data from self.raw and self.annotated, adjusts the images, overlays them,
        and then stores the generated composite image at self.composite_view.
        Updates only part of the composite image for faster runtime if attributes have
        been set via drawing actions.

        Uses:
            self.comp_dy1, dy2, dx1, dx2 to determine how much of image needs to
                be updated
            self.get_raw_current_frame and self.get_ann_current_frame (must be
                provided by child class) to get appropriate slices of arrays
            self.apply_raw_image_adjustments to apply raw image filtering options
                (returns an RGB array)
            self.array_to_img to create RGB array from label image (requires child
                class to provide get_max_label method and adjustment, overlay_cmap
                attributes)
            self.make_composite_img to overlay annotation RGB image on top of
                adjusted raw image
        '''
        # if only part of the composite needs to be redrawn:
        dy1, dy2, dx1, dx2 = self.comp_dy1, self.comp_dy2, self.comp_dx1, self.comp_dx2

        # get images to modify and overlay
        current_raw = self.get_raw_current_frame()
        current_ann = self.get_ann_current_frame()[dy1:dy2, dx1:dx2]
        current_ann = np.ma.masked_equal(current_ann, 0)

        # apply adjustments to whole raw image, then index into it
        # (keeps image adjustments consistent even when updating small piece of image)
        raw_RGB = self.apply_raw_image_adjustments(current_raw)[dy1:dy2, dx1:dx2]

        # get RGB array of colorful annotation view
        ann_img = self.array_to_img(input_array = current_ann,
                                            vmax = self.get_max_label() + self.adjustment,
                                            cmap = self.labels_cmap,
                                            output = 'array',
                                            vmin = 0)

        # don't need alpha channel for compositing step
        ann_RGB = ann_img[...,0:3]

        # create the composite image from the two RGB arrays
        img_masked = self.make_composite_img(base_array = raw_RGB,
                                            overlay_array = ann_RGB)

        # set self.composite view to new composite image
        self.composite_view[dy1:dy2, dx1:dx2] = img_masked

        # reset composite dirty rectangle
        self.comp_dy1, self.comp_dy2, self.comp_dx1, self.comp_dx2 = None, None, None, None

    def draw_label(self):
        '''
        Coordinates information display (text) on left side of screen.
        '''
        # TODO: only update labels when the content changes?
        # TODO: batch graphics?
        self.draw_persistent_info()
        self.draw_cell_info_label()

    def draw_persistent_info(self):
        '''
        Display information about the frame currently being viewed.
        Always displays information, although brush settings are displayed
        only when in pixel-editing mode. This info is displayed at top of info
        column. Child class must provide create_frame_text method.
        '''
        if self.edit_mode:
            edit_mode = "pixels"
        else:
            edit_mode = "labels"

        if self.edit_mode or self.draw_raw:
            filter_info = self.create_filter_text()
        else:
            filter_info = "\n\n\n"

        display_filter_info = ("Current display settings:"
            "\nColormap - {}").format(self.create_cmap_text())
        display_filter_info += filter_info

        # TODO: render label in a batch
        # create pyglet label anchored to top of left side
        frame_label = pyglet.text.Label("Currently viewing:\n"
                                        + "{}\n".format(self.create_frame_text())
                                        + "{}\n".format(self.create_zoom_text())
                                        + "{}\n\n".format(self.create_disp_image_text())
                                        + "{}\n".format(self.create_highlight_text())
                                        + "{}\n\n".format(display_filter_info)
                                        + "Edit mode: {}\n".format(edit_mode)
                                        + self.create_brush_text(),
                                        font_name="monospace",
                                        anchor_x="left", anchor_y="top",
                                        width=self.sidebar_width,
                                        multiline=True,
                                        x=5, y=self.window.height - 5,
                                        color=[255]*4,
                                        batch = self.batch)

    def draw_cell_info_label(self):
        '''
        When cursor is over a label, displays information about that label
        at the bottom of the information column. Also displays mode text
        (selections, prompts).
        '''
        text = self.create_label_info_text()

        # add info from self.mode (eg, prompts or "selected", etc)
        text += self.mode.text

        # TODO: render label in a batch
        # create pyglet label anchored to bottom of left side
        cell_info_label = pyglet.text.Label(text, font_name="monospace",
                                       anchor_x="left", anchor_y="bottom",
                                       width=self.sidebar_width,
                                       multiline=True,
                                       x=5, y=5, color=[255]*4,
                                       batch = self.batch)

    def create_zoom_text(self):
        '''
        Create string to tell viewer what level of zoom they are at. Also
        displays which indices of array are being shown.
        '''
        y1, y2, x1, x2 = self.visible_region

        # format to truncate decimal places of <1 zoom
        zoom_text = "Zoom: {:1.1f}".format(self.zoom)
        # display which indices of image you are viewing
        zoom_text += "\nWindow (y): {}-{}".format(y1, y2)
        zoom_text += "\nWindow (x): {}-{}".format(x1, x2)

        return zoom_text

    def create_disp_image_text(self):
        '''
        Method to create string to tell viewer which viewing mode is in use.
        Default options are raw, labels, and overlay. Used in draw_persistent_info.
        '''
        display_text = "Displayed image: "

        if self.edit_mode:
            if self.hide_annotations:
                currently_viewing = "Raw"
            else:
                currently_viewing = "Overlay"
        else:
            if self.draw_raw:
                currently_viewing = "Raw"
            else:
                currently_viewing = "Labels"

        display_text += currently_viewing

        return display_text

    def create_highlight_text(self):
        '''
        Generate text describing current highlighting status. Requires child
        class to have highlighted_cell_one and highlighted_cell_two attributes.
        Added to info on side of screen (via draw_persistent_info).
        '''
        highlight_text = "Highlighting: {}\n".format(on_or_off(self.highlight))

        if self.edit_mode:
            h1, h2 = self.brush.h1, self.brush.h2
        else:
            h1, h2 = self.highlighted_cell_one, self.highlighted_cell_two

        if self.highlight:
            # two labels highlighted
            if h2 != -1:
                labels = "{}, {}".format(h1, h2)
            # only one label highlighted
            elif h1 != -1:
                labels = "{}".format(h1)
            # nothing highlighted
            else:
                labels = "None"

        # nothing highlighted because highlighting is off
        else:
            labels = "None"

        highlight_text += "Highlighted cell(s): {}\n".format(labels)

        return highlight_text

    def create_cmap_text(self):
        '''
        Generate text describing the current colormap being used. Added to info
        display on side of screen (via draw_persistent_info). Requires that child
        class have attribute current_cmap.
        '''
        cmap = ""
        if self.edit_mode:
            if self.hide_annotations:
                cmap = "gray"
            else:
                cmap = "viridis/gray"
        else:
            if self.draw_raw:
                cmap = self.current_cmap
            else:
                cmap = "viridis"

        return cmap

    def create_filter_text(self):
        '''
        Method to create string to tell viewer which image adjustments are
        currently being applied to the raw image. (Displays in both raw and
        pixel-editing display modes.) Used in draw_persistent_info.
        '''
        filter_text = ("\nSobel filter - {}".format(on_or_off(self.sobel_on))
                    + "\nColor inversion - {}".format(on_or_off(self.invert))
                    + "\nHistogram equalization - {}".format(on_or_off(self.adapthist_on)))

        return filter_text

    def create_brush_text(self):
        '''
        Generate string to display relevant information about brush settings.
        Only appears on screen while in pixel-editing mode. Uses brush attributes
        as well as mode.kind to determine which attributes should be displayed.
        Displayed as part of draw_persistent_info.
        '''
        if self.edit_mode:
            size_text = "Brush size: "
            if self.brush.show:
                size_text += str(self.brush.size)
            else:
                size_text += "-"

            value_text = "Editing label: "
            erase_text = "Eraser: "
            if self.mode.kind is None:
                value_text += str(self.brush.edit_val)
                erase_text += on_or_off(self.brush.erase)
            else:
                value_text += "-"
                erase_text += "-"

            brush_info_text = "\nCurrent brush settings:\n{}\n{}\n{}".format(size_text,
                value_text, erase_text)
        else:
            brush_info_text = ""

        return brush_info_text

    def create_label_info_text(self):
        '''
        Creates label-specific text to display as part of draw_cell_info_label.
        Depends on current location of cursor (displays info about whichever label
        is currently under the mouse cursor). Requires child class to have a
        get_label method. Requires child class to have a get_label_info method
        that takes in an integer label and returns a dictionary of information
        to be displayed.
        '''
        label = self.get_label()
        if label != 0:
            # generate text from cell_info and display_info (use slices instead of frames)
            text = '\n'.join("{:11}{}".format(str(k)+': ', self.get_label_info(label)[k])
                              for k in self.display_info)
        else:
            # display nothing if not hovering over a label
            text = ''

        return text

class CalibanBrush:
    def __init__(self, height, width):
        # radius of brush
        self.size = 5
        # value that brush can affect in default mode
        self.edit_val = 1
        # erasing behavior
        self.erase = False

        # values of conversion brush (-1 is conversion brush turned off)
        self.conv_target = -1
        self.conv_val = -1

        # values that brush will draw; depends on edit_val, erase, and conv values
        self.background = 0
        self.draw_value = 1

        # value(s) of label to highlight when window highlighting is turned on
        self.h1 = 1
        self.h2 = -1

        # size of annotation; used to put bounds on size, area of brush
        self.height = height
        self.width = width

        # current location of cursor (center of brush or edge of box)
        self.y = 0
        self.x = 0

        # anchor point for bounding box; None when box is not in use
        self.box_x = None
        self.box_y = None

        # initialize area with center x = y = 0
        self.area = circle(self.y, self.x, self.size, (self.height,self.width))

        # brush_view is array used to display a preview of brush tool; same size as other arrays
        self.view = np.zeros((self.height, self.width))

        # dirty rectangle = area that has been changed
        # keep track of this for faster image modification
        self.dirty_y1, self.dirty_y2 = None, None
        self.dirty_x1, self.dirty_x2 = None, None

        # toggle that determines whether we're viewing brush or thresholding box
        self.show = True

        # use to toggle off draw behavior when we shouldn't be drawing
        self.drawing = True

    @property
    def dirty_bbox(self):
        '''
        Shortcut for getting the edges of the "dirty" box, which includes
        the part of the brush view that has been affected by the brush.
        '''
        return(self.dirty_y1, self.dirty_y2, self.dirty_x1, self.dirty_x2)

    def reset(self):
        '''
        Clear brush of special behaviors (clear conversion brush values, box
        values). Doesn't affect brush size, edit_val, or status of eraser.
        Redraws view to show brush shadow.
        '''
        self.enable_drawing()
        self.show = True
        self.clear_box()
        self.clear_conv()

    def decrease_size(self):
        '''
        Decrease size of brush (minimum size of one pixel).
        Updates area that brush covers and redraws to show new
        area if brush shadow is currently being displayed.
        '''
        self.size = max(1, self.size -1)
        self.update_area()
        if self.show:
            self.redraw_view()

    def increase_size(self):
        '''
        Increase size of brush (does not get larger than height or width
        of displayed image). Updates area that brush covers and redraws
        to show new area if brush shadow is currently being displayed.
        '''
        self.size = min(self.size + 1, self.height, self.width)
        self.update_area()
        if self.show:
            self.redraw_view()

    def decrease_edit_val(self):
        '''
        Decreases edit_val (minimum value of 1); value that normal brush draws
        or erases. Redraws brush view to show updated color of brush shadow.
        Also updates brush's drawing values appropriately.
        '''
        self.edit_val = max(1, self.edit_val - 1)
        self.redraw_view()
        self.set_draw_vals()

    def increase_edit_val(self, window):
        '''
        Increases edit_val (does not increase past the window's max label + 1);
        value that normal brush draws or erases. Redraws brush view to show
        updated color of brush shadow. Also updates brush's drawing values appropriately.
        '''
        self.edit_val = min(window.get_new_label(), self.edit_val + 1)
        self.redraw_view()
        self.set_draw_vals()

    def set_edit_val(self, val):
        '''
        Sets edit_val to given value (used with color picker); value that
        normal brush draws or erases. Redraws brush view to show updated color
        of brush shadow. Also updates brush's drawing values appropriately.
        Re-enables drawing, as drawing is disabled while waiting for color to
        be picked.
        '''
        self.edit_val = val
        self.redraw_view()
        self.enable_drawing()
        self.set_draw_vals()

    def toggle_erase(self):
        '''
        Turns erasing behavior on or off for default brush mode, updates
        brush's drawing values appropriately. No visual change.
        '''
        self.erase = not self.erase
        self.set_draw_vals()

    def enable_drawing(self):
        '''
        Turn drawing on; used to re-enable editing behavior after attribute-modifying
        actions such as color picking.
        '''
        self.drawing = True

    def disable_drawing(self):
        '''
        Turn drawing off; used to disable editing behavior while other brush-related
        actions are carried out (eg, thresholding, color picking).
        '''
        self.drawing = False

    def set_conv_target(self, val):
        '''
        Set the conversion brush target to val; conversion brush target is value
        that will be overwritten by use of conversion brush. Does not call other
        methods, since conversion brush is not set until conv_val is picked.
        '''
        self.conv_target = val

    def set_conv_val(self, val):
        '''
        Set the conversion brush value to val; conversion brush value is value
        that will be used to overwrite target. Once this value is set, the
        conversion brush is ready to use, so the view is redrawn to reflect new
        value of brush, the brush drawing values are updated, and drawing is
        enabled (drawing is disabled while brush is being set).
        '''
        self.conv_val = val
        self.redraw_view()
        self.enable_drawing()
        self.set_draw_vals()

    def clear_conv(self):
        '''
        Clear the conversion brush by setting target and value to -1.
        Also update brush drawing values and redraw brush preview to reflect
        appropriate value (now that brush is back to affecting edit_val in
        its default drawing mode).
        '''
        self.conv_target = -1
        self.conv_val = -1
        self.redraw_view()
        self.set_draw_vals()

    def set_box_corner(self, y, x):
        '''
        Sets the anchored corner of bounding box for thresholding.
        '''
        self.box_x = x
        self.box_y = y

    def get_box_coords(self):
        '''
        Return the corners of the current bounding box, based on anchored
        corner and current mouse position (self.x and y). Corners are
        sorted so they can be used for array slicing.
        '''
        y1 = min(self.box_y, self.y)
        y2 = max(self.box_y, self.y)
        x1 = min(self.box_x, self.x)
        x2 = max(self.box_x, self.x)

        return y1, y2, x1, x2

    def clear_box(self):
        '''
        Resets anchored corner of bounding box to None.
        '''
        self.box_x = None
        self.box_y = None

    def set_draw_vals(self):
        '''
        Sets drawing values for brush based on current brush status; keeps
        track of which value the brush is currently using to draw over which
        background value. For default (no erasing) behavior, 0 is background
        and edit_val is the drawing value, but this changes depending on settings.
        Using drawing values separate from other brush settings allows drawing
        functions to access only those attributes without needing to account for
        current brush settings.
        '''
        # pick editing values
        if self.conv_val != -1:
            self.background = self.conv_target
            self.draw_value = self.conv_val
        else:
            if self.erase:
                self.background = self.edit_val
                self.draw_value = 0
            else:
                self.background = 0
                self.draw_value = self.edit_val

        self.set_highlight()

    def set_highlight(self):
        if self.conv_val != -1:
            self.h1 = self.conv_val
            self.h2 = self.conv_target
        else:
            self.h1 = self.edit_val
            self.h2 = -1

    def update_center(self, y, x):
        '''
        Update center of brush area with current mouse location (only called by
        window if mouse location is within bounds of displayed image). Updates
        current area of brush when center changes. Updated center of brush is also
        used for changing free corner of bounding box when box is active.
        '''
        self.y = y
        self.x = x
        self.update_area()

    def update_area(self):
        '''
        Updates area of brush based on current center of circle and radius of
        brush. Height and width values are used to prevent brush area from
        extending past bounds of view array. Called when either the center
        or size of brush changes.
        '''
        self.area = circle(self.y, self.x, self.size, (self.height, self.width))

    def clear_view(self):
        '''
        Reset brush view by replacing it with array of same size, filled with
        zeros.
        '''
        self.view = np.zeros((self.height, self.width))
        self.dirty_y1, self.dirty_y2 = None, None
        self.dirty_x1, self.dirty_x2 = None, None

    def add_to_view(self):
        '''
        Add values to brush view to be displayed, based on current brush status.
        If drawing box, clear view first, since we never want to see where boxes
        have been.
        '''
        if self.show:
            if self.conv_val != -1:
                self.view[self.area] = self.conv_val
            else:
                self.view[self.area] = self.edit_val

            # set "dirty rectangle" where brush affects image
            y1, y2 = np.min(self.area[0]) - 1, np.max(self.area[0]) + 2
            x1, x2 = np.min(self.area[1]) - 1, np.max(self.area[1]) + 2
            # set values for new dirty rectangle
            if None in (self.dirty_y1, self.dirty_y2, self.dirty_x1, self.dirty_x2):
                self.dirty_y1 = max(0, y1)
                self.dirty_y2 = min(self.height, y2)
                self.dirty_x1 = max(0, x1)
                self.dirty_x2 = min(self.width, x2)
            # update existing dirty rectangle
            else:
                self.dirty_y1 = max(0, min(self.dirty_y1, y1))
                self.dirty_y2 = min(self.height, max(self.dirty_y2, y2))
                self.dirty_x1 = max(0, min(self.dirty_x1, x1))
                self.dirty_x2 = min(self.width, max(self.dirty_x2, x2))

        else:
            self.clear_view()
            if self.box_x is not None:
                y1, y2, x1, x2 = self.get_box_coords()
                self.view[y1:y2,x1:x2] = 1
                self.dirty_y1, self.dirty_y2 = max(0, y1 - 1), min(self.height, y2 + 2)
                self.dirty_x1, self.dirty_x2 = max(0, x1 - 1), max(self.width, x2 + 2)

    def redraw_view(self):
        '''
        Clear view before redrawing; used for updating brush view with brush
        shadow when not using brush to draw.
        '''
        self.clear_view()
        self.add_to_view()

    def draw(self, image):
        '''
        Modify input image with brush drawing values in current brush area.
        If brush does not have drawing enabled, return image before making
        modifications.
        '''
        if not self.drawing:
            return image

        dy1, dy2, dx1, dx2 = self.dirty_bbox

        image = np.copy(image)

        # use only dirty rectangle of image for faster processing
        img_piece = image[dy1:dy2, dx1:dx2]

        # version of image where all background pixels have been changed
        mod_image = np.where(img_piece == self.background, self.draw_value, img_piece)

        # only change area part of image
        area = (self.area[0]-dy1, self.area[1]-dx1)
        image[self.area] = mod_image[area]

        return image

class TrackReview(CalibanWindow):
    possible_keys = {"label", "daughters", "frames", "parent", "frame_div",
                     "capped"}

    replace_prompt = ("\nReplace {} with {}?"
                     "\nSPACE = REPLACE IN ALL FRAMES"
                     "\nESC = CANCEL")

    def __init__(self, filename, lineage, raw, tracked):
        self.filename = filename
        self.tracks = lineage
        self.raw = raw
        self.tracked = tracked

        # if not all of these keys are present, actions are not supported
        self.incomplete = {*self.tracks[1]} < TrackReview.possible_keys

        if self.incomplete:
            print("Incomplete trk file loaded. Missing keys: {}".format(
                TrackReview.possible_keys - {*self.tracks[1]}))
            print("Actions will not be supported")

        # `label` should appear first
        self.display_info = ["label", *sorted(set(self.tracks[1]) - {"label"})]

        self.num_frames, self.height, self.width, _ = raw.shape
        self.dtype_raw = raw.dtype

        super().__init__()

        self.current_frame = 0
        self.max_intensity = None
        self.x = 0
        self.y = 0
        self.mode = Mode.none()
        self.mode.update_prompt_additions = self.custom_prompt
        self.adjustment = 0
        self.highlight = False
        self.highlighted_cell_one = -1
        self.highlighted_cell_two = -1

        # options for displaying raw image with different cmaps
        # cubehelix varies smoothly in lightness and hue, gist_yarg and gist_gray are grayscale
        # and inverted grayscale, magma and nipy_spectral are alternatives to cubehelix, and prism
        # has effect of showing contours in brightness of image
        self.cmap_options = ['cubehelix', 'gist_yarg', 'gist_gray', 'magma', 'nipy_spectral', 'prism']
        # start on cubehelix cmap
        self.current_cmap_idx = 0
        self.current_cmap = self.cmap_options[self.current_cmap_idx]

        self.hole_fill_seed = None

        self.brush = CalibanBrush(self.height, self.width)

        pyglet.app.run()

    def on_mouse_press(self, x, y, button, modifiers):
        if self.incomplete:
            print()
            print("This .trk file is incomplete.")
            print("Missing keys: {}".format(
                TrackReview.possible_keys - {*self.tracks[1]}))
            print("Actions will not be supported.")
            return

        else:
            super().on_mouse_press(x, y, button, modifiers)

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        if self.key_states[key.LCTRL] or self.key_states[key.RCTRL]:
            self.adjust_zoom(scroll_y)
        else:
            if self.draw_raw:
                if not self.key_states[key.LSHIFT] or self.key_states[key.RSHIFT]:
                    if self.max_intensity == None:
                        self.max_intensity = np.max(self.get_raw_current_frame())
                    else:
                        raw_adjust = max(int(self.max_intensity * 0.02), 1)
                        self.max_intensity = max(self.max_intensity - raw_adjust * scroll_y, self.vmin + 2)
                else:
                    min_intensity = np.min(self.get_raw_current_frame())
                    new_vmin = self.vmin + max(int(min_intensity*0.02), 1) * scroll_y
                    new_vmin = min(new_vmin, min_intensity)
                    new_vmin = max(new_vmin, 0)
                    self.vmin = new_vmin

            else:
                if self.get_max_label() + (self.adjustment - 1 * scroll_y) > 0:
                    self.adjustment = self.adjustment - 1 * scroll_y

            self.update_image = True

    def handle_draw(self):
        '''
        '''
        annotated = self.get_ann_current_frame()
        brush_val_in_original = np.any(np.isin(annotated, self.brush.draw_value))
        editing_val_in_original = np.any(np.isin(annotated, self.brush.background))

        annotated_draw = self.brush.draw(annotated)

        # check to see if any labels have been added or removed from frame
        # possible to add new label or delete target label
        brush_val_in_modified = np.any(np.isin(annotated_draw, self.brush.draw_value))
        editing_val_in_modified = np.any(np.isin(annotated_draw, self.brush.background))

        # label deletion
        if editing_val_in_original and not editing_val_in_modified:
            self.del_cell_info(del_label = self.brush.background, frame = self.current_frame)

        # label addition
        if brush_val_in_modified and not brush_val_in_original:
            self.add_cell_info(add_label = self.brush.draw_value, frame = self.current_frame)

        self.tracked[self.current_frame,:,:,0] = annotated_draw

    def on_key_press(self, symbol, modifiers):
        '''
        Event handler for keypresses in pyglet window. (Mouse does not have
        to be within window for keypress events to occur, as long as window
        has focus.) Keypresses are context-dependent and are organized into
        helper functions grouped by context. Universal keypresses apply in
        any context, while other keypresses (eg, those that trigger actions)
        are naturally grouped together. Some keybinds occur in specific contexts
        and may be grouped into "misc" helper functions.

        Actions that modify the file are carried out in two steps: a keybind that
        prompts the action, and a subsequent keybind to confirm the decision (and
        choose options, where applicable). Any keybind whose effect is to set
        self.mode to a new Mode object requires a secondary action, often a keybind,
        to confirm. When actions are carried out, self.mode is reset to Mode.none().

        Note: this event handler is called when the key is pressed down. Holding down
        or releasing keys do not affect this event handler. For keys that are being held
        down at time of other events, query self.key_states[key], which makes use of
        pyglet's KeyStateHandler class.

        Uses:
            symbol: integer representation of keypress, compare against pyglet.window.key
                (modifiers do not affect symbol, so "a" and "A" are both key.A)
            modifiers: keys like shift, ctrl that are held down at the time of keypress
            (see pyglet docs for further explanation of these inputs and list of modifiers)
        '''
        # always carried out regardless of context
        self.universal_keypress_helper(symbol, modifiers)

        # context: only while in pixel-editing mode
        if self.edit_mode:
            # context: always carried out in pixel-editing mode (eg, image filters)
            self.edit_mode_universal_keypress_helper(symbol, modifiers)
            # context: specific cases
            self.edit_mode_misc_keypress_helper(symbol, modifiers)
            # context: only when another action is not being performed (eg, thresholding)
            if self.mode.kind is None:
                self.edit_mode_none_keypress_helper(symbol, modifiers)

        # context: only while in label-editing mode
        else:
            # unusual context for keybinds
            self.label_mode_misc_keypress_helper(symbol, modifiers)
            # context: no labels selected
            if self.mode.kind is None:
                self.label_mode_none_keypress_helper(symbol, modifiers)
            # context: one label selected
            elif self.mode.kind == "SELECTED":
                self.label_mode_single_keypress_helper(symbol, modifiers)
            # context: two labels selected
            elif self.mode.kind == "MULTIPLE":
                self.label_mode_multiple_keypress_helper(symbol, modifiers)
            # context: responding to question (eg, confirming an action)
            elif self.mode.kind == "QUESTION":
                self.label_mode_question_keypress_helper(symbol, modifiers)

    def universal_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that
        are handled here apply in every situation (no logic checks
        within on_key_press before universal_keypress_helper is called!)
        so *no other commands may share these keybinds.*

        Keybinds:
            a or left arrow key: view previous frame
            d or right arrow key: view next frame
            v: toggle cursor visibility
            h: toggle highlighting
            escape: clear selection
            minus: zoom out
            equal: zoom in
            pg up: pan up across image (+ctrl to go to top, +shift to move halfway across current screen)
            pg dn: pan down across image (+ctrl to go to top, +shift to move halfway across current screen)
            home: pan left across image (+ctrl to go to top, +shift to move halfway across current screen)
            end: pan right across image (+ctrl to go to top, +shift to move halfway across current screen)
            F11: toggle fullscreen
        '''

        # CHANGING FRAMES
        # Move through frames faster (5 at a time) when holding shift
        num_frames_changed = 5 if modifiers & key.MOD_SHIFT else 1
        # Go backward through frames (stop at frame 0)
        if symbol in {key.LEFT, key.A}:
            old_frame = self.current_frame
            self.current_frame = max(self.current_frame - num_frames_changed, 0)
            if old_frame != self.current_frame:
                # if you change frames while you've viewing composite, update composite
                if self.edit_mode and not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True
        # Go forward through frames (stop at last frame)
        elif symbol in {key.RIGHT, key.D}:
            old_frame = self.current_frame
            self.current_frame = min(self.current_frame + num_frames_changed, self.num_frames - 1)
            if old_frame != self.current_frame:
                # if you change frames while you've viewing composite, update composite
                if self.edit_mode and not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

        # TOGGLE CURSOR VISIBILITY
        # most useful in edit mode, but inconvenient if can't be turned back on elsewhere
        elif symbol == key.V:
            self.mouse_visible = not self.mouse_visible
            self.window.set_mouse_visible(self.mouse_visible)

        # TOGGLE HIGHLIGHT
        # note: shift+H is conditional keybind elsewhere
        elif symbol == key.H and not (modifiers & key.MOD_SHIFT):
            self.highlight = not self.highlight
            self.update_image = True

        # CLEAR/CANCEL ACTION
        elif symbol == key.ESCAPE:
            # clear highlighted cells
            self.highlighted_cell_one = -1
            self.highlighted_cell_two = -1
            # clear hole fill seed (used in hole fill, trim pixels, flood contiguous)
            self.hole_fill_seed = None
            # reset self.mode (deselects labels, clears actions)
            self.mode.clear()
            # reset from thresholding
            self.brush.reset()
            self.update_image = True

        elif symbol == key.MINUS:
            self.adjust_zoom(-1)
        elif symbol == key.EQUAL:
            self.adjust_zoom(1)

        # QUICK PANNING
        elif symbol == key.PAGEUP:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = -(self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = -self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = -self.visible_y_pix*self.scale_factor)
        elif symbol == key.PAGEDOWN:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = (self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = self.visible_y_pix*self.scale_factor)
        elif symbol == key.HOME:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = (self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = self.visible_x_pix*self.scale_factor, dy = 0)
        elif symbol == key.END:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = -(self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = -self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = - self.visible_x_pix*self.scale_factor, dy = 0)

        elif symbol == key.F11:
            self.window.set_fullscreen(fullscreen = not self.window.fullscreen)
            self.update_image = True

    def edit_mode_universal_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here always apply to pixel-editing mode, so these keybinds
        may be reused in label-editing mode, but cannot be used elsewhere
        in pixel-editing mode.

        Keybinds:
            i: invert light/dark in raw image (does not affect color of overlay)
            k: toggle sobel filter (emphasizes edges) on raw image
            j: toggle adaptive histogram equalization of raw image
            shift + h: toggles annotation visibility (can still edit annotations while hidden,
                but intended to provide clearer look at filtered raw image if needed)
        '''
        # INVERT RAW IMAGE LIGHT/DARK
        if symbol == key.I:
            self.invert = not self.invert
            # if you invert the image while you're viewing composite, update composite
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE SOBEL FILTER
        if symbol == key.K:
            self.sobel_on = not self.sobel_on
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE ADAPTIVE HISTOGRAM EQUALIZATION
        if symbol == key.J:
            self.adapthist_on = not self.adapthist_on
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE ANNOTATION VISIBILITY
        if symbol == key.H:
            if modifiers & key.MOD_SHIFT:
                self.hide_annotations = not self.hide_annotations
                # in case any display changes have been made while hiding annotations
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

    def edit_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else.

        Keybinds:
            down key: decrease size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            up key: increase size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            n: set conversion brush value to unused (max label + 1) value;
                analogous to setting normal brush value with this keybind,
                but specifically when picking a label for the conversion brush
                value (note that allowing this option for the conversion brush
                target would be counterproductive)
            space: confirm saving file
        '''
        # BRUSH MODIFICATION KEYBINDS
        # (don't want to adjust brush if thresholding; applies to both
        # normal brush and conversion brushes)
        if self.brush.show:
            # BRUSH SIZE ADJUSTMENT
            # decrease brush size
            if symbol == key.DOWN:
                self.brush.decrease_size()
                self.update_brush_image = True
            # increase brush size
            if symbol == key.UP:
                self.brush.increase_size()
                self.update_brush_image = True

        # SET CONVERSION BRUSH VALUE TO UNUSED LABEL
        # TODO: update Mode prompt to reflect that you can do this
        if self.mode.kind == "PROMPT" and self.mode.action == "CONVERSION BRUSH VALUE":
            if symbol == key.N:
                self.brush.set_conv_val(self.get_new_label())
                self.mode.update("DRAW", action = "CONVERSION",
                        conversion_brush_target = self.brush.conv_target,
                        conversion_brush_value = self.brush.conv_val)
                self.update_image = True

        # RESPOND TO SAVE QUESTION
        if self.mode.kind == "QUESTION" and self.mode.action == "SAVE":
            if symbol == key.SPACE:
                self.save()
                self.mode.clear()

    def edit_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode only when another action
        or prompt is not in use (ie, not in the middle of the color picker
        prompt, thresholding prompt, or conversion brush mode). These keybinds
        include leaving edit mode, changing the value of the normal brush, and
        initiating actions.

        Keybinds:
            e: leave edit mode
            ] (right bracket): increase value of normal brush
            [ (left bracket): decrease value of normal brush
            n: set normal brush to new value (highest label in file + 1)
            x: toggle eraser (only applies to normal brush)
            p: color picker action
            r: start conversion brush
            s: prompt saving file
            t: prompt thresholding - currently disabled
        '''
        # LEAVE EDIT MODE
        if symbol == key.E:
            self.edit_mode = False
            self.update_image = True

        # BRUSH VALUE ADJUSTMENT
        # increase brush value, caps at max value + 1
        if symbol == key.BRACKETRIGHT:
            self.brush.increase_edit_val(window = self)
            self.update_image = True
        # decrease brush value, can't decrease past 1
        if symbol == key.BRACKETLEFT:
            self.brush.decrease_edit_val()
            self.update_image = True
        # set brush to unused label
        if symbol == key.N:
            self.brush.set_edit_val(self.get_new_label())
            self.update_image = True

        # TOGGLE ERASER
        if symbol == key.X:
            self.brush.toggle_erase()
            self.update_brush_image = True

        # ACTIONS - COLOR PICKER
        if symbol == key.P:
            self.mode.update("PROMPT", action = "PICK COLOR", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - CONVERSION BRUSH
        if symbol == key.R:
            self.mode.update("PROMPT", action="CONVERSION BRUSH TARGET", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - SAVE FILE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")

        # # ACTIONS - THRESHOLD
        # if symbol == key.T:
        #     self.mode.update("PROMPT", action = "DRAW BOX", **self.mode.info)
        #     self.brush.show = False
        #     self.brush.disable_drawing()
        #     self.brush.clear_view()
        #     self.update_image = True

    def label_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else. Since very
        few keybinds are universal to label-editing mode (as opposed to the
        different filter options in pixel-editing mode), "universal" label-mode
        keybinds are also found here.

        Keybinds:
            z: toggle between viewing raw images and annotations ("universal")
            i: invert dark/light of image when viewing raw
            k: toggle sobel filter when viewing raw
            j: toggle adaptive histogram equalization when viewing raw
            shift + up, shift + down: cycle through colormaps, only applies when
                viewing the raw image
        '''
        # toggle raw/label display, "universal" in label mode
        if symbol == key.Z:
            self.draw_raw = not self.draw_raw
            self.update_image = True

        # cycle through colormaps, but only while viewing raw
        if self.draw_raw:

            # INVERT RAW IMAGE LIGHT/DARK
            if symbol == key.I:
                self.invert = not self.invert
                # if you invert the image while you're viewing composite, update composite
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            # TOGGLE SOBEL FILTER
            if symbol == key.K:
                self.sobel_on = not self.sobel_on
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            # TOGGLE ADAPTIVE HISTOGRAM EQUALIZATION
            if symbol == key.J:
                self.adapthist_on = not self.adapthist_on
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            if modifiers & key.MOD_SHIFT:
                if symbol == key.UP:
                    if self.current_cmap_idx == len(self.cmap_options) - 1:
                        self.current_cmap_idx = 0
                    elif self.current_cmap_idx < len(self.cmap_options) - 1:
                        self.current_cmap_idx += 1
                    self.current_cmap = self.cmap_options[self.current_cmap_idx]
                    self.update_image = True

                if symbol == key.DOWN:
                    if self.current_cmap_idx == 0:
                        self.current_cmap_idx = len(self.cmap_options) - 1
                    elif self.current_cmap_idx > 0:
                        self.current_cmap_idx -= 1
                    self.current_cmap = self.cmap_options[self.current_cmap_idx]
                    self.update_image = True

    def label_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if no labels are
        selected and no actions are awaiting confirmation.

        Keybinds:
            ] (right bracket): increment currently-highlighted label by 1
            [ (left bracket): decrement currently-highlighted label by 1
            e: enter pixel-editing mode
            s: prompt saving a copy of the file
        '''
        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if (self.highlighted_cell_one < self.get_max_label() and
                self.highlighted_cell_one > -1):
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            if self.highlight:
                self.update_image = True

        # ENTER EDIT MODE
        if symbol == key.E:
            self.edit_mode = True
            # update composite with changes, if needed
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # SAVE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")

    def label_mode_single_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if one label is
        selected and no actions are awaiting confirmation.

        Keybinds:
            ] (right bracket): increment currently-highlighted label by 1
            [ (left bracket): decrement currently-highlighted label by 1
            c: prompt creation of new label
            f: prompt hole fill
            x: prompt deletion of label in frame
        '''
        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if (self.highlighted_cell_one < self.get_max_label() and
                self.highlighted_cell_one > -1):
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            # deselect label, since highlighting is now decoupled from selection
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            # deselect label
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        # CREATE CELL
        if symbol == key.C:
            self.mode.update("QUESTION", action="NEW TRACK", **self.mode.info)

        # HOLE FILL
        if symbol == key.F:
            self.mode.update("PROMPT", action="FILL HOLE", **self.mode.info)

        # DELETE CELL
        if symbol == key.X:
            self.mode.update("QUESTION", action="DELETE", **self.mode.info)

    def label_mode_multiple_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if two labels are
        selected and no actions are awaiting confirmation. (Note: the
        two selected labels must be the same label for watershed to work,
        and different labels for replace and swap to work.)

        Keybinds:
            p: prompt assignment of parent/daughter pair
            r: prompt replacement of one label with another
            s: prompt swap between two labels
            w: prompt watershed action
        '''
        # PARENT
        if symbol == key.P:
            self.mode.update("QUESTION", action="PARENT", **self.mode.info)

        # REPLACE
        if symbol == key.R:
            self.mode.update("QUESTION", action="REPLACE", **self.mode.info)

        # SWAP
        if symbol == key.S:
            self.mode.update("QUESTION", action="SWAP", **self.mode.info)

        # WATERSHED
        if symbol == key.W:
            self.mode.update("QUESTION", action="WATERSHED", **self.mode.info)

    def label_mode_question_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode when actions are awaiting
        confirmation. Most actions are confirmed with the space key, while
        others have different options mapped to other keys. Keybinds in this
        helper function are grouped by the question they are responding to.

        Keybinds:
            space: carries out action; when action can be applied to single OR
                multiple frames, space carries out the multiple frame option
            s: carries out single-frame version of action where applicable
        '''
        # RESPOND TO SAVE QUESTION
        if self.mode.action == "SAVE":
            if symbol == key.SPACE:
                self.save()
                self.mode.clear()

        # RESPOND TO CREATE QUESTION
        elif self.mode.action == "NEW TRACK":
            if symbol == key.S:
                self.action_new_single_cell()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_new_track()
                self.mode.clear()

        # RESPOND TO REPLACE QUESTION
        elif self.mode.action == "REPLACE":
            if symbol == key.SPACE:
                self.action_replace()
                self.mode.clear()

        # RESPOND TO SWAP QUESTION
        elif self.mode.action == "SWAP":
            if symbol == key.S:
                self.action_single_swap()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_swap()
                self.mode.clear()

        # RESPOND TO DELETE QUESTION
        elif self.mode.action == "DELETE":
            if symbol == key.SPACE:
                self.action_delete()
                self.mode.clear()

        # RESPOND TO WATERSHED QUESTION
        elif self.mode.action == "WATERSHED":
            if symbol == key.SPACE:
                self.action_watershed()
                self.mode.clear()

        # RESPOND TO TRIM PIXELS QUESTION
        elif self.mode.action == "TRIM PIXELS":
            if symbol == key.SPACE:
                self.action_trim_pixels()
                self.mode.clear()

        # RESPOND TO FLOOD CELL QUESTION
        elif self.mode.action == "FLOOD CELL":
            if symbol == key.SPACE:
                self.action_flood_contiguous()
                self.mode.clear()

        elif self.mode.action == "PARENT":
            if symbol == key.SPACE:
                self.action_parent()
                self.mode.clear()

    def custom_prompt(self):
        if self.mode.kind == "QUESTION":
            if self.mode.action == "REPLACE":
                self.mode.text = TrackReview.replace_prompt.format(self.mode.label_2,
                    self.mode.label_1)

    def get_raw_current_frame(self):
        return self.raw[self.current_frame,:,:,0]

    def get_ann_current_frame(self):
        return self.tracked[self.current_frame,:,:,0]

    def get_label(self):
        return int(self.tracked[self.current_frame, self.y, self.x])

    def get_max_label(self):
        return max(self.tracks)

    def get_new_label(self):
        return (self.get_max_label() + 1)

    def get_label_info(self, label):
        info = self.tracks[label].copy()
        frames = list(map(list, consecutive(info["frames"])))
        frames = '[' + ', '.join(["{}".format(a[0])
                            if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                            for a in frames]) + ']'
        info["frames"] = frames
        return info

    def create_frame_text(self):
        frame_text = "Frame: {}\n".format(self.current_frame)
        return frame_text

    def action_new_track(self):
        """
        Replacing label
        """
        old_label, start_frame = self.mode.label, self.mode.frame
        new_label = self.get_new_label()

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

        self.update_image = True

    def action_new_single_cell(self):
        """
        Create new label in just one frame
        """
        old_label, single_frame = self.mode.label, self.mode.frame
        new_label = self.get_new_label()

        # replace frame labels
        frame = self.tracked[single_frame]
        frame[frame == old_label] = new_label

        # replace fields
        self.del_cell_info(del_label = old_label, frame = single_frame)
        self.add_cell_info(add_label = new_label, frame = single_frame)

        self.update_image = True

    def action_watershed(self):
        # Pull the label that is being split and find a new valid label
        current_label = self.mode.label_1
        new_label = self.get_new_label()

        # Locally store the frames to work on
        img_raw = self.raw[self.current_frame,:,:,0]
        img_ann = self.tracked[self.current_frame,:,:,0]

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

        # did watershed effectively create a new label?
        new_pixels = np.count_nonzero(np.logical_and(ws == new_label, img_sub_ann == current_label))
        # if only a few pixels split, dilate them; new label is "brightest"
        # so will expand over other labels and increase area
        if new_pixels < 5:
            ws = dilation(ws, disk(3))

        # ws may only leave a few pixels of old label
        old_pixels = np.count_nonzero(ws == current_label)
        if old_pixels < 5:
            # create dilation image so "dimmer" label is not eroded by "brighter" label
            dilated_ws = dilation(np.where(ws==current_label, ws, 0), disk(3))
            ws = np.where(dilated_ws==current_label, dilated_ws, ws)

        # only update img_sub_ann where ws has changed label from current_label to new_label
        img_sub_ann = np.where(np.logical_and(ws == new_label,img_sub_ann == current_label), ws, img_sub_ann)

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.tracked[self.current_frame,:,:,0] = img_ann

        # current label doesn't change, but add the neccesary bookkeeping for the new track
        self.add_cell_info(add_label = new_label, frame = self.current_frame)
        self.update_image = True

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

        self.update_image = True

    def action_single_swap(self):
        '''
        swap annotation labels in one frame but do not change lineage info
        '''
        label_1 = self.mode.label_1
        label_2 = self.mode.label_2

        frame = self.current_frame

        ann_img = self.tracked[frame]
        ann_img = np.where(ann_img == label_1, -1, ann_img)
        ann_img = np.where(ann_img == label_2, label_1, ann_img)
        ann_img = np.where(ann_img == -1, label_2, ann_img)

        self.tracked[frame] = ann_img
        self.update_image = True

    def action_parent(self):
        """
        label_1 gave birth to label_2
        """
        label_1, label_2, frame_div = self.mode.label_1, self.mode.label_2, self.mode.frame_2

        track_1 = self.tracks[label_1]
        track_2 = self.tracks[label_2]

        #add daughter but don't duplicate entry
        daughters = track_1["daughters"].copy()
        daughters.append(label_2)
        daughters = np.unique(daughters).tolist()
        track_1["daughters"] = daughters

        track_2["parent"] = label_1
        track_1["frame_div"] = frame_div

    def action_replace(self):
        """
        Replacing label_2 with label_1. Overwrites all instances of label_2 in
        movie, and replaces label_2 lineage information with info from label_1.
        """
        label_1, label_2 = self.mode.label_1, self.mode.label_2

        #replacing a label with itself crashes Caliban, not good
        if label_1 == label_2:
            pass
        else:
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

            self.update_image = True

    def action_fill_hole(self):
        '''
        fill a "hole" in a cell annotation with the cell label
        '''
        img_ann = self.tracked[self.current_frame,:,:,0]

        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, self.mode.label, connectivity = 1)
        self.tracked[self.current_frame,:,:,0] = filled_img_ann

        self.update_image = True

    def action_delete(self):
        """
        Deletes label from current frame only
        """
        selected_label, current_frame = self.mode.label, self.mode.frame

        # Set selected label to 0 in current frame
        ann_img = self.tracked[current_frame]
        ann_img = np.where(ann_img == selected_label, 0, ann_img)
        self.tracked[current_frame] = ann_img

        self.del_cell_info(del_label = selected_label, frame = current_frame)
        self.update_image = True

    def action_flood_contiguous(self):
        '''
        Flood fill a label (not background) with a unique new label;
        alternative to watershed for fixing duplicate label issue (if cells
        are not touching). If there are no other pixels of the old label left
        after flooding, this action has the same effect as single-frame create.
        This action never changes pixels to 0. Uses self.mode.frame (the frame that
        was clicked on) instead of self.current_frame to prevent potential buggy
        behavior (eg, user changes frames before confirming action, and self.hole_fill_seed
        in new frame corresponds to a different label from self.mode.label).

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being flooded with a new value
            self.hole_fill_seed to get starting point for flooding
            self.cell_ids to get unused label to flood with
            self.add_cell_info always needed to add new label to cell_info
            self.del_cell_info sometimes needed to delete old label from frame
        '''
        # old label is definitely in original, check later if in modified
        old_label = self.mode.label
        # label used to flood area
        new_label = self.get_new_label()
        # use frame where label was selected, not current frame
        frame = self.mode.frame

        # annotation to modify
        img_ann = self.tracked[frame,:,:,0]

        # flood connected pixels of old_label with new_label, from origin point
        # of self.hole_fill_seed
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, new_label)
        # update annotation with modified image
        self.tracked[frame,:,:,0] = filled_img_ann

        # bool, whether any pixels of old_label remain in flooded image
        in_modified = np.any(np.isin(filled_img_ann, old_label))

        # this action will always add new_label to the annotation in this frame
        self.add_cell_info(add_label=new_label, frame = frame)

        # check to see if flooding removed old_label from the frame completely
        if not in_modified:
            self.del_cell_info(del_label = old_label, frame = frame)

        # reset hole_fill_seed
        self.hole_fill_seed = None

        self.update_image = True

    def action_trim_pixels(self):
        '''
        Trim away any stray (unconnected) pixels of selected label; pixels in
        frame with that label that are not connected to self.hole_fill_seed
        will be set to 0. This action will never completely delete label from frame,
        since the seed point will always be left unmodified. Used to clean up messy
        annotations, especially those with only a few pixels elsewhere in the frame,
        or to quickly clean up thresholding results.

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being trimmed
            self.hole_fill_seed is starting point to determine parts of label that
                will remain unmodified
        '''
        # use frame where label was selected, not current frame
        frame = self.mode.frame
        # label to be trimmed
        label = self.mode.label
        # image to modify
        img_ann = self.tracked[frame,:,:,0]

        # boolean array of all pixels of label that are connected to self.hole_fill_seed
        contig_cell = flood(image = img_ann, seed_point = self.hole_fill_seed)

        # any pixels in img_ann that have value 'label' and are NOT connected to hole_fill_seed
        # get changed to 0, all other pixels retain their original value
        img_trimmed = np.where(np.logical_and(np.invert(contig_cell), img_ann == label), 0, img_ann)

        # update annotation with trimmed image
        self.tracked[frame,:,:,0] = img_trimmed

        # reset hole fill seed
        self.hole_fill_seed = None

        self.update_image = True

    def add_cell_info(self, add_label, frame):
        '''
        helper function for actions that add a cell to the trk
        '''
        if add_label != 0:
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

    def del_cell_info(self, del_label, frame):
        '''
        helper function for actions that remove a cell from the trk
        '''
        if del_label != 0:
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

    def save(self):
        backup_file = self.filename + "_original.trk"
        if not os.path.exists(backup_file):
            shutil.copyfile(self.filename + ".trk", backup_file)

        # clear any empty tracks before saving file
        empty_tracks = []
        for key in self.tracks:
        	if not self.tracks[key]['frames']:
        		empty_tracks.append(self.tracks[key]['label'])
        for track in empty_tracks:
        	del self.tracks[track]

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

class ZStackReview(CalibanWindow):

    save_prompt_text = ("\nSave current file?"
                        "\nSPACE = SAVE"
                        "\nT = SAVE AS .TRK FILE"
                        "\nESC = CANCEL")

    def __init__(self, filename, raw, annotated, save_vars_mode):
        '''
        Set object attributes to store raw and annotated images (arrays),
        various settings, bind event handlers to pyglet window, and begin
        running application. Uses the filename and the output of load_npz(filename)
        as input.

        Assumes raw array is in format (frames, y, x, channels) and annotated array is
        in format (frames, y, x, features).
        '''
        # store inputs as part of ZStackReview object
        # filename used to save file later
        self.filename = filename
        # raw data used to display images and used in some actions (watershed, threshold)
        self.raw = raw
        # modifying self.annotated with actions is the main purpose of this tool
        self.annotated = annotated
        # used to determine variable names for npz upon saving file
        self.save_vars_mode = save_vars_mode

        # empty dictionary for lineage, will be populated if file is saved as trk
        self.lineage = {}

        # file opens to the first feature (like channel, but of annotation array)
        self.feature = 0
        # how many features contained in self.annotated (assumes particular data format)
        self.feature_max = self.annotated.shape[-1]
        # file opens to the first channel
        self.channel = 0

        # unpack the shape of the raw array
        self.num_frames, self.height, self.width, self.channel_max = raw.shape

        # info dictionaries that will be populated with info about labels for
        # each feature of annotation array
        self.cell_ids = {}
        self.cell_info = {}

        # populate cell_info and cell_ids with info for each feature in annotation
        # analogous to .trk lineage but do not need relationships between cells included
        for feature in range(self.feature_max):
            self.create_cell_info(feature)

        # don't display 'frames' just 'slices' in sidebar (updated on_draw)
        try:
            first_key = list(self.cell_info[0])[0]
            display_info_types = self.cell_info[0][first_key]
            self.display_info = [*sorted(set(display_info_types) - {'frames'})]
        # if there are no labels in the feature, hardcode the display info
        except:
            self.display_info = ['label', 'slices']

        # open file to first frame of annotation stack
        self.current_frame = 0

        # keeps track of information about brightness of each channel in raw images
        self.max_intensity_dict = {}
        for channel in range(self.channel_max):
            self.max_intensity_dict[channel] = np.max(self.raw[0,:,:,channel])
        # max_intensity for initial channel
        self.max_intensity = self.max_intensity_dict[self.channel]

        self.min_intensity_dict = {}
        for channel in range(self.channel_max):
            self.min_intensity_dict[channel] = 0
        self.vmin = self.min_intensity_dict[self.channel]

        # keeps track of information about adjustment of colormap for viewing annotation labels
        self.adjustment_dict = {}
        for feature in range(self.feature_max):
            self.adjustment_dict[feature] = 0
        # adjustment for initial feature
        self.adjustment = self.adjustment_dict[self.feature]

        # mouse position in coordinates of array being viewed as image, (0,0) is placeholder
        # will be updated on mouse motion
        self.x = 0
        self.y = 0

        # self.mode keeps track of selected labels, pending actions, displaying
        # prompts and confirmation dialogue, using Mode class; start with Mode.none()
        # (nothing selected, no actions pending)
        self.mode = Mode.none()
        self.mode.update_prompt_additions = self.custom_prompt

        # start with highlighting option turned off and no labels highlighted
        self.highlight = False
        self.highlighted_cell_one = -1
        self.highlighted_cell_two = -1

        # options for displaying raw image with different cmaps
        # cubehelix varies smoothly in lightness and hue, gist_yarg and gist_gray are grayscale
        # and inverted grayscale, magma and nipy_spectral are alternatives to cubehelix, and prism
        # has effect of showing contours in brightness of image
        self.cmap_options = ['cubehelix', 'gist_yarg', 'gist_gray', 'magma', 'nipy_spectral', 'prism']
        # start on cubehelix cmap
        self.current_cmap_idx = 0
        self.current_cmap = self.cmap_options[self.current_cmap_idx]

        self.brush = CalibanBrush(self.height, self.width)

        # stores y, x location of mouse click for actions that use skimage flooding
        # self.hole_fill_seed = None

        # how many times the file has been saved since it was opened
        self.save_version = 0

        super().__init__()

        # start pyglet event loop
        pyglet.app.run()

    def custom_prompt(self):
        if self.mode.kind == "QUESTION":
            if self.mode.action == "SAVE":
                self.mode.text = ZStackReview.save_prompt_text

    def handle_threshold(self):
        '''
        Helper function to do pre- and post-action bookkeeping for thresholding.
        Figures out indices to send to action_threshold_predict, calls action_threshold_predict,
        then resets variables to return to regular pixel-editing brush functionality. Used by
        on_mouse_release.

        Uses:
            self.predict_seed, self.y, self.x to calculate appropriate edges of bounding box
            self.action_threshold_predict to carry out thresholding and annotation update
            self.brush.show and self.mode are reset at end to finish/clear thresholding behavior
        '''
        # check to make sure box is actually a box and not a line
        y1, y2, x1, x2 = self.brush.get_box_coords()
        if y1 != y2 and x1 != x2:
            threshold_prediction = self.action_threshold_predict(y1, y2, x1, x2)

        # clear bounding box and Mode
        self.brush.reset()
        self.mode.clear()

    def handle_draw(self):
        '''
        Carries out brush drawing on annotation in edit mode. Handles both conversion brush
        and normal drawing or erasing. Does not update the composite image so this can be called
        either by mouse_press or mouse_drag.

        Uses:
            self.mode.kind to determine if drawing normally or using conversion brush
            self.brush.edit_val and self.brush.erase if using normal brush
            self.brush.conv_target and self.brush.conv_val if using conversion brush
            self.annotated, self.current_frame, self.feature to get frame to modify
            self.x and self.y to center brush
            self.brush.size to create skimage.draw.circle with that radius
            self.height and self.width to limit boundaries of brush (skimage.draw.circle)

        '''
        annotated = self.get_ann_current_frame()
        brush_val_in_original = np.any(np.isin(annotated, self.brush.draw_value))
        editing_val_in_original = np.any(np.isin(annotated, self.brush.background))

        annotated_draw = self.brush.draw(annotated)

        # check to see if any labels have been added or removed from frame
        # possible to add new label or delete target label
        brush_val_in_modified = np.any(np.isin(annotated_draw, self.brush.draw_value))
        editing_val_in_modified = np.any(np.isin(annotated_draw, self.brush.background))

        # label deletion
        if editing_val_in_original and not editing_val_in_modified:
            self.del_cell_info(feature = self.feature, del_label = self.brush.background, frame = self.current_frame)

        # label addition
        if brush_val_in_modified and not brush_val_in_original:
            self.add_cell_info(feature = self.feature, add_label = self.brush.draw_value, frame = self.current_frame)

        self.annotated[self.current_frame,:,:,self.feature] = annotated_draw

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        '''
        Overwrite default pyglet window on_mouse_scroll event.
        Takes x, y, scroll_x, scroll_y as params (these are what the window
        sends to this event when it is triggered by scrolling), but x, y, and
        scroll_x are not used in this custom event. Scroll_y is used to change
        brightness of raw image or the range of label colors used, depending
        on the context. Note: while in edit_mode (pixel-editing), scrolling *will*
        cause the composite to adjust multiple times, as there isn't a good way to
        check for "finished scrolling"; as a result this will cause lag if user
        scrolls too much in edit_mode.

        Uses:
            self.draw_raw to determine which image to adjust (and which adjustment to use)
            self.max_intensity_dict and self.channel to set or change the brightness of raw images
            self.cell_ids, self.adjustment_dict, self.feature to determine when to stop decreasing
                self.adjustment (applied to annotations when drawing to determine range of colormap
                applied to frame)
            self.edit_mode, self.hide_annotations to check if the composite image should be updated
        '''
        if self.key_states[key.LCTRL] or self.key_states[key.RCTRL]:
            self.adjust_zoom(scroll_y)

        else:
            # adjust brightness of raw image, if looking at raw image
            # (also applies to edit mode if self.draw_raw is True)
            if self.draw_raw:
                # regular scrolling changes maximum brightness of image
                if not self.key_states[key.LSHIFT] or self.key_states[key.RSHIFT]:
                    # self.max_intensity_dict[self.channel] has a value so we can adjust it
                    # check minimum brightness of image as lower bound of brightness adjustment
                    min_intensity = np.min(self.raw[self.current_frame,:,:,self.channel])
                    # adjust max brightness value by a percentage of the current value
                    raw_adjust = max(int(self.max_intensity_dict[self.channel] * 0.02), 1)
                    # set the adjusted max brightness value, but it should never be the same or less than
                    # the minimum brightness in the image
                    self.max_intensity_dict[self.channel] = max(self.max_intensity_dict[self.channel] - raw_adjust * scroll_y,
                                                            min_intensity + 1)
                    self.max_intensity = self.max_intensity_dict[self.channel]

                # change vmin cutoff (low values appear darker when vmin increased)
                else:
                    min_intensity = np.min(self.raw[self.current_frame,:,:,self.channel])
                    new_vmin = self.vmin + max(int(min_intensity*0.02), 1) * scroll_y
                    new_vmin = min(new_vmin, min_intensity)
                    new_vmin = max(new_vmin, 0)
                    self.min_intensity_dict[self.channel] = new_vmin
                    self.vmin = new_vmin

            # adjusting colormap range of annotations
            elif not self.draw_raw:
                # self.adjustment value for the current feature should never reduce possible colors to 0
                if self.get_max_label() + (self.adjustment_dict[self.feature] - 1 * scroll_y) > 0:
                    self.adjustment_dict[self.feature] = self.adjustment_dict[self.feature] - 1 * scroll_y
                self.adjustment = self.adjustment_dict[self.feature]

            # color/brightness adjustments will change what the composited image looks like
            if self.edit_mode and not self.hide_annotations:
                self.helper_update_composite()

            self.update_image = True

    def on_key_press(self, symbol, modifiers):
        '''
        Event handler for keypresses in pyglet window. (Mouse does not have
        to be within window for keypress events to occur, as long as window
        has focus.) Keypresses are context-dependent and are organized into
        helper functions grouped by context. Universal keypresses apply in
        any context, while other keypresses (eg, those that trigger actions)
        are naturally grouped together. Some keybinds occur in specific contexts
        and may be grouped into "misc" helper functions.

        Actions that modify the file are carried out in two steps: a keybind that
        prompts the action, and a subsequent keybind to confirm the decision (and
        choose options, where applicable). Any keybind whose effect is to set
        self.mode to a new Mode object requires a secondary action, often a keybind,
        to confirm. When actions are carried out, self.mode is reset to Mode.none().

        Note: this event handler is called when the key is pressed down. Holding down
        or releasing keys do not affect this event handler. For keys that are being held
        down at time of other events, query self.key_states[key], which makes use of
        pyglet's KeyStateHandler class.

        Uses:
            symbol: integer representation of keypress, compare against pyglet.window.key
                (modifiers do not affect symbol, so "a" and "A" are both key.A)
            modifiers: keys like shift, ctrl that are held down at the time of keypress
            (see pyglet docs for further explanation of these inputs and list of modifiers)
        '''
        # always carried out regardless of context
        self.universal_keypress_helper(symbol, modifiers)

        # context: only while in pixel-editing mode
        if self.edit_mode:
            # context: always carried out in pixel-editing mode (eg, image filters)
            self.edit_mode_universal_keypress_helper(symbol, modifiers)
            # context: specific cases
            self.edit_mode_misc_keypress_helper(symbol, modifiers)
            # context: only when another action is not being performed (eg, thresholding)
            if self.mode.kind is None:
                self.edit_mode_none_keypress_helper(symbol, modifiers)

        # context: only while in label-editing mode
        else:
            # unusual context for keybinds
            self.label_mode_misc_keypress_helper(symbol, modifiers)
            # context: no labels selected
            if self.mode.kind is None:
                self.label_mode_none_keypress_helper(symbol, modifiers)
            # context: one label selected
            elif self.mode.kind == "SELECTED":
                self.label_mode_single_keypress_helper(symbol, modifiers)
            # context: two labels selected
            elif self.mode.kind == "MULTIPLE":
                self.label_mode_multiple_keypress_helper(symbol, modifiers)
            # context: responding to question (eg, confirming an action)
            elif self.mode.kind == "QUESTION":
                self.label_mode_question_keypress_helper(symbol, modifiers)

    def universal_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that
        are handled here apply in every situation (no logic checks
        within on_key_press before universal_keypress_helper is called!)
        so *no other commands may share these keybinds.*

        Keybinds:
            a or left arrow key: view previous frame
            d or right arrow key: view next frame
            v: toggle cursor visibility
            h: toggle highlighting
            escape: clear selection or cancel action
            minus: zoom out
            equal: zoom in
            pg up: pan up across image (+ctrl to go to top, +shift to move halfway across current screen)
            pg dn: pan down across image (+ctrl to go to top, +shift to move halfway across current screen)
            home: pan left across image (+ctrl to go to top, +shift to move halfway across current screen)
            end: pan right across image (+ctrl to go to top, +shift to move halfway across current screen)
            F11: toggle fullscreen
        '''

        # CHANGING FRAMES
        # Move through frames faster (5 at a time) when holding shift
        num_frames_changed = 5 if modifiers & key.MOD_SHIFT else 1
        # Go backward through frames (stop at frame 0)
        if symbol in {key.LEFT, key.A}:
            old_frame = self.current_frame
            self.current_frame = max(self.current_frame - num_frames_changed, 0)
            if old_frame != self.current_frame:
                # if you change frames while you've viewing composite, update composite
                if self.edit_mode and not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True
        # Go forward through frames (stop at last frame)
        elif symbol in {key.RIGHT, key.D}:
            old_frame = self.current_frame
            self.current_frame = min(self.current_frame + num_frames_changed, self.num_frames - 1)
            if old_frame != self.current_frame:
                # if you change frames while you've viewing composite, update composite
                if self.edit_mode and not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

        # TOGGLE CURSOR VISIBILITY
        # most useful in edit mode, but inconvenient if can't be turned back on elsewhere
        elif symbol == key.V:
            self.mouse_visible = not self.mouse_visible
            self.window.set_mouse_visible(self.mouse_visible)

        # TOGGLE HIGHLIGHT
        # note: shift+H is conditional keybind elsewhere
        elif symbol == key.H and not (modifiers & key.MOD_SHIFT):
            self.highlight = not self.highlight
            self.update_image = True

        # CLEAR/CANCEL ACTION
        elif symbol == key.ESCAPE:
            # clear highlighted cells
            self.highlighted_cell_one = -1
            self.highlighted_cell_two = -1
            # clear hole fill seed (used in hole fill, trim pixels, flood contiguous)
            self.hole_fill_seed = None
            # reset self.mode (deselects labels, clears actions)
            self.mode.clear()
            # reset from thresholding
            self.brush.reset()
            self.update_image = True

        elif symbol == key.MINUS:
            self.adjust_zoom(-1)
        elif symbol == key.EQUAL:
            self.adjust_zoom(1)

        # QUICK PANNING
        elif symbol == key.PAGEUP:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = -(self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = -self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = -self.visible_y_pix*self.scale_factor)
        elif symbol == key.PAGEDOWN:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = (self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = self.visible_y_pix*self.scale_factor)
        elif symbol == key.HOME:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = (self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = self.visible_x_pix*self.scale_factor, dy = 0)
        elif symbol == key.END:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = -(self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = -self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = - self.visible_x_pix*self.scale_factor, dy = 0)

        elif symbol == key.F11:
            self.window.set_fullscreen(fullscreen = not self.window.fullscreen)
            self.update_image = True

    def edit_mode_universal_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here always apply to pixel-editing mode, so these keybinds
        may be reused in label-editing mode, but cannot be used elsewhere
        in pixel-editing mode.

        Keybinds:
            i: invert light/dark in raw image (does not affect color of overlay)
            k: toggle sobel filter (emphasizes edges) on raw image
            j: toggle adaptive histogram equalization of raw image
            shift + h: toggles annotation visibility (can still edit annotations while hidden,
                but intended to provide clearer look at filtered raw image if needed)
        '''
        # INVERT RAW IMAGE LIGHT/DARK
        if symbol == key.I:
            self.invert = not self.invert
            # if you invert the image while you're viewing composite, update composite
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE SOBEL FILTER
        if symbol == key.K:
            self.sobel_on = not self.sobel_on
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE ADAPTIVE HISTOGRAM EQUALIZATION
        if symbol == key.J:
            self.adapthist_on = not self.adapthist_on
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # TOGGLE ANNOTATION VISIBILITY
        if symbol == key.H:
            if modifiers & key.MOD_SHIFT:
                self.hide_annotations = not self.hide_annotations
                # in case any display changes have been made while hiding annotations
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

    def edit_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode only when another action
        or prompt is not in use (ie, not in the middle of the color picker
        prompt, thresholding prompt, or conversion brush mode). These keybinds
        include leaving edit mode, changing the value of the normal brush, and
        initiating actions.

        Keybinds:
            e: leave edit mode
            ] (right bracket): increase value of normal brush
            [ (left bracket): decrease value of normal brush
            n: set normal brush to new value (highest label in file + 1)
            x: toggle eraser (only applies to normal brush)
            p: color picker action
            r: start conversion brush
            s: prompt saving file
            t: prompt thresholding
        '''
        # LEAVE EDIT MODE
        if symbol == key.E:
            self.edit_mode = False
            self.update_image = True

        # BRUSH VALUE ADJUSTMENT
        # increase brush value, caps at max value + 1
        if symbol == key.BRACKETRIGHT:
            self.brush.increase_edit_val(window = self)
            self.update_image = True
        # decrease brush value, can't decrease past 1
        if symbol == key.BRACKETLEFT:
            self.brush.decrease_edit_val()
            self.update_image = True
        # set brush to unused label
        if symbol == key.N:
            self.brush.set_edit_val(self.get_new_label())
            self.update_image = True

        # TOGGLE ERASER
        if symbol == key.X:
            self.brush.toggle_erase()
            self.update_brush_image = True

        # ACTIONS - COLOR PICKER
        if symbol == key.P:
            self.mode.update("PROMPT", action = "PICK COLOR", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - CONVERSION BRUSH
        if symbol == key.R:
            self.mode.update("PROMPT", action="CONVERSION BRUSH TARGET", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - SAVE FILE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")
        # ACTIONS - THRESHOLD
        if symbol == key.T:
            self.mode.update("PROMPT", action = "DRAW BOX", **self.mode.info)
            self.brush.show = False
            self.brush.disable_drawing()
            self.brush.clear_view()
            self.update_image = True

    def edit_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else.

        Keybinds:
            down key: decrease size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            up key: increase size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            n: set conversion brush value to unused (max label + 1) value;
                analogous to setting normal brush value with this keybind,
                but specifically when picking a label for the conversion brush
                value (note that allowing this option for the conversion brush
                target would be counterproductive)
            space: confirm saving file
            t: confirm saving file in trk format
        '''
        # BRUSH MODIFICATION KEYBINDS
        # (don't want to adjust brush if thresholding; applies to both
        # normal brush and conversion brushes)
        if self.brush.show:
            # BRUSH SIZE ADJUSTMENT
            # decrease brush size
            if symbol == key.DOWN:
                self.brush.decrease_size()
                self.update_brush_image = True
            # increase brush size
            if symbol == key.UP:
                self.brush.increase_size()
                self.update_brush_image = True

        # SET CONVERSION BRUSH VALUE TO UNUSED LABEL
        # TODO: update Mode prompt to reflect that you can do this
        if self.mode.kind == "PROMPT" and self.mode.action == "CONVERSION BRUSH VALUE":
            if symbol == key.N:
                self.brush.set_conv_val(self.get_new_label())
                self.mode.update("DRAW", action = "CONVERSION",
                        conversion_brush_target = self.brush.conv_target,
                        conversion_brush_value = self.brush.conv_val)
                self.update_image = True

        # RESPOND TO SAVE QUESTION
        if self.mode.kind == "QUESTION" and self.mode.action == "SAVE":
            if symbol == key.SPACE:
                self.save()
                self.mode.clear()
            if symbol == key.T:
                self.save_as_trk()
                self.mode.clear()

    def label_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else. Since very
        few keybinds are universal to label-editing mode (as opposed to the
        different filter options in pixel-editing mode), "universal" label-mode
        keybinds are also found here.

        Keybinds:
            z: toggle between viewing raw images and annotations ("universal")
            i: invert dark/light of image when viewing raw
            k: toggle sobel filter when viewing raw
            j: toggle adaptive histogram equalization when viewing raw
            shift + up, shift + down: cycle through colormaps, only applies when
                viewing the raw image
        '''
        # toggle raw/label display, "universal" in label mode
        if symbol == key.Z:
            self.draw_raw = not self.draw_raw
            self.update_image = True

        # HIGHLIGHT CYCLING
        # TODO: add highlight cycling when cell not selected
        # check that highlighted cell != -1

        # cycle through colormaps, but only while viewing raw
        if self.draw_raw:

            # INVERT RAW IMAGE LIGHT/DARK
            if symbol == key.I:
                self.invert = not self.invert
                # if you invert the image while you're viewing composite, update composite
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            # TOGGLE SOBEL FILTER
            if symbol == key.K:
                self.sobel_on = not self.sobel_on
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            # TOGGLE ADAPTIVE HISTOGRAM EQUALIZATION
            if symbol == key.J:
                self.adapthist_on = not self.adapthist_on
                if not self.hide_annotations:
                    self.helper_update_composite()
                self.update_image = True

            if modifiers & key.MOD_SHIFT:
                if symbol == key.UP:
                    if self.current_cmap_idx == len(self.cmap_options) - 1:
                        self.current_cmap_idx = 0
                    elif self.current_cmap_idx < len(self.cmap_options) - 1:
                        self.current_cmap_idx += 1
                    self.current_cmap = self.cmap_options[self.current_cmap_idx]
                    self.update_image = True

                if symbol == key.DOWN:
                    if self.current_cmap_idx == 0:
                        self.current_cmap_idx = len(self.cmap_options) - 1
                    elif self.current_cmap_idx > 0:
                        self.current_cmap_idx -= 1
                    self.current_cmap = self.cmap_options[self.current_cmap_idx]
                    self.update_image = True

    def label_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if no labels are
        selected and no actions are awaiting confirmation.

        Keybinds:
            c: go forward through channels
            C (shift + c): go backward through channels
            f: go forward through features
            F (shift + f): go backward through features
            ] (right bracket): increment currently-highlighted label by 1
            [ (left bracket): decrement currently-highlighted label by 1
            e: enter pixel-editing mode
            s: prompt saving a copy of the file
            p: predict 3D labels (computer vision, not deep learning)
            r: relabel annotations (different methods available)
        '''
        # CHANGE CHANNELS
        if symbol == key.C:
            # hold shift to go backward
            if modifiers & key.MOD_SHIFT:
                if self.channel == 0:
                    self.channel = self.channel_max - 1
                else:
                    self.channel -= 1
            # go forward through channels
            else:
                if self.channel + 1 == self.channel_max:
                    self.channel = 0
                else:
                    self.channel += 1
            self.change_channel()

        # CHANGE FEATURES
        if symbol == key.F:
            if self.feature_max > 1:
                # hold shift to go backward
                if modifiers & key.MOD_SHIFT:
                    if self.feature == 0:
                        self.feature = self.feature_max - 1
                    else:
                        self.feature -= 1
                # go forward through channels
                else:
                    if self.feature + 1 == self.feature_max:
                        self.feature = 0
                    else:
                        self.feature += 1

        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if (self.highlighted_cell_one < self.get_max_label() and
                self.highlighted_cell_one > -1):
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            if self.highlight:
                self.update_image = True

        # ENTER EDIT MODE
        if symbol == key.E:
            self.edit_mode = True
            # update composite with changes, if needed
            if not self.hide_annotations:
                self.helper_update_composite()
            self.update_image = True

        # SAVE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")

        # PREDICT
        if symbol == key.P:
            self.mode.update("QUESTION", action="PREDICT", **self.mode.info)

        # RELABEL
        if symbol == key.R:
            self.mode.update("QUESTION", action='RELABEL', **self.mode.info)

    def label_mode_single_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if one label is
        selected and no actions are awaiting confirmation.

        Keybinds:
            ] (right bracket): increment currently-highlighted label by 1
            [ (left bracket): decrement currently-highlighted label by 1
            c: prompt creation of new label
            f: prompt hole fill
            x: prompt deletion of label in frame
        '''
        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if (self.highlighted_cell_one < self.get_max_label() and
                self.highlighted_cell_one > -1):
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            # deselect label, since highlighting is now decoupled from selection
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            # deselect label
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        # CREATE CELL
        if symbol == key.C:
            self.mode.update("QUESTION", action="CREATE NEW", **self.mode.info)

        # HOLE FILL
        if symbol == key.F:
            self.mode.update("PROMPT", action="FILL HOLE", **self.mode.info)

        # DELETE CELL
        if symbol == key.X:
            self.mode.update("QUESTION", action="DELETE", **self.mode.info)

    def label_mode_multiple_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if two labels are
        selected and no actions are awaiting confirmation. (Note: the
        two selected labels must be the same label for watershed to work,
        and different labels for replace and swap to work.)

        Keybinds:
            r: prompt replacement of one label with another
            s: prompt swap between two labels
            w: prompt watershed action
        '''
        # REPLACE
        if symbol == key.R:
            self.mode.update("QUESTION", action="REPLACE", **self.mode.info)

        # SWAP
        if symbol == key.S:
            self.mode.update("QUESTION", action="SWAP", **self.mode.info)

        # WATERSHED
        if symbol == key.W:
            self.mode.update("QUESTION", action="WATERSHED", **self.mode.info)

    def label_mode_question_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode when actions are awaiting
        confirmation. Most actions are confirmed with the space key, while
        others have different options mapped to other keys. Keybinds in this
        helper function are grouped by the question they are responding to.

        Keybinds:
            space: carries out action; when action can be applied to single OR
                multiple frames, space carries out the multiple frame option
            s: carries out single-frame version of action where applicable
            t: save npz with empty lineage as trk filetype
            u: relabel annotations in file with "unique" strategy
            p: relabel annotations in file with "preserve" strategy
        '''
        # RESPOND TO SAVE QUESTION
        if self.mode.action == "SAVE":
            if symbol == key.T:
                self.save_as_trk()
                self.mode.clear()
            if symbol == key.SPACE:
                self.save()
                self.mode.clear()

        # RESPOND TO RELABEL QUESTION
        elif self.mode.action == "RELABEL":
            if symbol == key.U:
                self.action_relabel_unique()
                self.mode.clear()
            if symbol == key.P:
                self.action_relabel_preserve()
                self.mode.clear()
            if symbol == key.S:
                self.action_relabel_frame()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_relabel_all_frames()
                self.mode.clear()

        # RESPOND TO PREDICT QUESTION
        elif self.mode.action == "PREDICT":
            if symbol == key.S:
                self.action_predict_single()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_predict_zstack()
                self.mode.clear()

        # RESPOND TO CREATE QUESTION
        elif self.mode.action == "CREATE NEW":
            if symbol == key.S:
                self.action_new_single_cell()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_new_cell_stack()
                self.mode.clear()

        # RESPOND TO REPLACE QUESTION
        elif self.mode.action == "REPLACE":
            if symbol == key.S:
                self.action_replace_single()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_replace()
                self.mode.clear()

        # RESPOND TO SWAP QUESTION
        elif self.mode.action == "SWAP":
            if symbol == key.S:
                self.action_swap_single_frame()
                self.mode.clear()
            if symbol == key.SPACE:
                self.action_swap_all()
                self.mode.clear()

        # RESPOND TO DELETE QUESTION
        elif self.mode.action == "DELETE":
            if symbol == key.SPACE:
                self.action_delete_mask()
                self.mode.clear()

        # RESPOND TO WATERSHED QUESTION
        elif self.mode.action == "WATERSHED":
            if symbol == key.SPACE:
                self.action_watershed()
                self.mode.clear()

        # RESPOND TO TRIM PIXELS QUESTION
        elif self.mode.action == "TRIM PIXELS":
            if symbol == key.SPACE:
                self.action_trim_pixels()
                self.mode.clear()

        # RESPOND TO FLOOD CELL QUESTION
        elif self.mode.action == "FLOOD CELL":
            if symbol == key.SPACE:
                self.action_flood_contiguous()
                self.mode.clear()

    def get_raw_current_frame(self):
        return self.raw[self.current_frame,:,:,self.channel]

    def get_ann_current_frame(self):
        return self.annotated[self.current_frame,:,:,self.feature]

    def get_label(self):
        '''
        Helper function that returns the label currently being hovered over.
        Currently, this helper function just provides a nice little abstraction,
        but this could also help the existing code stay flexible with additional
        data formats.
        '''
        return int(self.annotated[self.current_frame, self.y, self.x, self.feature])

    def get_max_label(self):
        '''
        Helper function that returns the highest label in use in currently-viewed
        feature. If feature is empty, returns 0 to prevent other functions from crashing.
        (Replaces use of self.num_cells to keep track of this info, should
        also help with code flexibility.)
        '''
        # check this first, np.max of empty array will crash
        if len(self.cell_ids[self.feature]) == 0:
            max_label = 0
        # if any labels exist in feature, find the max label
        else:
            max_label = int(np.max(self.cell_ids[self.feature]))
        return max_label

    def get_new_label(self):
        '''
        Helper function that returns a new label (doesn't currently exist in
        annotation feature). The new label is the highest label that currently
        exists in the feature, plus 1, which will always be unused. Does not
        ever return labels that have been skipped, although these labels are also
        technically unused.

        Uses:
            self.cell_ids, which is a list of the labels present in file (does not
                contain other information, as cell_info dict does); cell_ids is updated
                when labels are added or removed from features, so this accurately
                represents which labels are currently in use
        '''
        return (self.get_max_label() + 1)

    def get_label_info(self, label):
        return self.cell_info[self.feature][label]

    def create_frame_text(self):
        frame_text = ("Frame: {}\n".format(self.current_frame)
                    + "Channel: {}\n".format(self.channel)
                    + "Feature: {}\n".format(self.feature))
        return frame_text

    def change_channel(self):
        '''
        Method that updates current attributes as needed based on which
        channel is being viewed.
        '''
        # in this case we only need to update self.max_intensity
        self.max_intensity = self.max_intensity_dict[self.channel]
        self.vmin = self.min_intensity_dict[self.channel]
        if self.draw_raw:
            self.update_image = True

    def change_feature(self):
        '''
        Method that updates current attributes as needed based on which
        feature is being viewed.
        '''
        # only need to update self.adjustment
        self.adjustment = self.adjustment_dict[self.feature]

    def action_new_single_cell(self):
        """
        Create new label in just one frame by replacing selected label with new
        value everywhere old label value occurs in current frame. Not appropriate
        for resolving duplicate label issues (see action_flood_contiguous or
        action_watershed to create a new label in only part of an existing label).
        Used to correct 3D relationships (eg, daughter cell misidentified as the same
        label as its parent, obscuring the division).

        Uses:
            self.mode.label is the selected label to replace with a new (unused) label
            self.mode.frame and self.feature to get the correct frame of annotations to modify
            self.cell_ids to pick an unused label
            self.add_cell_info and self.del_cell_info to update information after change (change
                is always made, no need to check these first)
        """
        old_label, single_frame = self.mode.label, self.mode.frame
        new_label = self.get_new_label()

        # replace frame labels
        frame = self.annotated[single_frame,:,:,self.feature]
        frame[frame == old_label] = new_label

        # replace fields
        self.del_cell_info(feature = self.feature, del_label = old_label, frame = single_frame)
        self.add_cell_info(feature = self.feature, add_label = new_label, frame = single_frame)
        self.update_image = True

    def action_new_cell_stack(self):
        """
        Creates new cell label and replaces original label with it in selected and
        all subsequent frames. Not appropriate for resolving duplicate label issues, since
        any pixel with the old label in the modified frames will be replaced with the new label.
        Used to correct 3D relationships (eg, cell division not detected and daughter cell tracked
        as parent cell throughout movie, or two cells at same x and y position and different z position
        misidentified as being same cell).

        Uses:
            self.mode.label is the selected label to replace with a new (unused) label
            self.mode.frame and self.feature to get the correct frames of annotations to modify
            self.cell_ids to pick an unused label
            self.add_cell_info and self.del_cell_info to update information after change (checked
                before calling, since old label is only guaranteed to be in the frame it is selected in)
        """
        old_label, start_frame = self.mode.label, self.mode.frame
        new_label = self.get_new_label()

        # replace frame labels
        for frame in self.annotated[start_frame:,:,:,self.feature]:
            frame[frame == old_label] = new_label

        # update cell info each time a label is actually replaced with new label
        for frame in range(self.annotated.shape[0]):
            if new_label in self.annotated[frame,:,:,self.feature]:
                self.del_cell_info(feature = self.feature, del_label = old_label, frame = frame)
                self.add_cell_info(feature = self.feature, add_label = new_label, frame = frame)
        self.update_image = True

    def action_replace_single(self):
        '''
        Overwrite all pixels of label_2 with label_1 in whichever frame label_2
        was selected (even if currently viewing a different frame, since label_2
        may not be present in current frame if user has changed frames since selection).
        label_1 does not need to be in the same frame as label_2, although it can be.
        Can be used to correct segmentation in frame (eg, one cell mistakenly segmented
        with two labels) or to correct 3D relationships (same cell has label_1 in first frame
        and label_2 in next frame, but should always be label_1).

        Uses:
            self.mode.label_1 is first label selected (will be used to overwrite)
            self.mode.label_2 is second label selected (will be overwritten)
            self.mode.frame_2 is the frame in which label_2 was selected; this will be
                the only frame modified in this action
            self.feature used to get correct annotation frame
            self.add_cell_info and self.del_cell_info used to update cell info (label_2 will
                always be completely removed from frame by this action, and will always have
                label_1 in frame after action)
        '''
        # label_1 is first label selected, label_2 is second label selected
        # order of selection is important here
        label_1, label_2 = self.mode.label_1, self.mode.label_2
        frame = self.mode.frame_2

        # replacing a label with itself crashes Caliban, not good
        if label_1 == label_2:
            pass
        # the labels are different
        else:
            # frame to replace label_2 in
            annotated = self.annotated[frame,:,:,self.feature]
            # any instance of label_2 in this frame overwritten with label_1
            annotated[annotated == label_2] = label_1
            # update cell info
            self.add_cell_info(feature = self.feature, add_label = label_1, frame = frame)
            self.del_cell_info(feature = self.feature, del_label = label_2, frame = frame)
            self.update_image = True

    def action_replace(self):
        """
        Replaces label_2 with label_1. Overwrites every label_2 in the npz
        with label_1 and updates cell_info accordingly. After this action, label_2
        will not exist in any frames in the feature. Use with caution, as this action
        can cause duplicate label issues. Used to correct 3D relationships in some cases
        (eg, division falsely detected and 'daughter' cell should actually be parent cell in
        all frames).

        Uses:
            self.mode.label_1 is first label selected (will be used to overwrite)
            self.mode.label_2 is second label selected (will be overwritten)
            self.feature used to get correct annotation frames
            self.add_cell_info and self.del_cell_info used to update cell info (label_2 will
                always be completely removed from feature by this action, label_1 will be
                added to each frame label_2 was removed from)
        """
        label_1, label_2 = self.mode.label_1, self.mode.label_2

        #replacing a label with itself crashes Caliban, not good
        if label_1 == label_2:
            pass
        else:
            # check each frame
            for frame in range(self.annotated.shape[0]):
                annotated = self.annotated[frame,:,:,self.feature]
                # is label_2 present in that frame:
                if np.any(np.isin(annotated, label_2)):
                    # replace all pixels of label_2 with label_1
                    annotated[annotated == label_2] = label_1
                    # update cell_info for that frame
                    self.add_cell_info(feature = self.feature, add_label = label_1, frame = frame)
                    self.del_cell_info(feature = self.feature, del_label = label_2, frame = frame)
            self.update_image = True

    def action_swap_all(self):
        '''
        Swap label_1 and label_2 in all frames of file (order of selection
        does not matter). Modifies cell info by switching the 'frames' info
        between label_1 and label_2 (but does not need adding/deleting info
        functions). Affects all frames that contain either label_1 or label_2,
        eg if a frame has only label_1 before swap, after swap it will contain
        only label_2. This function does not have a lot of use cases, since it
        doesn't meaningfully correct mistakes, but could be used to swap labels
        to make colormap distinctions more clear.

        May remove in subsequent version of Caliban.

        Uses:
            self.mode.label_1 is first label selected (order not important)
            self.mode.label_2 is second label selected (order not important)
            self.feature used to get correct annotation frames
            self.cell_info used (to swap 'frames' entries between label_1 and label_2)
        '''
        label_1 = self.mode.label_1
        label_2 = self.mode.label_2

        # for each frame, switch label_1 and label_2
        for frame in range(self.annotated.shape[0]):
            # get frame
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
        self.update_image = True

    def action_swap_single_frame(self):
        '''
        Swap label_1 and label_2 in just one frame (order of selection
        does not matter). Labels must be selected in same frame for single frame
        swap to work, and will be swapped in the frame where they were selected (not
        current frame, if frame has changed). Does not modify cell_info, since the
        frame will contain label_1 and label_2 before and after swap. Used to correct
        3D relationships when two labels are incorrectly swapped in one or a handful
        of frames. (Faster and more intuitive than the alternative of multiple create +
        replace actions.)

        Uses:
            self.mode.label_1 is first label selected (order not important)
            self.mode.label_2 is second label selected (order not important)
            self.feature used to get correct annotation frame
        '''
        # frame and label selection info stored in self.mode
        label_1, frame_1 = self.mode.label_1, self.mode.frame_1
        label_2, frame_2 = self.mode.label_2, self.mode.frame_2

        # no use in swapping label with itself, or swapping between different frames
        if label_1 != label_2 and frame_1 == frame_2:
            frame = frame_1
            # get the frame in which labels will be swapped
            ann_img = self.annotated[frame,:,:,self.feature]
            # swap
            ann_img = np.where(ann_img == label_1, -1, ann_img)
            ann_img = np.where(ann_img == label_2, label_1, ann_img)
            ann_img = np.where(ann_img == -1, label_2, ann_img)
            # update self.annotated with swapped frame
            self.annotated[frame,:,:,self.feature] = ann_img
            self.update_image = True

    def action_watershed(self):
        '''
        Use watershed transform to split a single label into two labels
        (original label and new label) based on selected seed points.
        Watershed transform is based on raw image current frame and channel.
        The watershed action differs from other multi-click actions in that
        the labels selected must be the same label and should be selected in
        same frame (not explicitly required by action, but you may get strange
        results otherwise). This action will only modify the original label and
        will not overwrite other labels or delete pixels of the original label.
        Watershed results depend on both the underlying image and the clicked
        locations, clean split not guaranteed.

        Uses:
            self.mode.label_1 is the label to get split by watershed
            self.cell_ids to create a new valid label
            self.add_cell_info to add new label to cell_info if it is generated,
                original label will never be completely removed from frame by this action
        '''
        # TODO: add logic checks to make sure label_1 and label_2 are the same,
        # and seed locations are from same frame

        # Pull the label that is being split and find a new valid label
        current_label = self.mode.label_1
        new_label = self.get_new_label()

        # Locally store the frames to work on
        img_raw = self.raw[self.current_frame,:,:,self.channel]
        img_ann = self.annotated[self.current_frame,:,:,self.feature]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)
        # create two seed locations
        seeds_labeled[self.mode.y1_location, self.mode.x1_location]=current_label
        seeds_labeled[self.mode.y2_location, self.mode.x2_location]=new_label

        # define the bounding box to apply the transform on
        # and select appropriate sections of 3 inputs (raw, seeds, annotation mask)
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

        # did watershed effectively create a new label?
        new_pixels = np.count_nonzero(np.logical_and(ws == new_label, img_sub_ann == current_label))
        # if only a few pixels split, dilate them; new label is "brightest"
        # so will expand over other labels and increase area
        if new_pixels < 5:
            ws = dilation(ws, disk(3))

        # ws may only leave a few pixels of old label
        old_pixels = np.count_nonzero(ws == current_label)
        if old_pixels < 5:
            # create dilation image so "dimmer" label is not eroded by "brighter" label
            dilated_ws = dilation(np.where(ws==current_label, ws, 0), disk(3))
            ws = np.where(dilated_ws==current_label, dilated_ws, ws)

        # only update img_sub_ann where ws has changed label from current_label to new_label
        img_sub_ann = np.where(np.logical_and(ws == new_label,img_sub_ann == current_label), ws, img_sub_ann)

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.annotated[self.current_frame,:,:,self.feature] = img_ann

        #update cell_info dict only if new label was created with ws
        if np.any(np.isin(self.annotated[self.current_frame,:,:,self.feature], new_label)):
            self.add_cell_info(feature=self.feature, add_label=new_label, frame = self.current_frame)
            self.update_image = True

    def action_threshold_predict(self, y1, y2, x1, x2):
        '''
        Given user-determined bounding box coordinates, calculates and
        applies thresholding based on raw image to add new label to annotation.
        Does not overwrite existing annotations, so new label will not always
        appear in annotation. If new label is generated via thresholding, the
        annotation and cell_info will be updated.

        Uses:
            y1, y2, x1, x2 are bounding box coordinates finalized in
                on_mouse_release after drawing thresholding box
            self.raw, self.current_frame, self.channel used with bounding box
                coordinates to get region of raw image that will be thresholded
            self.annotated, self.current_frame, self.feature and bounding box
                coordinates to modify the annotation with thresholding results
            self.add_cell_info to update cell_info if a label is added
        '''

        # pull out the selection portion of the raw frame
        predict_area = self.raw[self.current_frame, y1:y2, x1:x2, self.channel]

        # triangle threshold picked after trying a few on one dataset
        # may not be the best threshold approach for other datasets!
        # pick two thresholds to use hysteresis thresholding strategy
        threshold = filters.threshold_triangle(image = predict_area)
        threshold_stringent = 1.10 * threshold

        # use a unique label for predction
        new_label = self.get_new_label()

        # try to keep stray pixels from appearing with hysteresis approach
        hyst = filters.apply_hysteresis_threshold(image = predict_area,
            low = threshold, high = threshold_stringent)
        # apply new_label to areas of threshold that are True (foreground),
        # 0 for False (background)
        ann_threshold = np.where(hyst, new_label, 0)

        #put prediction in without overwriting
        predict_area = self.annotated[self.current_frame, y1:y2, x1:x2, self.feature]
        # only the background region of original annotation gets updated with ann_threshold
        safe_overlay = np.where(predict_area == 0, ann_threshold, predict_area)

        # don't need to update cell_info unless an annotation has been added
        if np.any(np.isin(safe_overlay, new_label)):
            self.add_cell_info(feature=self.feature, add_label=new_label, frame = self.current_frame)
            # update annotation with thresholded region
            self.annotated[self.current_frame,y1:y2,x1:x2,self.feature] = safe_overlay
            self.update_image = True

    def action_delete_mask(self):
        '''
        Delete selected label from the frame it was selected in.
        Only exists as single-frame action.

        Uses:
            self.mode.label is selected label (to be deleted)
            self.mode.frame is the frame in which the label was selected
            self.del_cell_info to update cell_info appropriately
        '''

        label = self.mode.label
        frame = self.mode.frame

        ann_img = self.annotated[frame,:,:,self.feature]
        ann_img = np.where(ann_img == label, 0, ann_img)

        self.annotated[frame,:,:,self.feature] = ann_img

        self.del_cell_info(feature = self.feature, del_label = label, frame = frame)
        self.update_image = True

    def action_fill_hole(self):
        '''
        Fill a hole (flood connected regions of background) with selected label.
        Does not affect other labels (self.mouse_press_prompt_helper checks value
        of annotation at clicked position before carrying out action). Connectivity
        value of 1 is more restrictive than other flooding actions and prevents hole
        filling from spilling out beyond enclosed empty space in some cases.

        Uses:
            self.mode.label is label to flood background with
            self.hole_fill_seed is determined on click and used to flood area
            self.annotated, self.current_frame, self.feature to get frame to modify
            self.add_cell_info to update cell info if needed
        '''
        # get frame of annotation to modify
        img_ann = self.annotated[self.current_frame,:,:,self.feature]
        # create modified image flooded with value at self.hole_fill_seed
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, self.mode.label, connectivity = 1)
        # update annotation with modified image
        self.annotated[self.current_frame,:,:,self.feature] = filled_img_ann

        # add info in case current_frame didn't already contain that label
        # (user may change frames between action prompt and click)
        # will not cause error if the label was already in that frame
        self.add_cell_info(feature=self.feature, add_label=self.mode.label, frame=self.current_frame)

        # reset hole_fill_seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_flood_contiguous(self):
        '''
        Flood fill a label (not background) with a unique new label;
        alternative to watershed for fixing duplicate label issue (if cells
        are not touching). If there are no other pixels of the old label left
        after flooding, this action has the same effect as single-frame create.
        This action never changes pixels to 0. Uses self.mode.frame (the frame that
        was clicked on) instead of self.current_frame to prevent potential buggy
        behavior (eg, user changes frames before confirming action, and self.hole_fill_seed
        in new frame corresponds to a different label from self.mode.label).

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being flooded with a new value
            self.hole_fill_seed to get starting point for flooding
            self.cell_ids to get unused label to flood with
            self.add_cell_info always needed to add new label to cell_info
            self.del_cell_info sometimes needed to delete old label from frame
        '''
        # old label is definitely in original, check later if in modified
        old_label = self.mode.label
        # label used to flood area
        new_label = self.get_new_label()
        # use frame where label was selected, not current frame
        frame = self.mode.frame

        # annotation to modify
        img_ann = self.annotated[frame,:,:,self.feature]

        # flood connected pixels of old_label with new_label, from origin point
        # of self.hole_fill_seed
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, new_label)
        # update annotation with modified image
        self.annotated[frame,:,:,self.feature] = filled_img_ann

        # bool, whether any pixels of old_label remain in flooded image
        in_modified = np.any(np.isin(filled_img_ann, old_label))

        # this action will always add new_label to the annotation in this frame
        self.add_cell_info(feature=self.feature, add_label=new_label, frame = frame)

        # check to see if flooding removed old_label from the frame completely
        if not in_modified:
            self.del_cell_info(feature = self.feature, del_label = old_label, frame = frame)

        # reset hole_fill_seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_trim_pixels(self):
        '''
        Trim away any stray (unconnected) pixels of selected label; pixels in
        frame with that label that are not connected to self.hole_fill_seed
        will be set to 0. This action will never completely delete label from frame,
        since the seed point will always be left unmodified. Used to clean up messy
        annotations, especially those with only a few pixels elsewhere in the frame,
        or to quickly clean up thresholding results.

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being trimmed
            self.hole_fill_seed is starting point to determine parts of label that
                will remain unmodified
        '''
        # use frame where label was selected, not current frame
        frame = self.mode.frame
        # label to be trimmed
        label = self.mode.label
        # image to modify
        img_ann = self.annotated[frame,:,:,self.feature]

        # boolean array of all pixels of label that are connected to self.hole_fill_seed
        contig_cell = flood(image = img_ann, seed_point = self.hole_fill_seed)

        # any pixels in img_ann that have value 'label' and are NOT connected to hole_fill_seed
        # get changed to 0, all other pixels retain their original value
        img_trimmed = np.where(np.logical_and(np.invert(contig_cell), img_ann == label), 0, img_ann)

        # update annotation with trimmed image
        self.annotated[frame,:,:,self.feature] = img_trimmed

        # reset hole fill seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_predict_single(self):
        '''
        Uses predict_zstack_cell_ids to predict current frame based on
        previous frame. Does nothing if called on frame 0. Generates cell_info
        from scratch after annotations are updated, as the labels present in the
        modified frame could be drastically different from unmodified frame.
        Useful for finetuning annotations one frame at a time (eg, in a stack
        missing annotations, predicting all frames at once would not work particularly
        well, so adding in labels to a frame, then predicting based on previous frame
        with this action would be a better workflow).

        Uses:
            self.annotated, self.feature, self.current_frame to get frame to modify and
                frame to predict from (if current_frame not 0)
            self.create_cell_info to generate cell_info from scratch based on updated annotations
        '''
        # check if we are on first frame
        current_slice = self.current_frame
        # if not on the first frame, we can predict from previous frame
        if current_slice > 0:
            prev_slice = current_slice - 1
            # get image to predict from
            img = self.annotated[prev_slice,:,:,self.feature]
            # image that will be relabeled based on prev
            next_img = self.annotated[current_slice,:,:,self.feature]
            # relabel based on prediction
            updated_slice = predict_zstack_cell_ids(img, next_img)
            # update annotation with relabeled image
            self.annotated[current_slice,:,:,self.feature] = updated_slice

        #update cell_info
        self.create_cell_info(feature = self.feature)
        self.update_image = True

    def action_predict_zstack(self):
        '''
        Uses predict_zstack_cell_ids to iteratively relabel all frames of
        annotation based on previous frame (predicts which annotations are
        different slices of the same cell). Works best if relabel_frame is
        used first on frame 0 so that labels in annotation start from 1.
        Useful for generating 3D labeled data from stacks of 2D annotations.
        Note: will not predict divisions in timelapse data, or distinguish
        between nearby cells in z if they are not separated by at least one slice;
        human judgments are still required in these cases.

        Uses:
            self.annotated, self.feature to get stack of annotations to predict
            self.create_cell_info to generate cell_info from scratch, since
                labels in most frames have likely changed
        '''
        # predict all frames of annotation sequentially
        for zslice in range(self.annotated.shape[0] -1):
            # image to predict from
            img = self.annotated[zslice,:,:,self.feature]
            # image that will be relabeled based on prev
            next_img = self.annotated[zslice + 1,:,:,self.feature]
            # relabel based on prediction
            predicted_next = predict_zstack_cell_ids(img, next_img)
            # update annotation with relabeled image
            # in next iteration, the relabeled image will be used to predict from
            self.annotated[zslice + 1,:,:,self.feature] = predicted_next

        #remake cell_info dict based on new annotations
        self.create_cell_info(feature = self.feature)
        self.update_image = True

    def action_relabel_frame(self):
        '''
        Relabel annotations in the current frame starting from 1. Warning:
        do not use for data that is labeled across frames/slices, as this
        will render 3D label relationships meaningless. If 3D relabeling is
        necessary, use action_relabel_preserve.

        Uses:
            self.annotated, self.current_frame, self.feature to get image to relabel
            self.create_cell_info to update cell_info
        '''
        # frame to relabel
        img = self.annotated[self.current_frame,:,:,self.feature]
        # relabel frame
        relabeled_img = relabel_frame(img)
        # update annotation with modified image
        self.annotated[self.current_frame,:,:,self.feature] = relabeled_img

        # remake cell_info dict based on new annotations
        self.create_cell_info(feature=self.feature)
        self.update_image = True

    def action_relabel_unique(self):
        '''
        Relabels all annotations in every frame with a unique label (eg, no
        label is used in more than one frame). Like relabel_all, scrambles 3D
        relationship info if it exists! Could be useful in cases where a lot
        of manual assignment is needed/existing prediction not very accurate.
        Main benefit of this relabeling strategy is to reduce errors from
        action_replace. Note: this relabeling strategy will usually produce a huge
        colormap, causing similar values to be indistinguishable from each other
        without highlighting. Overall, not recommended for use in most cases.

        Uses:
            self.annotated, self.feature to get annotation stack to relabel
            self.create_cell_info to update cell_info
        '''
        # unique labels start at 1 (first frame)
        start_val = 1
        # relabel each frame in stack
        for frame in range(self.annotated.shape[0]):
            # get annotation to relabel
            img = self.annotated[frame,:,:,self.feature]
            # relabel image, new labels begin with start_val
            relabeled_img = relabel_frame(img, start_val = start_val)
            # update start_val so that no previously used labels are repeated
            start_val = np.max(relabeled_img) + 1
            # update annotation stack with relabeled image
            self.annotated[frame,:,:,self.feature] = relabeled_img

        # remake cell_info dict based on new annotations
        self.create_cell_info(feature = self.feature)
        self.update_image = True

    def action_relabel_all_frames(self):
        '''
        Apply relabel_frame to all frames. Warning: do not use for data that
        is labeled across frames/slices, as this will render 3D label
        relationships meaningless. If 3D relabeling is necessary, use
        action_relabel_preserve. Useful if correcting stacks of unrelated 2D
        annotations.

        Uses:
            self.annotated, self.feature to get annotation stack to relabel
            self.create_cell_info to update cell_info
        '''
        # relabel all frames in stack
        for frame in range(self.annotated.shape[0]):
            # get annotation to relabel
            img = self.annotated[frame,:,:,self.feature]
            # relabel annotation
            relabeled_img = relabel_frame(img)
            # update annotation with relabeled image
            self.annotated[frame,:,:,self.feature] = relabeled_img

        # changes to cell_info not easily changed with helper add/del functions
        self.create_cell_info(feature=self.feature)
        self.update_image = True

    def action_relabel_preserve(self):
        '''
        Using relabel_frame on all frames at once (in 3D) preserves
        the 3D relationships between labels. Use this relabeling function
        if you have tracked or zstack ids to preserve when relabeling. Eg,
        if label 5 is relabeled to label 1, every instance of label 5 in annotation
        stack will be relabeled to label 1.

        Uses:
            self.annotated, self.feature to get annotation stack to relabel
            self.create_cell_info to update cell_info
        '''
        # get annotation stack to relabel
        stack = self.annotated[:,:,:, self.feature]
        # relabel whole stack at once
        relabeled_stack = relabel_frame(stack)
        # update annotations with relabeled stack
        self.annotated[:,:,:, self.feature] = relabeled_stack

        # remake cell_info dict based on new annotations
        self.create_cell_info(feature = self.feature)
        self.update_image = True

    def save(self):
        '''
        Saves the current state of the file in .npz format. Variable names
        in npz are either raw and annotated (if those were original variable
        names), or X and y otherwise (these are commonly used in deepcell library).
        "_save_version_{number}" is part of saved filename to prevent overwriting
        files, and to track changes over time if needed.

        Uses:
            self.filename and self.save_version to name file appropriately
            self.save_vars_mode to choose variable names to save arrays to in npz format
            self.raw and self.annotated are arrays to save in npz (self.raw should always
                remain unmodified, but self.annotated may be modified)
        '''
        # create filename to save as
        save_file = self.filename + "_save_version_{}.npz".format(self.save_version)
        # if file was opened with variable names raw and annotated, save them that way
        if self.save_vars_mode == 0:
            np.savez(save_file, raw = self.raw, annotated = self.annotated)
        # otherwise, save as X and y
        else:
            np.savez(save_file, X = self.raw, y = self.annotated)
        # keep track of which version of the file this is
        self.save_version += 1

    def add_cell_info(self, feature, add_label, frame):
        '''
        Helper function that updates necessary information (cell_ids and cell_info)
        when a new label is added to a frame. If the label exists elsewhere in the
        feature, the new frame is added to the list of frames in the 'frames' entry.
        Any duplicate frames are removed from the list of frames, so accidentally adding
        in a label when it already exists in the frame will not cause bugs.
        If the label does not exist in the feature yet, an entry in cell_info is added
        for that label, and the label is added to cell_ids. Label 0 (the background) is
        never added to cell_ids or cell_info.

        Inputs:
            feature: which feature is being accessed/modified (update appropriate part of
                cell_ids and cell_info)
            add_label: the label being updated
            frame: the frame number that the label is being added to (ie, the frame number
                being added to the frame information for that label's entry in cell_info)

        Uses:
            self.cell_info to update a label's entry or add a new label entry
            self.cell_ids to add a new label to the feature, if needed
            display_format_frames to create slices entry from frames list
        '''
        # this function should never be called on label 0, but just in case
        if add_label != 0:
            # if cell already exists elsewhere in npz:
            try:
                # get list of frames from cell info
                old_frames = self.cell_info[feature][add_label]['frames']
                # add new frame to list
                updated_frames = np.append(old_frames, frame)
                # making frames unique prevents weird behavior in case duplicate frame added
                # convert to list, keeping it as numpy array causes problems
                updated_frames = np.unique(updated_frames).tolist()
                # update cell_info with the modified list of frames
                self.cell_info[feature][add_label].update({'frames': updated_frames})
                # update slices (the frame info that is displayed)
                updated_slices = display_format_frames(updated_frames)
                self.cell_info[feature][add_label].update({'slices': updated_slices})

            # cell does not exist anywhere in npz:
            except KeyError:
                # create a new entry in cell_info for the new label
                self.cell_info[feature].update({add_label: {}})
                self.cell_info[feature][add_label].update({'label': str(add_label)})
                self.cell_info[feature][add_label].update({'frames': [frame]})
                new_slice = display_format_frames([frame])
                self.cell_info[feature][add_label].update({'slices': new_slice})

                self.cell_ids[feature] = np.append(self.cell_ids[feature], add_label)

    def del_cell_info(self, feature, del_label, frame):
        '''
        Helper function that updates necessary information (cell_ids and cell_info)
        when a label is completely removed from a frame. If the label exists elsewhere in the
        feature, the the only change in cell_info is the removal of that frame from the label's
        frame list. If the label does not exist in any other frames of that feature, the label's
        entry is deleted from cell_info and the label is removed from cell_ids. Other functions
        should never call del_cell_info on label 0 (the background), but this is checked before
        modifying cell_info to prevent a possible KeyError, as label 0 never has an entry in
        cell_info.

        Inputs:
            feature: which feature is being accessed/modified (update appropriate part of
                cell_ids and cell_info)
            del_label: the label being updated
            frame: the frame number that the label is being deleted from (ie, the frame number
                being deleted from the frame information for that label's entry in cell_info)

        Uses:
            self.cell_info to update a label's entry or delete a label entry
            self.cell_ids to remove a label to the feature, if needed
            display_format_frames to create slices entry from frames list
        '''
        # prevent KeyError by always checking that label is a real label, not background
        if del_label != 0:
            # get the list of frames for del_label from self.cell_info
            old_frames = self.cell_info[feature][del_label]['frames']
            # use numpy to remove frame from the list of frames, then convert back to list type
            updated_frames = np.delete(old_frames, np.where(old_frames == np.int64(frame))).tolist()
            # update self.cell_info with the modified frames list
            self.cell_info[feature][del_label].update({'frames': updated_frames})

            # if that was the last frame, delete the entry for that cell
            if updated_frames == []:
                del self.cell_info[feature][del_label]

                #also remove from list of cell_ids
                ids = self.cell_ids[feature]
                self.cell_ids[feature] = np.delete(ids, np.where(ids == np.int64(del_label)))

            # still entries in frames, update slices (the info that is displayed)
            else:
                updated_slices = display_format_frames(updated_frames)
                self.cell_info[feature][del_label]['slices'] = updated_slices

    def create_cell_info(self, feature):
        '''
        Helper function that creates self.cell_ids and self.cell_info from scratch
        (ie, based on the content of self.annotated), as opposed to updating the
        info after small changes. self.cell_info and self.cell_ids are used to
        store information about each label so that it can be displayed when interacting
        with the file, and to generate appropriate values for variables such as vmax for
        image display, or the value of a new label when adding to the annotation. Info
        about labels is also used to create an empty lineage (no division information)
        when saving into trk format. This helper function is used to generate cell info
        from annotations upon opening the file, and any actions that can drastically change
        the labels in the annotation (eg, relabeling frames).

        Inputs:
            feature: entry of self.cell_ids and self.cell_info to populate with info, based
                on that feature of the annotation array

        Uses:
            self.annotated to get values from (each nonzero value in the array is a label)
            self.cell_ids to update with the unique labels in each feature
            self.cell_info to update with the labels and label entries (eg, frames) in each feature
            display_format_frames to create slices entry from frames list
        '''
        # get annotation stack for feature
        annotated = self.annotated[:,:,:,feature]

        # self.cell_ids[feature] is a list of the unique, nonzero values in annotation
        self.cell_ids[feature] = np.unique(annotated)[np.nonzero(np.unique(annotated))]

        # reset self.cell_info value for key feature
        self.cell_info[feature] = {}
        # each label in the feature needs a key value pair in this dict
        for cell in self.cell_ids[feature]:
            # key is the label value, value is a dictionary of info about the label
            self.cell_info[feature][cell] = {}
            # label is one of the info entries for the label (for display reasons)
            self.cell_info[feature][cell]['label'] = str(cell)
            # frames entry is a list of each frame the label appears in
            self.cell_info[feature][cell]['frames'] = []

            # check each frame of annotation stack for presence of the label
            for frame in range(self.annotated.shape[0]):
                # TODO: would this be faster with numpy functions?
                # if np.any(np.isin(annotated[frame], cell)):
                if cell in annotated[frame,:,:]:
                    # frame gets added to label entry's list of frames
                    # this is ordered and unique because of for loop
                    self.cell_info[feature][cell]['frames'].append(frame)

            # label info also needs 'slices' string for display reasons
            frames = self.cell_info[feature][cell]['frames']
            self.cell_info[feature][cell]['slices'] = display_format_frames(frames)

    def create_lineage(self):
        '''
        Helper function to enable saving npzs in trk format. Trk files
        require a lineage.json file which contains information about each
        label in the file (frames present, parent/daughter info, etc).
        This information is similar to the information in self.cell_info,
        so this function creates a lineage dictionary from self.cell_info
        (populating cell division info with blanks) so that users can easily
        go from npz annotations to trk format to manually add lineage information
        if needed. Note: running the npz through deepcell tracking should generate
        a reasonable lineage, so this option is recommended primarily for cases
        where tracking does particularly poorly, or a manually-assigned ground
        truth is needed.

        Uses:
            self.cell_ids and self.feature to get a list of labels to iterate over
            self.cell_info to get frame information for each label
            self.lineage to store generated lineage
        '''
        # each label needs a lineage entry
        for cell in self.cell_ids[self.feature]:
            # each label's lineage entry is a dict
            self.lineage[str(cell)] = {}
            # key of each label's lineage entry is the label as a string
            cell_info = self.lineage[str(cell)]

            # filling out lineage entry for that label:
            # label is int value of label
            cell_info["label"] = int(cell)
            # daughters is list of daughters
            cell_info["daughters"] = []
            # frame_div is None or value of frame where cell divides
            cell_info["frame_div"] = None
            # parent is None or value of label of parent cell
            cell_info["parent"] = None
            # capped is bool that corresponds to whether cell track ends within movie
            cell_info["capped"] = False
            # frames is list of frames that label appears in: get this from cell_info
            cell_info["frames"] = self.cell_info[self.feature][cell]['frames']

    def save_as_trk(self):
        '''
        Alternative save option intended for timelapse data that needs
        tracking information added. Saves current channel and feature
        along with generated lineage file (no division information) into
        trk format, so that it can subsequently be opened by Caliban's TrackReview
        class. Adapted from TrackReview save function.

        Uses:
            self.create_lineage() to generate updated lineage (no division info)
                from self.cell_info
            self.annotated, self.raw, self.lineage get saved into trk file
            self.filename used as basename for saved file
        '''

        self.create_lineage()

        filename = self.filename + "_c{}_f{}".format(self.channel, self.feature)

        #make sure the image sizes match with what trk opener expects
        trk_raw = np.zeros((self.num_frames, self.height, self.width,1), dtype = self.raw.dtype)
        trk_raw[:,:,:,0] = self.raw[:,:,:,self.channel]
        trk_ann = np.zeros((self.num_frames, self.height, self.width,1), dtype = self.annotated.dtype)
        trk_ann[:,:,:,0] = self.annotated[:,:,:,self.feature]

        with tarfile.open(filename + ".trk", "w") as trks:
            with tempfile.NamedTemporaryFile("w") as lineage_file:
                json.dump(self.lineage, lineage_file, indent=1)
                lineage_file.flush()
                trks.add(lineage_file.name, "lineage.json")

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, trk_raw)
                raw_file.flush()
                trks.add(raw_file.name, "raw.npy")

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, trk_ann)
                tracked_file.flush()
                trks.add(tracked_file.name, "tracked.npy")

class RGBNpz(CalibanWindow):
    channel_list = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow']
    channel_on = [True, True, True, True, True, True]
    channel_names = []

    def __init__(self, filename, raw, annotated, save_vars_mode):
        '''
        Set object attributes to store raw and annotated images (arrays),
        various settings, bind event handlers to pyglet window, and begin
        running application. Uses the filename and the output of load_npz(filename)
        as input.

        Assumes raw array is in format (y, x, c) (c <= 6) and annotated array is
        in format (y, x, f). Arrays can also be in shape (1, y, x, c or f).
        '''
        # store inputs as part of ZStackReview object
        # filename used to save file later
        self.filename = filename

        # used to determine variable names for npz upon saving file
        self.save_vars_mode = save_vars_mode

        # unpack the shape of the raw array
        self.dims = len(raw.shape)
        if self.dims == 3:
            self.raw = raw
            self.annotated = annotated
        elif self.dims == 4:
            self.raw = np.squeeze(raw, axis = 0)
            self.annotated = np.squeeze(annotated, axis = 0)

        self.height, self.width, self.channel_max = self.raw.shape

        # file opens to the first feature (like channel, but of annotation array)
        self.feature = 0
        # how many features contained in self.annotated (assumes particular data format)
        self.feature_max = self.annotated.shape[-1]
        # file opens to the first channel
        self.channel = 0

        if self.channel_max > 6:
            print("Warning! You will not be able to display channels beyond the first 6.")
        for c in range(self.channel_max):
            self.channel_names.append("channel {}".format(c))

        # info dictionaries that will be populated with info about labels for
        # each feature of annotation array
        self.cell_ids = {}
        self.cell_info = {}

        # populate cell_info and cell_ids with info for each feature in annotation
        # analogous to .trk lineage but do not need relationships between cells included
        for feature in range(self.feature_max):
            self.create_cell_info(feature)

        # don't display 'frames' just 'slices' in sidebar (updated on_draw)
        try:
            first_key = list(self.cell_info[0])[0]
            display_info_types = self.cell_info[0][first_key]
            self.display_info = [*sorted(set(display_info_types) - {'frames'})]
        # if there are no labels in the feature, hardcode the display info
        except:
            self.display_info = ['label']

        # open file to first frame of annotation stack
        self.current_frame = 0

        self.show_adjusted_raw = True

        # keeps track of information about adjustment of colormap for viewing annotation labels
        self.adjustment_dict = {}
        for feature in range(self.feature_max):
            self.adjustment_dict[feature] = 0
        # adjustment for initial feature
        self.adjustment = self.adjustment_dict[self.feature]

        self.adjusted_raw = np.zeros(self.raw.shape)
        self.adjustments = np.ones(min(self.channel_max, 6))
        # self.adjustments = np.zeros(min(self.channel_max, 6))
        self.rescale_raw()
        self.reduce_to_RGB()

        # mouse position in coordinates of array being viewed as image, (0,0) is placeholder
        # will be updated on mouse motion
        self.x = 0
        self.y = 0

        # self.mode keeps track of selected labels, pending actions, displaying
        # prompts and confirmation dialogue, using Mode class; start with Mode.none()
        # (nothing selected, no actions pending)
        self.mode = Mode.none()
        # self.mode.update_prompt_additions = self.custom_prompt

        # start with highlighting option turned off and no labels highlighted
        self.highlight = False
        self.highlighted_cell_one = -1
        self.highlighted_cell_two = -1

        self.current_cmap = None

        self.brush = CalibanBrush(self.height, self.width)

        # stores y, x location of mouse click for actions that use skimage flooding
        # self.hole_fill_seed = None

        # how many times the file has been saved since it was opened
        self.save_version = 0

        super().__init__()

        self.draw_raw = False
        self.show_label_outlines = True

        # start pyglet event loop
        pyglet.app.run()

    def helper_update_composite(self):
        pass

    def rescale_95(self, img):
        '''
        Helper function for rescaling an image. Image can be single-
        or multi-channel.
        '''
        percentiles = np.percentile(img[img > 0], [5, 95])
        rescaled_img = rescale_intensity(img,
            in_range=(percentiles[0], percentiles[1]),
            out_range = 'uint8')
        rescaled_img = rescaled_img.astype('uint8')
        return rescaled_img

    def rescale_raw(self):
        '''
        Rescale first 6 raw channels individually and store in memory.
        The rescaled raw array is used subsequently for image display purposes.
        '''
        self.rescaled = np.zeros(self.raw.shape, dtype = 'uint8')
        # this approach allows noise through
        for channel in range(min(6, self.channel_max)):
            if np.sum(self.raw[:,:,channel]) == 0:
                # don't empty channels
                pass
            else:
                self.rescaled[:,:,channel] = self.rescale_95(self.raw[:,:,channel])

    def reduce_to_RGB(self):
        '''
        Go from rescaled raw array with up to 6 channels to an RGB image for display.
        Handles adding in CMY channels as needed, and adjusting each channel if
        viewing adjusted raw. Used to update self.rgb, which is used to display
        raw current frame.
        '''
        # rgb starts as uint16 so it can handle values above 255 without overflow
        self.rgb = np.zeros((self.height, self.width, 3), dtype = 'uint16')

        # what to multiply each channel by
        if self.show_adjusted_raw:
            adjustments = self.adjustments
        else:
            adjustments = np.ones(min(self.channel_max, 6))

        # for each of the channels that we have
        for c in range(min(6, self.channel_max)):

            if self.channel_on[c]:
                # straightforward RGB -> RGB
                if c < 3:
                    self.rgb[:,:,c] = (self.rescaled[:,:,c] * adjustments[c]).astype('uint16')

                # collapse cyan to G and B
                if c == 3:
                    self.rgb[:,:,1] += (self.rescaled[:,:,3] * adjustments[c]).astype('uint16')
                    self.rgb[:,:,2] += (self.rescaled[:,:,3] * adjustments[c]).astype('uint16')

                # collapse magenta to R and B
                if c == 4:
                    self.rgb[:,:,0] += (self.rescaled[:,:,4] * adjustments[c]).astype('uint16')
                    self.rgb[:,:,2] += (self.rescaled[:,:,4] * adjustments[c]).astype('uint16')

                # collapse yellow to R and G
                if c == 5:
                    self.rgb[:,:,0] += (self.rescaled[:,:,5] * adjustments[c]).astype('uint16')
                    self.rgb[:,:,1] += (self.rescaled[:,:,5] * adjustments[c]).astype('uint16')

                # clip values to uint8 range so it can be cast without overflow
                self.rgb[:,:,0:3] = np.clip(self.rgb[:,:,0:3], a_min = 0, a_max = 255)

        self.rgb = self.rgb.astype('uint8')
        self.update_image = True

    def get_raw_current_frame(self):
        return self.rgb

    def draw_raw_frame(self):
        '''
        Displays raw image with any image adjustments and currently selected
        colormap.

        Uses:
            self.get_raw_current_frame (must be provided by child class) to get
                the appropriate slice of raw array data
            self.apply_raw_image_adjustments (provided) and self.current_cmap
                (must be provided by child class) to create an appropriately-adjusted
                RGB array for displaying the data
            self.array_to_img to create a pyglet Image object from the RGB array
            self.draw_pyglet_image to display pyglet Image on screen in correct
                location with scaling
        '''
        y1, y2, x1, x2 = self.visible_region

        raw = self.get_raw_current_frame()[y1:y2, x1:x2]

        self.array_to_img(input_array = raw.astype(np.uint8),
            vmax = None,
            cmap = None,
            output = 'pyglet')

        self.update_image = False

    def draw_ann_frame(self):
        if not self.show_label_outlines:
            super().draw_ann_frame()
        else:
            y1, y2, x1, x2 = self.visible_region

            ann = self.get_ann_current_frame()[y1:y2, x1:x2]
            raw = self.get_raw_current_frame()
            adjusted_raw = rescale_intensity(raw, in_range = 'image', out_range = 'uint8')[y1:y2, x1:x2]
            ann_boundaries = self.generate_ann_boundaries(ann)

            display = adjusted_raw
            display = self.overlay_RGB(display, ann_boundaries)

            if self.highlight:
                highlight_mask = np.where(np.logical_or(ann == self.highlighted_cell_one,
                    ann == self.highlighted_cell_two), 1, 0)
                display = self.apply_transparent_highlight(display, highlight_mask)

            self.array_to_img(input_array = display.astype(np.uint8),
                                    vmax = None, cmap = None, output = 'pyglet')

            self.update_image = False

    def draw_pixel_edit_frame(self):
        '''
        Draws current frame for pixel-editing mode, along with brush preview
        (brush preview can display brush or thresholding). If drawing the image
        with annotations hidden, applies filters/adjustments to raw image and uses
        that, otherwise uses self.composite_view (generated and updated elsewhere)
        to show annotations overlaid on the adjusted raw image. Requires child
        class to have methods for get_max_label and get_raw_current_frame, and
        adjustment attribute.
        '''

        y1, y2, x1, x2 = self.visible_region

        display = self.get_raw_current_frame()[y1:y2, x1:x2]

        if not self.draw_raw:
            ann = self.generate_ann_boundaries(self.get_ann_current_frame()[y1:y2, x1:x2])
            display = self.overlay_RGB(display, ann)

            # add in red outline if currently using conversion brush
            if self.brush.h2 != -1:
                red_mask = np.where(self.get_ann_current_frame()[y1:y2,x1:x2] == self.brush.h2, 1, 0)
                dy1, dy2, dx1, dx2 = get_dirty_rectangle(red_mask)
                if not None in (dy1, dy2, dx1, dx2):
                    red_mask = self.generate_ann_boundaries(red_mask[dy1:dy2, dx1:dx2], color = 'red')
                    display[dy1:dy2, dx1:dx2] = self.overlay_RGB(display[dy1:dy2, dx1:dx2], red_mask)

            if self.highlight:
                if self.brush.conv_val != -1:
                    highlight_val = self.brush.conv_val
                else:
                    highlight_val = self.brush.edit_val

                highlight_mask = np.where(self.get_ann_current_frame()[y1:y2, x1:x2] == highlight_val, 1, 0)
                display = self.apply_transparent_highlight(display, highlight_mask)

        gl.glTexParameteri(gl.GL_TEXTURE_2D,
                           gl.GL_TEXTURE_MAG_FILTER,
                           gl.GL_NEAREST)

        # update the display with appropriate RGB image based on steps above
        self.display = display

        # draw the brush over the display
        self.add_brush_preview()

        self.update_image = False

    def handle_threshold(self):
        '''
        Helper function to do pre- and post-action bookkeeping for thresholding.
        Figures out indices to send to action_threshold_predict, calls action_threshold_predict,
        then resets variables to return to regular pixel-editing brush functionality. Used by
        on_mouse_release.

        Uses:
            self.predict_seed, self.y, self.x to calculate appropriate edges of bounding box
            self.action_threshold_predict to carry out thresholding and annotation update
            self.brush.show and self.mode are reset at end to finish/clear thresholding behavior
        '''
        # check to make sure box is actually a box and not a line
        y1, y2, x1, x2 = self.brush.get_box_coords()
        if y1 != y2 and x1 != x2:
            threshold_prediction = self.action_threshold_predict(y1, y2, x1, x2)

        # clear bounding box and Mode
        self.brush.reset()
        self.mode.clear()

    def handle_draw(self):
        '''
        Carries out brush drawing on annotation in edit mode. Handles both conversion brush
        and normal drawing or erasing. Does not update the composite image so this can be called
        either by mouse_press or mouse_drag.

        brush_val is what the brush is drawing *with*, while editing_val is what the brush is
        drawing *over*. In normal drawing mode, brush_val is whatever the brush is set to, while
        editing_val is the background (0).

        Uses:
            self.mode.kind to determine if drawing normally or using conversion brush
            self.brush.edit_val and self.brush.erase if using normal brush
            self.brush.conv_target and self.brush.conv_val if using conversion brush
            self.annotated, self.current_frame, self.feature to get frame to modify
            self.x and self.y to center brush
            self.brush.size to create skimage.draw.circle with that radius
            self.height and self.width to limit boundaries of brush (skimage.draw.circle)

        '''
        annotated = self.get_ann_current_frame()
        brush_val_in_original = np.any(np.isin(annotated, self.brush.draw_value))
        editing_val_in_original = np.any(np.isin(annotated, self.brush.background))

        annotated_draw = self.brush.draw(annotated)

        # check to see if any labels have been added or removed from frame
        # possible to add new label or delete target label
        brush_val_in_modified = np.any(np.isin(annotated_draw, self.brush.draw_value))
        editing_val_in_modified = np.any(np.isin(annotated_draw, self.brush.background))

        # label deletion
        if editing_val_in_original and not editing_val_in_modified:
            self.del_cell_info(feature = self.feature, del_label = self.brush.background)

        # label addition
        if brush_val_in_modified and not brush_val_in_original:
            self.add_cell_info(feature = self.feature, add_label = self.brush.draw_value)

        self.annotated[:,:,self.feature] = annotated_draw

    def jump_to_channel(self, c):
        if c < self.channel_max:
            self.channel = c

    def toggle_channel_display(self):
        try:
            self.channel_on[self.channel] = not self.channel_on[self.channel]
            self.reduce_to_RGB()
        except:
            pass

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        if self.key_states[key.LCTRL] or self.key_states[key.RCTRL]:
            self.adjust_zoom(scroll_y)
        else:
            if ((self.draw_raw or self.edit_mode or self.show_label_outlines)
                and self.show_adjusted_raw):
                current_adjustment = self.adjustments[self.channel]
                current_adjustment += 0.05 * scroll_y

                # 2x as bright at most, completely dark at min
                current_adjustment = min(2, current_adjustment)
                current_adjustment = max(0, current_adjustment)

                self.adjustments[self.channel] = current_adjustment
                self.reduce_to_RGB()
                self.update_image = True

    def on_key_press(self, symbol, modifiers):

        # always carried out regardless of context
        self.universal_keypress_helper(symbol, modifiers)

        # context: only while in pixel-editing mode
        if self.edit_mode:
            # context: always carried out in pixel-editing mode (eg, image filters)
            self.edit_mode_universal_keypress_helper(symbol, modifiers)
            # context: specific cases
            self.edit_mode_misc_keypress_helper(symbol, modifiers)
            # context: only when another action is not being performed (eg, thresholding)
            if self.mode.kind is None:
                self.edit_mode_none_keypress_helper(symbol, modifiers)

        # context: only while in label-editing mode
        else:
            # unusual context for keybinds
            self.label_mode_misc_keypress_helper(symbol, modifiers)
            # context: no labels selected
            if self.mode.kind is None:
                self.label_mode_none_keypress_helper(symbol, modifiers)
            # context: one label selected
            elif self.mode.kind == "SELECTED":
                self.label_mode_single_keypress_helper(symbol, modifiers)
            # context: two labels selected
            elif self.mode.kind == "MULTIPLE":
                self.label_mode_multiple_keypress_helper(symbol, modifiers)
            # context: responding to question (eg, confirming an action)
            elif self.mode.kind == "QUESTION":
                self.label_mode_question_keypress_helper(symbol, modifiers)

    def universal_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that
        are handled here apply in every situation (no logic checks
        within on_key_press before universal_keypress_helper is called!)
        so *no other commands may share these keybinds.*

        Keybinds:
            z: toggle whether to show labels or not
            v: toggle cursor visibility
            i: invert which channels are displayed
            o: toggle current channel on or off
            escape: clear selection or cancel action
            #1-6: jump to that channel
            minus: zoom out
            equal: zoom in
            pg up: pan up across image (+ctrl to go to top, +shift to move halfway across current screen)
            pg dn: pan down across image (+ctrl to go to top, +shift to move halfway across current screen)
            home: pan left across image (+ctrl to go to top, +shift to move halfway across current screen)
            end: pan right across image (+ctrl to go to top, +shift to move halfway across current screen)
            F11: toggle fullscreen

        '''
        # toggle raw/label display
        if symbol == key.Z:
            self.draw_raw = not self.draw_raw
            self.update_image = True

        # TOGGLE CURSOR VISIBILITY
        # most useful in edit mode, but inconvenient if can't be turned back on elsewhere
        if symbol == key.V:
            self.mouse_visible = not self.mouse_visible
            self.window.set_mouse_visible(self.mouse_visible)

        # TOGGLE HIGHLIGHT
        if symbol == key.H:
            self.highlight = not self.highlight
            self.update_image = True

        elif symbol == key.I:
            self.channel_on = [not c for c in self.channel_on]
            self.reduce_to_RGB()

        elif symbol == key.O:
            self.toggle_channel_display()

        # CLEAR/CANCEL ACTION
        elif symbol == key.ESCAPE:
            # clear highlighted cells
            self.highlighted_cell_one = -1
            self.highlighted_cell_two = -1
            # clear hole fill seed (used in hole fill, trim pixels, flood contiguous)
            self.hole_fill_seed = None
            # reset self.mode (deselects labels, clears actions)
            self.mode.clear()
            # reset from thresholding
            self.brush.reset()
            self.update_image = True

        elif symbol == key._1:
            self.jump_to_channel(0)

        elif symbol == key._2:
            self.jump_to_channel(1)

        elif symbol == key._3:
            self.jump_to_channel(2)

        elif symbol == key._4:
            self.jump_to_channel(3)

        elif symbol == key._5:
            self.jump_to_channel(4)

        elif symbol == key._6:
            self.jump_to_channel(5)

        # CHANGE CHANNELS
        elif symbol == key.C:
            # hold shift to go backward
            if modifiers & key.MOD_SHIFT:
                if self.channel == 0:
                    self.channel = min(self.channel_max - 1, 5)
                else:
                    self.channel -= 1
            # go forward through channels
            else:
                if self.channel + 1 == min(self.channel_max, 6):
                    self.channel = 0
                else:
                    self.channel += 1

        elif symbol == key.MINUS:
            self.adjust_zoom(-1)
        elif symbol == key.EQUAL:
            self.adjust_zoom(1)

        # QUICK PANNING
        elif symbol == key.PAGEUP:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = -(self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = -self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = -self.visible_y_pix*self.scale_factor)
        elif symbol == key.PAGEDOWN:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = 0, dy = (self.visible_y_pix*self.scale_factor)//2)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = 0, dy = self.height*self.zoom*self.scale_factor)
            else:
                self.pan(dx = 0, dy = self.visible_y_pix*self.scale_factor)
        elif symbol == key.HOME:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = (self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = self.visible_x_pix*self.scale_factor, dy = 0)
        elif symbol == key.END:
            if modifiers & key.MOD_SHIFT:
                self.pan(dx = -(self.visible_x_pix*self.scale_factor)//2, dy = 0)
            elif modifiers & key.MOD_CTRL:
                self.pan(dx = -self.width*self.zoom*self.scale_factor, dy = 0)
            else:
                self.pan(dx = - self.visible_x_pix*self.scale_factor, dy = 0)

        elif symbol == key.F11:
            self.window.set_fullscreen(fullscreen = not self.window.fullscreen)
            self.update_image = True

    def edit_mode_universal_keypress_helper(self, symbol, modifiers):
        # TOGGLE ANNOTATION VISIBILITY
        # TODO: will want to change to shift+H in future when adding highlight to edit mode
        # if symbol == key.L:
        #     self.hide_annotations = not self.hide_annotations
        pass

    def edit_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode only when another action
        or prompt is not in use (ie, not in the middle of the color picker
        prompt, thresholding prompt, or conversion brush mode). These keybinds
        include leaving edit mode, changing the value of the normal brush, and
        initiating actions.

        Keybinds:
            e: leave edit mode
            =: increase value of normal brush
            -: decrease value of normal brush
            n: set normal brush to new value (highest label in file + 1)
            x: toggle eraser (only applies to normal brush)
            p: color picker action
            r: start conversion brush
            t: prompt thresholding
        '''
        # LEAVE EDIT MODE
        if symbol == key.E:
            self.edit_mode = False
            self.update_image = True

        # BRUSH VALUE ADJUSTMENT
        # increase brush value, caps at max value + 1
        if symbol == key.BRACKETRIGHT:
            self.brush.increase_edit_val(window = self)
            self.update_image = True
        # decrease brush value, can't decrease past 1
        if symbol == key.BRACKETLEFT:
            self.brush.decrease_edit_val()
            self.update_image = True
        # set brush to unused label
        if symbol == key.N:
            self.brush.set_edit_val(self.get_new_label())
            self.update_image = True

        # TOGGLE ERASER
        if symbol == key.X:
            self.brush.toggle_erase()
            self.update_brush_image = True

        # ACTIONS - COLOR PICKER
        if symbol == key.P:
            self.mode.update("PROMPT", action = "PICK COLOR", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - CONVERSION BRUSH
        if symbol == key.R:
            self.mode.update("PROMPT", action="CONVERSION BRUSH TARGET", **self.mode.info)
            self.brush.disable_drawing()
        # ACTIONS - SAVE FILE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")
        # ACTIONS - THRESHOLD
        if symbol == key.T:
            self.mode.update("PROMPT", action = "DRAW BOX", **self.mode.info)
            self.brush.show = False
            self.brush.disable_drawing()
            self.brush.clear_view()
            self.update_image = True

    def edit_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to pixel-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else.

        Keybinds:
            down key: decrease size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            up key: increase size of brush (applies when normal brush or
                conversion brush is active, but not during thresholding)
            n: set conversion brush value to unused (max label + 1) value;
                analogous to setting normal brush value with this keybind,
                but specifically when picking a label for the conversion brush
                value (note that allowing this option for the conversion brush
                target would be counterproductive)
        '''
        # BRUSH MODIFICATION KEYBINDS
        # (don't want to adjust brush if thresholding; applies to both
        # normal brush and conversion brushes)
        if self.brush.show:
            # BRUSH SIZE ADJUSTMENT
            # decrease brush size
            if symbol == key.DOWN:
                self.brush.decrease_size()
                self.update_brush_image = True
            # increase brush size
            if symbol == key.UP:
                self.brush.increase_size()
                self.update_brush_image = True

        # SET CONVERSION BRUSH VALUE TO UNUSED LABEL
        # TODO: update Mode prompt to reflect that you can do this
        if self.mode.kind == "PROMPT" and self.mode.action == "CONVERSION BRUSH VALUE":
            if symbol == key.N:
                self.brush.set_conv_val(self.get_new_label())
                self.mode.update("DRAW", action = "CONVERSION",
                        conversion_brush_target = self.brush.conv_target,
                        conversion_brush_value = self.brush.conv_val)
                self.update_image = True

        # RESPOND TO SAVE QUESTION
        if self.mode.kind is not None:
            if self.mode.action == "SAVE":
                if symbol == key.SPACE:
                    self.save()
                    self.mode.clear()

    def label_mode_misc_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode in specific contexts;
        unlike other helper functions, which are grouped by context, these
        keybinds have their conditional logic within the helper function,
        since they are not easily grouped with anything else. Since very
        few keybinds are universal to label-editing mode (as opposed to the
        different filter options in pixel-editing mode), "universal" label-mode
        keybinds are also found here.

        Keybinds:
            z: toggle between viewing raw images and annotations ("universal")
            h: toggle highlight ("universal") (note: will eventually become truly
                universal when highlighting is added to pixel-editing mode)
            - and =: highlight cycling, COMING SOON
            shift + up, shift + down: cycle through colormaps, only applies when
                viewing the raw image
        '''
        if self.draw_raw or self.show_label_outlines:
            if symbol == key.M:
                self.show_adjusted_raw = not self.show_adjusted_raw
                self.reduce_to_RGB()
            if self.show_adjusted_raw:
                # reset adjustments
                if symbol == key._0:
                    self.adjustments = np.zeros(self.adjustments.shape)
                    self.reduce_to_RGB()

        if not self.draw_raw:
            if symbol == key.L:
                self.show_label_outlines = not self.show_label_outlines
                self.update_image = True

    def label_mode_none_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if no labels are
        selected and no actions are awaiting confirmation.

        Keybinds:
            c: go forward through channels
            C (shift + c): go backward through channels
            f: go forward through features
            F (shift + f): go backward through features
            =: increment currently-highlighted label by 1
            -: decrement currently-highlighted label by 1
            e: enter pixel-editing mode
            s: prompt saving a copy of the file
            p: predict 3D labels (computer vision, not deep learning)
            r: relabel annotations (different methods available)
        '''
        # CHANGE FEATURES
        if symbol == key.F:
            # hold shift to go backward
            if modifiers & key.MOD_SHIFT:
                if self.feature == 0:
                    self.feature = self.feature_max - 1
                else:
                    self.feature -= 1
            # go forward through channels
            else:
                if self.feature + 1 == self.feature_max:
                    self.feature = 0
                else:
                    self.feature += 1

        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if self.highlighted_cell_one < self.get_max_label():
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            if self.highlight:
                self.update_image = True

        # ENTER EDIT MODE
        if symbol == key.E:
            self.edit_mode = True
            self.update_image = True

        # SAVE
        if symbol == key.S:
            self.mode.update("QUESTION", action="SAVE")

        # RELABEL
        if symbol == key.R:
            self.mode.update("QUESTION", action='RELABEL', **self.mode.info)

    def label_mode_single_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if one label is
        selected and no actions are awaiting confirmation.

        Keybinds:
            ]: increment currently-highlighted label by 1
            [: decrement currently-highlighted label by 1
            c: prompt creation of new label
            f: prompt hole fill
            x: prompt deletion of label in frame
        '''
        # HIGHLIGHT CYCLING
        if symbol == key.BRACKETRIGHT:
            if self.highlighted_cell_one < self.get_max_label():
                self.highlighted_cell_one += 1
            elif self.highlighted_cell_one == self.get_max_label():
                self.highlighted_cell_one = 1
            # deselect label, since highlighting is now decoupled from selection
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        if symbol == key.BRACKETLEFT:
            if self.highlighted_cell_one > 1:
                self.highlighted_cell_one -= 1
            elif self.highlighted_cell_one == 1:
                self.highlighted_cell_one = self.get_max_label()
            # deselect label
            self.mode.clear()
            if self.highlight:
                self.update_image = True

        # HOLE FILL
        if symbol == key.F:
            self.mode.update("PROMPT", action="FILL HOLE", **self.mode.info)

        # DELETE CELL
        if symbol == key.X:
            self.mode.update("QUESTION", action="DELETE", **self.mode.info)

    def label_mode_multiple_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode only if two labels are
        selected and no actions are awaiting confirmation. (Note: the
        two selected labels must be the same label for watershed to work,
        and different labels for replace and swap to work.)

        Keybinds:
            r: prompt replacement of one label with another
            s: prompt swap between two labels
            w: prompt watershed action
        '''
        # REPLACE
        if symbol == key.R:
            self.mode.update("QUESTION", action="REPLACE", **self.mode.info)

        # SWAP
        if symbol == key.S:
            self.mode.update("QUESTION", action="SWAP", **self.mode.info)

        # WATERSHED
        if symbol == key.W:
            self.mode.update("QUESTION", action="WATERSHED", **self.mode.info)

    def label_mode_question_keypress_helper(self, symbol, modifiers):
        '''
        Helper function for keypress handling. The keybinds that are
        handled here apply to label-editing mode when actions are awaiting
        confirmation. Most actions are confirmed with the space key, while
        others have different options mapped to other keys. Keybinds in this
        helper function are grouped by the question they are responding to.

        Keybinds:
            space: carries out action; when action can be applied to single OR
                multiple frames, space carries out the multiple frame option
            s: carries out single-frame version of action where applicable
            t: save npz with empty lineage as trk filetype
            u: relabel annotations in file with "unique" strategy
            p: relabel annotations in file with "preserve" strategy
        '''
        # RESPOND TO SAVE QUESTION
        if self.mode.action == "SAVE":
            if symbol == key.SPACE:
                self.save()
                self.mode.clear()

        # RESPOND TO RELABEL QUESTION
        elif self.mode.action == "RELABEL":
            if symbol == key.SPACE:
                self.action_relabel_frame()
                self.mode.clear()

        # RESPOND TO REPLACE QUESTION
        elif self.mode.action == "REPLACE":
            if symbol == key.SPACE:
                self.action_replace_single()
                self.mode.clear()

        # RESPOND TO SWAP QUESTION
        elif self.mode.action == "SWAP":
            if symbol == key.SPACE:
                self.action_swap_single_frame()
                self.mode.clear()

        # RESPOND TO DELETE QUESTION
        elif self.mode.action == "DELETE":
            if symbol == key.SPACE:
                self.action_delete_mask()
                self.mode.clear()

        # RESPOND TO WATERSHED QUESTION
        elif self.mode.action == "WATERSHED":
            if symbol == key.SPACE:
                self.action_watershed()
                self.mode.clear()

        # RESPOND TO TRIM PIXELS QUESTION
        elif self.mode.action == "TRIM PIXELS":
            if symbol == key.SPACE:
                self.action_trim_pixels()
                self.mode.clear()

        # RESPOND TO FLOOD CELL QUESTION
        elif self.mode.action == "FLOOD CELL":
            if symbol == key.SPACE:
                self.action_flood_contiguous()
                self.mode.clear()

    def get_ann_current_frame(self):
        return self.annotated[:,:,self.feature]

    def get_label(self):
        '''
        Helper function that returns the label currently being hovered over.
        Currently, this helper function just provides a nice little abstraction,
        but this could also help the existing code stay flexible with additional
        data formats.
        '''
        return int(self.annotated[self.y, self.x, self.feature])

    def get_max_label(self):
        '''
        Helper function that returns the highest label in use in currently-viewed
        feature. If feature is empty, returns 0 to prevent other functions from crashing.
        (Replaces use of self.num_cells to keep track of this info, should
        also help with code flexibility.)
        '''
        # check this first, np.max of empty array will crash
        if len(self.cell_ids[self.feature]) == 0:
            max_label = 0
        # if any labels exist in feature, find the max label
        else:
            max_label = int(np.max(self.cell_ids[self.feature]))
        return max_label

    def get_new_label(self):
        '''
        Helper function that returns a new label (doesn't currently exist in
        annotation feature). The new label is the highest label that currently
        exists in the feature, plus 1, which will always be unused. Does not
        ever return labels that have been skipped, although these labels are also
        technically unused.

        Uses:
            self.cell_ids, which is a list of the labels present in file (does not
                contain other information, as cell_info dict does); cell_ids is updated
                when labels are added or removed from features, so this accurately
                represents which labels are currently in use
        '''
        return (self.get_max_label() + 1)

    def create_frame_text(self):
        frame_text = "Channel: {}\n".format(self.channel_names[self.channel])

        if self.feature_max > 1:
            frame_text += "Feature: {}\n".format(self.feature)
        else:
            frame_text += ""

        return frame_text

    def get_colors_in_use(self):
        colors = []
        for c in range(min(self.channel_max, 6)):
            if self.channel_on[c]:
                colors.append(self.channel_list[c])
        return ", ".join(colors)

    def create_cmap_text(self):
        return ""

    def create_disp_image_text(self):
        '''
        Method to create string to tell viewer which viewing mode is in use.
        Default options are raw, labels, and overlay. Used in draw_persistent_info.
        '''
        display_text = "Displayed image: "

        if self.edit_mode:
            if self.hide_annotations:
                currently_viewing = "Raw"
            else:
                currently_viewing = "Overlay"
        else:
            if self.draw_raw:
                currently_viewing = "Raw"
            else:
                if self.show_label_outlines:
                    currently_viewing = "Overlay"
                else:
                    currently_viewing = "Labels"

        display_text += currently_viewing

        return display_text

    def create_filter_text(self):
        '''
        Method to create string to tell viewer which image adjustments are
        currently being applied to the raw image. (Displays in both raw and
        pixel-editing display modes.) Used in draw_persistent_info.
        '''
        if self.show_adjusted_raw:
            adjustment_text = "Current color: {}\n".format(self.channel_list[self.channel])
            adjustment_text += "Colors in use: {}\n".format(self.get_colors_in_use())
            adjustment_text += "Current adjustments:\n{}".format(self.adjustments)
        else:
            adjustment_text = "\n\n"

        filter_text = ("\nShowing adjusted raw - {}".format(on_or_off(self.show_adjusted_raw))
                    + "\n{}".format(adjustment_text))

        return filter_text

    def get_label_info(self, label):
        return self.cell_info[self.feature][label]

    def create_highlight_text(self):
        '''
        Generate text describing current highlighting status. Requires child
        class to have highlighted_cell_one and highlighted_cell_two attributes.
        Added to info on side of screen (via draw_persistent_info).
        '''
        if (not self.highlight) or (self.edit_mode and self.hide_annotations):
            highlight_text = "Highlighting: -\nHighlighted cell(s): None\n"
        else:
            highlight_text = "Highlighting: {}\n".format(on_or_off(self.highlight))
            if not self.edit_mode:
                if self.highlighted_cell_two != -1:
                    labels = "{}, {}".format(self.highlighted_cell_one, self.highlighted_cell_two)
                elif self.highlighted_cell_one != -1:
                    labels = "{}".format(self.highlighted_cell_one)
                else:
                    labels = "None"
            else:
                if self.brush.conv_val != -1:
                    labels = "{}".format(self.brush.conv_val)
                else:
                    labels = "{}".format(self.brush.edit_val)

            highlight_text += "Highlighted cell(s): {}\n".format(labels)

        return highlight_text

    def draw_persistent_info(self):
        '''
        Display information about the frame currently being viewed.
        Always displays information, although brush settings are displayed
        only when in pixel-editing mode. This info is displayed at top of info
        column. Child class must provide create_frame_text method.
        '''
        if self.edit_mode:
            edit_mode = "pixels"
        else:
            edit_mode = "labels"

        if self.edit_mode or self.draw_raw or self.show_label_outlines:
            filter_info = self.create_filter_text()
        else:
            filter_info = "\n\n\n"

        display_filter_info = "Current display settings:"
        display_filter_info += self.create_cmap_text()
        display_filter_info += filter_info

        # TODO: render label in a batch
        # create pyglet label anchored to top of left side
        frame_label = pyglet.text.Label("Currently viewing:\n"
                                        + "{}".format(self.create_frame_text())
                                        + "{}\n".format(self.create_zoom_text())
                                        + "{}\n\n".format(self.create_disp_image_text())
                                        + "{}\n".format(self.create_highlight_text())
                                        + "{}\n\n".format(display_filter_info)
                                        + "Edit mode: {}\n".format(edit_mode)
                                        + self.create_brush_text(),
                                        font_name="monospace",
                                        anchor_x="left", anchor_y="top",
                                        width=self.sidebar_width,
                                        multiline=True,
                                        x=5, y=self.window.height - 5,
                                        color=[255]*4)
        # draw the label
        frame_label.draw()

    def action_replace_single(self):
        '''
        Overwrite all pixels of label_2 with label_1 in whichever frame label_2
        was selected (even if currently viewing a different frame, since label_2
        may not be present in current frame if user has changed frames since selection).
        label_1 does not need to be in the same frame as label_2, although it can be.
        Can be used to correct segmentation in frame (eg, one cell mistakenly segmented
        with two labels) or to correct 3D relationships (same cell has label_1 in first frame
        and label_2 in next frame, but should always be label_1).

        Uses:
            self.mode.label_1 is first label selected (will be used to overwrite)
            self.mode.label_2 is second label selected (will be overwritten)
            self.mode.frame_2 is the frame in which label_2 was selected; this will be
                the only frame modified in this action
            self.feature used to get correct annotation frame
            self.add_cell_info and self.del_cell_info used to update cell info (label_2 will
                always be completely removed from frame by this action, and will always have
                label_1 in frame after action)
        '''
        # label_1 is first label selected, label_2 is second label selected
        # order of selection is important here
        label_1, label_2 = self.mode.label_1, self.mode.label_2

        # replacing a label with itself crashes Caliban, not good
        if label_1 == label_2:
            pass
        # the labels are different
        else:
            # frame to replace label_2 in
            annotated = self.annotated[:,:,self.feature]
            # any instance of label_2 in this frame overwritten with label_1
            annotated[annotated == label_2] = label_1
            # update cell info
            self.add_cell_info(feature = self.feature, add_label = label_1)
            self.del_cell_info(feature = self.feature, del_label = label_2)
            self.update_image = True

    def action_swap_single_frame(self):
        '''
        Swap label_1 and label_2 in just one frame (order of selection
        does not matter). Labels must be selected in same frame for single frame
        swap to work, and will be swapped in the frame where they were selected (not
        current frame, if frame has changed). Does not modify cell_info, since the
        frame will contain label_1 and label_2 before and after swap. Used to correct
        3D relationships when two labels are incorrectly swapped in one or a handful
        of frames. (Faster and more intuitive than the alternative of multiple create +
        replace actions.)

        Uses:
            self.mode.label_1 is first label selected (order not important)
            self.mode.label_2 is second label selected (order not important)
            self.feature used to get correct annotation frame
        '''
        # frame and label selection info stored in self.mode
        label_1 = self.mode.label_1
        label_2 = self.mode.label_2

        # no use in swapping label with itself, or swapping between different frames
        if label_1 != label_2:
            # get the frame in which labels will be swapped
            ann_img = self.annotated[:,:,self.feature]
            # swap
            ann_img = np.where(ann_img == label_1, -1, ann_img)
            ann_img = np.where(ann_img == label_2, label_1, ann_img)
            ann_img = np.where(ann_img == -1, label_2, ann_img)
            # update self.annotated with swapped frame
            self.annotated[:,:,self.feature] = ann_img
            self.update_image = True

    def action_watershed(self):
        '''
        Use watershed transform to split a single label into two labels
        (original label and new label) based on selected seed points.
        Watershed transform is based on raw image current frame and channel.
        The watershed action differs from other multi-click actions in that
        the labels selected must be the same label and should be selected in
        same frame (not explicitly required by action, but you may get strange
        results otherwise). This action will only modify the original label and
        will not overwrite other labels or delete pixels of the original label.
        Watershed results depend on both the underlying image and the clicked
        locations, clean split not guaranteed.

        Uses:
            self.mode.label_1 is the label to get split by watershed
            self.cell_ids to create a new valid label
            self.add_cell_info to add new label to cell_info if it is generated,
                original label will never be completely removed from frame by this action
        '''
        # TODO: add logic checks to make sure label_1 and label_2 are the same,
        # and seed locations are from same frame

        # Pull the label that is being split and find a new valid label
        current_label = self.mode.label_1
        new_label = self.get_new_label()

        # Locally store the frames to work on
        img_raw = self.raw[:,:,self.channel]
        img_ann = self.annotated[:,:,self.feature]

        # Pull the 2 seed locations and store locally
        # define a new seeds labeled img that is the same size as raw/annotation imgs
        seeds_labeled = np.zeros(img_ann.shape)
        # create two seed locations
        seeds_labeled[self.mode.y1_location, self.mode.x1_location]=current_label
        seeds_labeled[self.mode.y2_location, self.mode.x2_location]=new_label

        # define the bounding box to apply the transform on
        # and select appropriate sections of 3 inputs (raw, seeds, annotation mask)
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

        # did watershed effectively create a new label?
        new_pixels = np.count_nonzero(np.logical_and(ws == new_label, img_sub_ann == current_label))
        # if only a few pixels split, dilate them; new label is "brightest"
        # so will expand over other labels and increase area
        if new_pixels < 5:
            ws = dilation(ws, disk(3))

        # ws may only leave a few pixels of old label
        old_pixels = np.count_nonzero(ws == current_label)
        if old_pixels < 5:
            # create dilation image so "dimmer" label is not eroded by "brighter" label
            dilated_ws = dilation(np.where(ws==current_label, ws, 0), disk(3))
            ws = np.where(dilated_ws==current_label, dilated_ws, ws)

        # only update img_sub_ann where ws has changed label from current_label to new_label
        img_sub_ann = np.where(np.logical_and(ws == new_label,img_sub_ann == current_label), ws, img_sub_ann)

        # reintegrate subsection into original mask
        img_ann[minr:maxr, minc:maxc] = img_sub_ann
        self.annotated[:,:,self.feature] = img_ann

        #update cell_info dict only if new label was created with ws
        if np.any(np.isin(self.annotated[:,:,self.feature], new_label)):
            self.add_cell_info(feature=self.feature, add_label=new_label)
            self.update_image = True

    def action_threshold_predict(self, y1, y2, x1, x2):
        '''
        Given user-determined bounding box coordinates, calculates and
        applies thresholding based on raw image to add new label to annotation.
        Does not overwrite existing annotations, so new label will not always
        appear in annotation. If new label is generated via thresholding, the
        annotation and cell_info will be updated.

        Uses:
            y1, y2, x1, x2 are bounding box coordinates finalized in
                on_mouse_release after drawing thresholding box
            self.raw, self.current_frame, self.channel used with bounding box
                coordinates to get region of raw image that will be thresholded
            self.annotated, self.current_frame, self.feature and bounding box
                coordinates to modify the annotation with thresholding results
            self.add_cell_info to update cell_info if a label is added
        '''

        # pull out the selection portion of the raw frame
        predict_area = self.raw[y1:y2, x1:x2, self.channel]

        # triangle threshold picked after trying a few on one dataset
        # may not be the best threshold approach for other datasets!
        # pick two thresholds to use hysteresis thresholding strategy
        try:
            threshold = filters.threshold_triangle(image = predict_area)
        except:
            return
        threshold_stringent = 1.10 * threshold

        # use a unique label for predction
        new_label = self.get_new_label()

        # try to keep stray pixels from appearing with hysteresis approach
        hyst = filters.apply_hysteresis_threshold(image = predict_area,
            low = threshold, high = threshold_stringent)
        # apply new_label to areas of threshold that are True (foreground),
        # 0 for False (background)
        ann_threshold = np.where(hyst, new_label, 0)

        #put prediction in without overwriting
        predict_area = self.annotated[y1:y2, x1:x2, self.feature]
        # only the background region of original annotation gets updated with ann_threshold
        safe_overlay = np.where(predict_area == 0, ann_threshold, predict_area)

        # don't need to update cell_info unless an annotation has been added
        if np.any(np.isin(safe_overlay, new_label)):
            self.add_cell_info(feature=self.feature, add_label=new_label)
            # update annotation with thresholded region
            self.annotated[y1:y2,x1:x2,self.feature] = safe_overlay
            self.update_image = True

    def action_delete_mask(self):
        '''
        Delete selected label from the frame it was selected in.
        Only exists as single-frame action.

        Uses:
            self.mode.label is selected label (to be deleted)
            self.mode.frame is the frame in which the label was selected
            self.del_cell_info to update cell_info appropriately
        '''

        label = self.mode.label

        ann_img = self.annotated[:,:,self.feature]
        ann_img = np.where(ann_img == label, 0, ann_img)

        self.annotated[:,:,self.feature] = ann_img

        self.del_cell_info(feature = self.feature, del_label = label)
        self.update_image = True

    def action_fill_hole(self):
        '''
        Fill a hole (flood connected regions of background) with selected label.
        Does not affect other labels (self.mouse_press_prompt_helper checks value
        of annotation at clicked position before carrying out action). Connectivity
        value of 1 is more restrictive than other flooding actions and prevents hole
        filling from spilling out beyond enclosed empty space in some cases.

        Uses:
            self.mode.label is label to flood background with
            self.hole_fill_seed is determined on click and used to flood area
            self.annotated, self.current_frame, self.feature to get frame to modify
            self.add_cell_info to update cell info if needed
        '''
        # get frame of annotation to modify
        img_ann = self.annotated[:,:,self.feature]
        # create modified image flooded with value at self.hole_fill_seed
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, self.mode.label, connectivity = 1)
        # update annotation with modified image
        self.annotated[:,:,self.feature] = filled_img_ann

        # add info in case current_frame didn't already contain that label
        # (user may change frames between action prompt and click)
        # will not cause error if the label was already in that frame
        self.add_cell_info(feature=self.feature, add_label=self.mode.label)

        # reset hole_fill_seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_flood_contiguous(self):
        '''
        Flood fill a label (not background) with a unique new label;
        alternative to watershed for fixing duplicate label issue (if cells
        are not touching). If there are no other pixels of the old label left
        after flooding, this action has the same effect as single-frame create.
        This action never changes pixels to 0. Uses self.mode.frame (the frame that
        was clicked on) instead of self.current_frame to prevent potential buggy
        behavior (eg, user changes frames before confirming action, and self.hole_fill_seed
        in new frame corresponds to a different label from self.mode.label).

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being flooded with a new value
            self.hole_fill_seed to get starting point for flooding
            self.cell_ids to get unused label to flood with
            self.add_cell_info always needed to add new label to cell_info
            self.del_cell_info sometimes needed to delete old label from frame
        '''
        # old label is definitely in original, check later if in modified
        old_label = self.mode.label
        # label used to flood area
        new_label = self.get_new_label()

        # annotation to modify
        img_ann = self.annotated[:,:,self.feature]

        # flood connected pixels of old_label with new_label, from origin point
        # of self.hole_fill_seed
        filled_img_ann = flood_fill(img_ann, self.hole_fill_seed, new_label)
        # update annotation with modified image
        self.annotated[:,:,self.feature] = filled_img_ann

        # bool, whether any pixels of old_label remain in flooded image
        in_modified = np.any(np.isin(filled_img_ann, old_label))

        # this action will always add new_label to the annotation in this frame
        self.add_cell_info(feature=self.feature, add_label=new_label)

        # check to see if flooding removed old_label from the frame completely
        if not in_modified:
            self.del_cell_info(feature = self.feature, del_label = old_label)

        # reset hole_fill_seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_trim_pixels(self):
        '''
        Trim away any stray (unconnected) pixels of selected label; pixels in
        frame with that label that are not connected to self.hole_fill_seed
        will be set to 0. This action will never completely delete label from frame,
        since the seed point will always be left unmodified. Used to clean up messy
        annotations, especially those with only a few pixels elsewhere in the frame,
        or to quickly clean up thresholding results.

        Uses:
            self.annotated, self.mode.frame, self.feature to get image to modify
            self.mode.label is the label being trimmed
            self.hole_fill_seed is starting point to determine parts of label that
                will remain unmodified
        '''
        # label to be trimmed
        label = self.mode.label
        # image to modify
        img_ann = self.annotated[:,:,self.feature]

        # boolean array of all pixels of label that are connected to self.hole_fill_seed
        contig_cell = flood(image = img_ann, seed_point = self.hole_fill_seed)

        # any pixels in img_ann that have value 'label' and are NOT connected to hole_fill_seed
        # get changed to 0, all other pixels retain their original value
        img_trimmed = np.where(np.logical_and(np.invert(contig_cell), img_ann == label), 0, img_ann)

        # update annotation with trimmed image
        self.annotated[:,:,self.feature] = img_trimmed

        # reset hole fill seed
        self.hole_fill_seed = None
        self.update_image = True

    def action_relabel_frame(self):
        '''
        Relabel annotations in the current frame starting from 1. Warning:
        do not use for data that is labeled across frames/slices, as this
        will render 3D label relationships meaningless. If 3D relabeling is
        necessary, use action_relabel_preserve.

        Uses:
            self.annotated, self.current_frame, self.feature to get image to relabel
            self.create_cell_info to update cell_info
        '''
        # frame to relabel
        img = self.annotated[:,:,self.feature]
        # relabel frame
        relabeled_img = relabel_frame(img)
        # update annotation with modified image
        self.annotated[:,:,self.feature] = relabeled_img

        # remake cell_info dict based on new annotations
        self.create_cell_info(feature=self.feature)
        self.update_image = True

    def add_cell_info(self, feature, add_label):
        '''
        Helper function that updates necessary information (cell_ids and cell_info)
        when a new label is added to a frame. If the label exists elsewhere in the
        feature, the new frame is added to the list of frames in the 'frames' entry.
        Any duplicate frames are removed from the list of frames, so accidentally adding
        in a label when it already exists in the frame will not cause bugs.
        If the label does not exist in the feature yet, an entry in cell_info is added
        for that label, and the label is added to cell_ids. Label 0 (the background) is
        never added to cell_ids or cell_info.

        Inputs:
            feature: which feature is being accessed/modified (update appropriate part of
                cell_ids and cell_info)
            add_label: the label being updated
            frame: the frame number that the label is being added to (ie, the frame number
                being added to the frame information for that label's entry in cell_info)

        Uses:
            self.cell_info to update a label's entry or add a new label entry
            self.cell_ids to add a new label to the feature, if needed
            display_format_frames to create slices entry from frames list
        '''
        # this function should never be called on label 0, but just in case
        if add_label != 0:
            # key is the label value, value is a dictionary of info about the label
            self.cell_info[feature][add_label] = {}
            # label is one of the info entries for the label (for display reasons)
            self.cell_info[feature][add_label]['label'] = str(int(add_label))
            self.cell_ids[feature] = np.unique(np.append(self.cell_ids[feature], add_label))

    def del_cell_info(self, feature, del_label):
        '''
        Helper function that updates necessary information (cell_ids and cell_info)
        when a label is completely removed from a frame. If the label exists elsewhere in the
        feature, the the only change in cell_info is the removal of that frame from the label's
        frame list. If the label does not exist in any other frames of that feature, the label's
        entry is deleted from cell_info and the label is removed from cell_ids. Other functions
        should never call del_cell_info on label 0 (the background), but this is checked before
        modifying cell_info to prevent a possible KeyError, as label 0 never has an entry in
        cell_info.

        Inputs:
            feature: which feature is being accessed/modified (update appropriate part of
                cell_ids and cell_info)
            del_label: the label being updated
            frame: the frame number that the label is being deleted from (ie, the frame number
                being deleted from the frame information for that label's entry in cell_info)

        Uses:
            self.cell_info to update a label's entry or delete a label entry
            self.cell_ids to remove a label to the feature, if needed
            display_format_frames to create slices entry from frames list
        '''
        if del_label != 0:
            del self.cell_info[feature][del_label]
            ids = self.cell_ids[feature]
            self.cell_ids[feature] = np.delete(ids, np.where(ids == np.int64(del_label)))

    def create_cell_info(self, feature):
        '''
        Helper function that creates self.cell_ids and self.cell_info from scratch
        (ie, based on the content of self.annotated), as opposed to updating the
        info after small changes. self.cell_info and self.cell_ids are used to
        store information about each label so that it can be displayed when interacting
        with the file, and to generate appropriate values for variables such as vmax for
        image display, or the value of a new label when adding to the annotation. Info
        about labels is also used to create an empty lineage (no division information)
        when saving into trk format. This helper function is used to generate cell info
        from annotations upon opening the file, and any actions that can drastically change
        the labels in the annotation (eg, relabeling frames).

        Inputs:
            feature: entry of self.cell_ids and self.cell_info to populate with info, based
                on that feature of the annotation array

        Uses:
            self.annotated to get values from (each nonzero value in the array is a label)
            self.cell_ids to update with the unique labels in each feature
            self.cell_info to update with the labels and label entries (eg, frames) in each feature
            display_format_frames to create slices entry from frames list
        '''
        # get annotation stack for feature
        annotated = self.annotated[:,:,feature]

        # self.cell_ids[feature] is a list of the unique, nonzero values in annotation
        self.cell_ids[feature] = np.unique(annotated)[np.nonzero(np.unique(annotated))].astype(int)

        # reset self.cell_info value for key feature
        self.cell_info[feature] = {}
        # each label in the feature needs a key value pair in this dict
        for cell in self.cell_ids[feature]:
            # key is the label value, value is a dictionary of info about the label
            self.cell_info[feature][cell] = {}
            # label is one of the info entries for the label (for display reasons)
            self.cell_info[feature][cell]['label'] = str(int(cell))

    def save(self):
        '''
        Saves the current state of the file in .npz format. Variable names
        in npz are either raw and annotated (if those were original variable
        names), or X and y otherwise (these are commonly used in deepcell library).
        "_save_version_{number}" is part of saved filename to prevent overwriting
        files, and to track changes over time if needed.

        Uses:
            self.filename and self.save_version to name file appropriately
            self.save_vars_mode to choose variable names to save arrays to in npz format
            self.raw and self.annotated are arrays to save in npz (self.raw should always
                remain unmodified, but self.annotated may be modified)
        '''
        # create filename to save as
        save_file = self.filename + "_save_version_{}.npz".format(self.save_version)

        if self.dims == 3:
            raw = self.raw
            ann = self.annotated
        elif self.dims == 4:
            raw = np.expand_dims(self.raw, axis = 0)
            ann = np.expand_dims(self.annotated, axis = 0)

        # if file was opened with variable names raw and annotated, save them that way
        if self.save_vars_mode == 0:
            np.savez(save_file, raw = raw, annotated = ann)
        # otherwise, save as X and y
        else:
            np.savez(save_file, X = raw, y = ann)
        # keep track of which version of the file this is
        self.save_version += 1

def on_or_off(toggle):
    if toggle:
        return "on"
    else:
        return "off"

def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0]+1)

def display_format_frames(frames):
    '''
    Helper function to format list of frames nicely for display in sidebar.
    Uses consecutive to create string from list of frames. Eg,
    [1,2,3,5] becomes "[1-3,5]".
    '''
    display_frames = list(map(list, consecutive(frames)))

    display_frames = '[' + ', '.join(["{}".format(a[0])
                        if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                        for a in display_frames]) + ']'

    return display_frames

def get_dirty_rectangle(input_array):
    nonzero = input_array.nonzero()
    if len(nonzero[0]) > 0 and len(nonzero[1]) > 0:
        dy1 = max(0, np.min(nonzero[0]) - 1)
        dy2 = min(input_array.shape[0], np.max(nonzero[0]) + 2)
        dx1 = max(0, np.min(nonzero[1] - 1))
        dx2 = min(input_array.shape[1], np.max(nonzero[1]) + 2)
    else:
        dy1 = dy2 = dx1 = dx2 = None

    return dy1, dy2, dx1, dx2

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
        #print(i, cell, cell_list[i], relabeled_cell_list[i])
        relabeled_img = np.where(img == cell, relabeled_cell_list[i], relabeled_img)

    return relabeled_img


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
        save_vars_mode = 0
    except:
        try:
            raw_stack = npz['X']
            annotation_stack = npz['y']
            save_vars_mode = 1
        except:
            raw_stack = npz[npz.files[0]]
            annotation_stack = npz[npz.files[1]]
            save_vars_mode = 2
    return {"raw": raw_stack, "annotated": annotation_stack, "save_vars_mode": save_vars_mode}


def review(filename, args):
    filetype = os.path.splitext(filename)[1]
    if filetype == '.trk':
        track_review = TrackReview(str(pathlib.Path(filename).with_suffix('')),
            **load_trk(filename))
    if filetype == '.npz':
        if args.rgb:
            rbg_npz = RGBNpz(str(pathlib.Path(filename).with_suffix('')),
                **load_npz(filename))
        else:
            zstack_review = ZStackReview(str(pathlib.Path(filename).with_suffix('')),
                **load_npz(filename))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("filepath")
    parser.add_argument("-rgb", dest = 'rgb', const = True, default = False, nargs = "?")
    args = parser.parse_args()
    review(args.filepath, args)