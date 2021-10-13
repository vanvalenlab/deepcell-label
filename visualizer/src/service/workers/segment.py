"""Functions to update label arrays"""
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

# Idea: return a semantic label update dict
# keys are label values
# values are boolean OR other label values
# true when label is added for the first time
# false when label is removed
# other value when swapped with a label

from js import console


def edit(context, event):
    console.log(context, event)
    height = context.height
    width = context.width

    img = np.array(event.buffer).reshape((width, height))
    return img

    args = event.args
    action = event.action

    try:
        action_function = getattr(sys.modules[__name__], action)
        return action_function(img, **args)
    except AttributeError:
        raise ValueError('Invalid action "{}"'.format(action))


def identity(img):
    """Returns the buffer unchanged."""
    return img


def zeros(img):
    """Returns a buffer of the same size with all zeroes."""
    # return np.zeroes(img.shape)
    return img


def outline_border(img, label):
    """Returns the buffer with the edges of the image set to the label."""
    return img


def outline(img):
    """Returns the buffer with each object outlined with its negative value."""
    return img


def swap(img, label_1, label_2):
    """
    Swap two labels.

    Args:
        label_1 (int): first label to swap
        label_2 (int): second label to swap
    """
    img = np.where(img == label_1, -1, img)
    img = np.where(img == label_2, label_1, img)
    img = np.where(img == -1, label_2, img)
    return img


def replace(img, label_1, label_2):
    """
    Replaces label_2 with label_1.
    """
    img = np.where(img == label_2, label_1, img)
    return img


# def action_handle_draw(img, trace, foreground, background, brush_size, height, width):
#     """
#     Use a "brush" to draw in the brush value along trace locations of
#     the annotated data.

#     Args:
#         trace (list): list of (x, y) coordinates where the brush has painted
#         foreground (int): label written by the bush
#         background (int): label overwritten by the brush
#         brush_size (int): radius of the brush in pixels
#     """
#     # Only overwrites the background label
#     img_replaced = np.where(img == background, foreground, img)

#     for coordinates in trace:
#         x = coordinates[0]
#         y = coordinates[1]
#         brush_area = circle(y, x, brush_size, (height, width))
#         img[brush_area] = img_replaced[brush_area]
#     return img


# def action_trim_pixels(img, label, x, y):
#     """
#     Remove any pixels with value label that are not connected to the
#     seed point in the given frame.

#     Args:
#         label (int): label to trim
#         x (int): x coordinate of seed
#                  remove label that is not connect to this seed
#         y (int): y coordinate of seed
#     """
#     seed_point = (int(y), int(x))
#     contiguous_label = flood(image=img, seed_point=seed_point)
#     stray_label = np.logical_and(np.invert(contiguous_label), img == label)
#     return np.where(stray_label, 0, img)


# def action_flood(img, label, x, y):
#     """
#     Floods the region at (x, y) with the label.
#     Only floods diagonally connected pixels (connectivity == 2) when label != 0.

#     Args:
#         label (int): label to fill region with
#         x_location (int): x coordinate of region to flood
#         y_location (int): y coordinate of region to flood
#     """
#     seed = (int(y), int(x))
#     current_label = img[seed]

#     # Flood region with label
#     # Smaller connectivity when flooding unlabeled area prevents flooding entire image
#     connectivity = 1 if current_label == 0 else 2
#     return flood_fill(img, seed, label, connectivity=connectivity)


# def action_watershed(raw_img, label_img, label, new_label, x1, y1, x2, y2):
#     """Use watershed to segment different objects"""
#     # Pull the label that is being split and find a new valid label
#     current_label = label
#     new_label = self.project.get_max_label(self.feature) + 1

#     # Pull the 2 seed locations and store locally
#     # define a new seeds labeled img the same size as raw/annotation imgs
#     seeds_labeled = np.zeros(img_ann.shape)

#     # create two seed locations
#     seeds_labeled[int(y1), int(x1)] = current_label

#     seeds_labeled[int(y2), int(x2)] = new_label

#     # define the bounding box to apply the transform on and select
#     # appropriate sections of 3 inputs (raw, seeds, annotation mask)
#     props = regionprops(np.squeeze(np.int32(img_ann == current_label)))
#     minr, minc, maxr, maxc = props[0].bbox

