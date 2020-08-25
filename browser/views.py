"""View classes to view images in Caliban."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import copy

import matplotlib.pyplot as plt
import numpy as np
from skimage.exposure import rescale_intensity
from skimage.segmentation import find_boundaries

from imgutils import pngify


class BaseView(object):  # pylint: disable=useless-object-inheritance
    """
    Base class for viewing a file in Caliban.
    Implements everything but actions on the file.
    """

    def __init__(self, file_):
        self.file = file_

        self.current_frame = 0
        self.scale_factor = 1

        self.color_map = plt.get_cmap('viridis')
        self.color_map.set_bad('black')

        self.feature = 0
        self.channel = 0

        self.max_intensity = {}
        for channel in range(self.file.channel_max):
            self.max_intensity[channel] = None

        self._x_changed = False
        self._y_changed = False
        self.info_changed = False

    def rescale_95(self, img):
        """Rescale a single- or multi-channel image."""
        percentiles = np.percentile(img[img > 0], [5, 95])
        rescaled_img = rescale_intensity(
            img,
            in_range=(percentiles[0], percentiles[1]),
            out_range='uint8')
        rescaled_img = rescaled_img.astype('uint8')
        return rescaled_img

    def add_outlines(self, frame):
        """Indicate label outlines in array with negative values of that label.
        """
        # this is sometimes int 32 but may be uint, convert to
        # int16 to ensure negative numbers and smaller payload than int32
        frame = frame.astype(np.int16)
        boundary_mask = find_boundaries(frame, mode='inner')
        outlined_frame = np.where(boundary_mask == 1, -frame, frame)
        return outlined_frame

    def get_array(self, frame, add_outlines=True):
        frame = self.file.annotated[frame, ..., self.feature]
        if add_outlines:
            frame = self.add_outlines(frame)
        return frame

    def get_frame(self, frame, raw):
        self.current_frame = frame
        if raw:
            frame = self.file.raw[frame, ..., self.channel]
            return pngify(imgarr=frame,
                          vmin=0,
                          vmax=self.max_intensity[self.channel],
                          cmap='cubehelix')
        else:
            frame = self.file.annotated[frame, ..., self.feature]
            frame = np.ma.masked_equal(frame, 0)
            return pngify(imgarr=frame,
                          vmin=0,
                          vmax=self.get_max_label(),
                          cmap=self.color_map)

    def get_max_label(self):
        raise NotImplementedError('get_max_label is not implemented in BaseView')

    def action(self, action_type, info):
        """Call an action method based on an action type."""
        attr_name = 'action_{}'.format(action_type)
        try:
            action = getattr(self, attr_name)
            action(**info)
        except AttributeError:
            raise ValueError('Invalid action "{}"'.format(action_type))

    def action_change_channel(self, channel):
        """Change selected channel."""
        if channel < 0 or channel > self.file.channel_max:
            raise ValueError('Channel {} is outside of range [0, {}].'.format(
                channel, self.file.channel_max))
        self.channel = channel
        self._x_changed = True

    def action_change_feature(self, feature):
        """Change selected feature."""
        if feature < 0 or feature > self.file.feature_max:
            raise ValueError('Feature {} is outside of range [0, {}].'.format(
                feature, self.file.feature_max))
        self.feature = feature
        self._y_changed = True


class ZStackView(BaseView):

    def __init__(self, file_, rgb=False):
        # a call to super(ZStackView, self).__init__ says that the output_bucket argument is missing
        # must be calling BaseReview constructor...
        BaseView.__init__(self, file_)

        self.rgb = rgb

        if self.rgb:
            # possible differences between single channel and rgb displays
            if self.file.raw.ndim == 3:
                self.file.raw = np.expand_dims(self.file.raw, axis=0)
                self.file.annotated = np.expand_dims(self.file.__setattr__annotated, axis=0)

                # reassigning height/width for new shape.
                self.file.max_frames = self.file.raw.shape[0]
                self.file.height = self.file.raw.shape[1]
                self.file.width = self.file.raw.shape[2]

            self.rgb_img = self.reduce_to_RGB()

    @property
    def readable_tracks(self):
        """
        Preprocesses tracks for presentation on browser. For example,
        simplifying track['frames'] into something like [0-29] instead of
        [0,1,2,3,...].
        """
        cell_info = copy.deepcopy(self.file.cell_info)
        for _, feature in cell_info.items():
            for _, label in feature.items():
                slices = list(map(list, consecutive(label['frames'])))
                slices = '[' + ', '.join(["{}".format(a[0])
                                          if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                          for a in slices]) + ']'
                label['slices'] = str(slices)

        return cell_info

    def get_max_label(self):
        """Get the highest label in use in currently-viewed feature.

        If feature is empty, returns 0 to prevent other functions from crashing.
        """
        # check this first, np.max of empty array will crash
        if len(self.file.cell_ids[self.feature]) == 0:
            max_label = 0
        # if any labels exist in feature, find the max label
        else:
            max_label = int(np.max(self.file.cell_ids[self.feature]))
        return max_label

    def get_frame(self, frame, raw):
        self.current_frame = frame
        if (raw and self.rgb):
            return pngify(imgarr=self.rgb_img,
                          vmin=None,
                          vmax=None,
                          cmap=None)
        return super(ZStackView, self).get_frame(frame, raw)

    def reduce_to_RGB(self):
        '''
        Go from rescaled raw array with up to 6 channels to an RGB image for display.
        Handles adding in CMY channels as needed, and adjusting each channel if
        viewing adjusted raw. Used to update self.rgb, which is used to display
        raw current frame.
        '''
        rescaled = self.rescale_raw()
        # rgb starts as uint16 so it can handle values above 255 without overflow
        rgb_img = np.zeros((self.file.height, self.file.width, 3), dtype='uint16')

        # for each of the channels that we have
        for c in range(min(6, self.file.channel_max)):
            # straightforward RGB -> RGB
            new_channel = (rescaled[..., c]).astype('uint16')
            if c < 3:
                rgb_img[..., c] = new_channel
            # collapse cyan to G and B
            if c == 3:
                rgb_img[..., 1] += new_channel
                rgb_img[..., 2] += new_channel
            # collapse magenta to R and B
            if c == 4:
                rgb_img[..., 0] += new_channel
                rgb_img[..., 2] += new_channel
            # collapse yellow to R and G
            if c == 5:
                rgb_img[..., 0] += new_channel
                rgb_img[..., 1] += new_channel

            # clip values to uint8 range so it can be cast without overflow
            rgb_img[..., 0:3] = np.clip(rgb_img[..., 0:3], a_min=0, a_max=255)

        return rgb_img.astype('uint8')

    def rescale_raw(self):
        """Rescale first 6 raw channels individually and store in memory.

        The rescaled raw array is used subsequently for image display purposes.
        """
        rescaled = np.zeros((self.file.height, self.file.width, self.file.channel_max),
                            dtype='uint8')
        # this approach allows noise through
        for channel in range(min(6, self.file.channel_max)):
            raw_channel = self.file.raw[self.current_frame, ..., channel]
            if np.sum(raw_channel) != 0:
                rescaled[..., channel] = self.rescale_95(raw_channel)
        return rescaled


class TrackView(BaseView):

    def get_max_label(self):
        """Get the highest label in the lineage data."""
        return max(self.file.tracks)

    @property
    def readable_tracks(self):
        """
        Preprocesses tracks for presentation on browser. For example,
        simplifying track['frames'] into something like [0-29] instead of
        [0,1,2,3,...].
        """
        tracks = copy.deepcopy(self.file.tracks)
        for _, track in tracks.items():
            frames = list(map(list, consecutive(track["frames"])))
            frames = '[' + ', '.join(["{}".format(a[0])
                                      if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                      for a in frames]) + ']'
            track['frames'] = frames

        return tracks


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0] + 1)