"""Computes label metadata dictionaries from label arrays."""

import numpy as np


class LabelInfoMaker:
    """
    Given a labeled image array with shape (frames, height, width, features),
    generates dictionaries with label metadata.

    The dictionaries are
    cell_ids: key for each feature, values are numpy lists of labels present in that feature
    cell_info: key for each feature, values are dicts
               each feature dict has a key for each label, values are dicts
               each label dict has keys 'label', 'frames', and 'slices'
    """

    def __init__(self, labels):
        self.labels = labels
        self.num_features = labels.shape[-1]
        self.num_frames = labels.shape[0]
        self._cell_info = None

    @property
    def cell_info(self):
        if self._cell_info is None:
            self._cell_info = {}
            for feature in range(self.num_features):
                self.compute_feature_lineage(feature)
        return self._cell_info

    def compute_feature_lineage(self, feature):
        """
        Create tracks dictionary from a labels array.
        Creates placeholders to build a lineage like frame_div, daughters, capped, parent.
        """
        labels = self.labels[..., feature]
        cells = np.unique(labels)[np.nonzero(np.unique(labels))]

        tracks = {}
        for cell in cells:
            cell = int(cell)
            tracks[cell] = {
                'label': cell,
                'frames': [],
                'frame_div': None,
                'daughters': [],
                'capped': False,
                'parent': None,
            }
            for frame in range(labels.shape[0]):
                if cell in labels[frame, ...]:
                    tracks[cell]['frames'].append(frame)

        self._cell_info[feature] = tracks