#     # store these subsections to run the watershed on
#     img_sub_raw = np.copy(img_raw[minr:maxr, minc:maxc])
#     img_sub_ann = np.copy(img_ann[minr:maxr, minc:maxc])
#     img_sub_seeds = np.copy(seeds_labeled[minr:maxr, minc:maxc])

#     # contrast adjust the raw image to assist the transform
#     img_sub_raw_scaled = rescale_intensity(img_sub_raw)

#     # apply watershed transform to the subsections
#     ws = watershed(-img_sub_raw_scaled, img_sub_seeds,
#                    mask=img_sub_ann.astype(bool))

#     # did watershed effectively create a new label?
#     new_pixels = np.count_nonzero(np.logical_and(
#         ws == new_label, img_sub_ann == current_label))

#     # if only a few pixels split, dilate them; new label is "brightest"
#     # so will expand over other labels and increase area
#     if new_pixels < 5:
#         ws = dilation(ws, disk(3))

#     # ws may only leave a few pixels of old label
#     old_pixels = np.count_nonzero(ws == current_label)
#     if old_pixels < 5:
#         # create dilation image to prevent "dimmer" label from being eroded
#         # by the "brighter" label
#         dilated_ws = dilation(np.where(ws == current_label, ws, 0), disk(3))
#         ws = np.where(dilated_ws == current_label, dilated_ws, ws)

#     # only update img_sub_ann where ws has changed label
#     # from current_label to new_label
#     idx = np.logical_and(ws == new_label, img_sub_ann == current_label)
#     img_sub_ann = np.where(idx, ws, img_sub_ann)

#     # reintegrate subsection into original mask
#     img_ann[minr:maxr, minc:maxc] = img_sub_ann

#     # update cell_info dict only if new label was created with ws
#     if np.any(np.isin(img_ann, new_label)):
#         self.add_cell_info(add_label=new_label, frame=self.frame_id)

#     self.frame[..., self.feature] = img_ann


# def action_threshold(raw_image, label_image, y1, x1, y2, x2, label):
#     """
#     Threshold the raw image for annotation prediction within the
#     user-determined bounding box.

#     Args:
#         y1 (int): first y coordinate to bound threshold area
#         x1 (int): first x coordinate to bound threshold area
#         y2 (int): second y coordinate to bound threshold area
#         x2 (int): second x coordinate to bound threshold area
#         label (int): label drawn in threshold area
#     """
#     top_edge = min(y1, y2)
#     bottom_edge = max(y1, y2) + 1
#     left_edge = min(x1, x2)
#     right_edge = max(x1, x2) + 1

#     # pull out the selection portion of the raw frame
#     raw_box = raw_image[top_edge:bottom_edge, left_edge:right_edge]

#     # triangle threshold picked after trying a few on one dataset
#     # may not be the best threshold approach for other datasets!
#     # pick two thresholds to use hysteresis thresholding strategy
#     threshold = filters.threshold_triangle(image=raw_box.astype('float64'))
#     threshold_stringent = 1.10 * threshold

#     # try to keep stray pixels from appearing
#     hysteresis = filters.apply_hysteresis_threshold(image=raw_box,
#                                                     low=threshold,
#                                                     high=threshold_stringent)
#     label_threshold = np.where(hysteresis, label, 0)

#     # put prediction in without overwriting
#     label_box = label_image[top_edge:bottom_edge, left_edge:right_edge]
#     safe_overlay = np.where(label_box == 0, label_threshold, label_box)
#     label_image[top_edge:bottom_edge, left_edge:right_edge] = safe_overlay

#     return label_image


# def action_active_contour(label_img, label, min_pixels=20, iterations=100):
#     # get centroid of selected label
#     props = regionprops(np.where(label_img == label, label, 0))[0]

#     # make bounding box size to encompass some background
#     box_height = props['bbox'][2] - props['bbox'][0]
#     y1 = max(0, props['bbox'][0] - box_height // 2)
#     y2 = min(self.project.height, props['bbox'][2] + box_height // 2)

#     box_width = props['bbox'][3] - props['bbox'][1]
#     x1 = max(0, props['bbox'][1] - box_width // 2)
#     x2 = min(self.project.width, props['bbox'][3] + box_width // 2)

#     # relevant region of label image to work on
#     label_img = label_img[y1:y2, x1:x2]

#     # use existing label as initial level set for contour calculations
#     level_set = np.where(label_img == label, 1, 0)

#     # normalize input 2D frame data values to range [0.0, 1.0]
#     adjusted_raw_frame = Normalize()(self.raw_frame[..., self.channel])
#     predict_area = adjusted_raw_frame[y1:y2, x1:x2]

#     # returns 1 where label is predicted to be based on contouring, 0 background
#     contoured = morphological_chan_vese(predict_area, iterations, init_level_set=level_set)

#     # contoured area should get original label value
#     contoured_label = contoured * label
#     # contours tend to fit very tightly, a small expansion here works well
#     contoured_label = dilation(contoured_label, disk(3))

#     # don't want to leave the original (un-contoured) label in the image
#     # never overwrite other labels with new contoured label
#     cond = np.logical_or(label_img == label, label_img == 0)
#     safe_overlay = np.where(cond, contoured_label, label_img)

#     # label must be present in safe_overlay for this to be a valid contour result
#     # very few pixels of contoured label indicate contour prediction not worth keeping
#     pixel_count = np.count_nonzero(safe_overlay == label)
#     if pixel_count < min_pixels:
#         safe_overlay = np.copy(self.frame[y1:y2, x1:x2, self.feature])

#     # put it back in the full image so can use centroid coords for post-contour cleanup
#     full_frame = np.copy(self.frame[..., self.feature])
#     full_frame[y1:y2, x1:x2] = safe_overlay

#     # avoid automated label cleanup if the centroid (flood seed point) is not the right label
#     if full_frame[int(props['centroid'][0]), int(props['centroid'][1])] != label:
#         img_trimmed = full_frame
#     else:
#         # morphology and logic used by pixel-trimming action, with object centroid as seed
#         contig_cell = flood(image=full_frame,
#                             seed_point=(int(props['centroid'][0]), int(props['centroid'][1])))

#         # any pixels in img_ann that have value 'label' and are NOT connected to hole_fill_seed
#         # get changed to 0, all other pixels retain their original value
#         img_trimmed = np.where(np.logical_and(np.invert(contig_cell),
#                                               full_frame == label),
#                                0, full_frame)

#     # update image; cell_info should never change as a result of this
#     self.frame[y1:y2, x1:x2, self.feature] = img_trimmed[y1:y2, x1:x2]
#     self.y_changed = True


# def action_erode(label):
#     """
#     Use morphological erosion to incrementally shrink the selected label.
#     """
#     img_ann = self.frame[..., self.feature]

#     # if label is adjacent to another label, don't let that interfere
#     img_erode = np.where(img_ann == label, label, 0)
#     # erode the label
#     img_erode = erosion(img_erode, square(3))

#     # put the label back in
#     img_ann = np.where(img_ann == label, img_erode, img_ann)

#     in_modified = np.any(np.isin(img_ann, label))
#     if not in_modified:
#         self.del_cell_info(del_label=label, frame=self.frame_id)

#     self.frame[..., self.feature] = img_ann
#     self.y_changed = True


# def action_dilate(label):
#     """
#     Use morphological dilation to incrementally increase the selected label.
#     Does not overwrite bordering labels.
#     """
#     img_ann = self.frame[..., self.feature]

#     img_dilate = np.where(img_ann == label, label, 0)
#     img_dilate = dilation(img_dilate, square(3))

#     img_ann = np.where(np.logical_and(img_dilate == label, img_ann == 0), img_dilate, img_ann)

#     self.frame[..., self.feature] = img_ann
#     self.y_changed = True

class FuncContainer(object):
    pass


py_funcs = FuncContainer()
py_funcs.edit = edit
py_funcs.swap = swap
py_funcs.replace = replace
py_funcs.identity = identity
py_funcs.zeros = zeros
py_funcs.outline_border = outline_border
py_funcs.outline = outline

# pyodide returns last statement as an object that is accessable from javascript
py_funcs
