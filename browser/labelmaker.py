"""Computes label metadata dictionaries from label arrays."""

import numpy as np


class LabelInfoMaker():
    """
    Given a labeled image array with shape (frames, height, width, features),
    generates dictionaries with label metadata.

    The dictionaries are
    cell_ids: key for each feature, values are numpy lists of labels present in that feature
    cell_info: key for each feature, values are dicts
               each feature dict has a key for each label, values are dicts
               each label dict has keys 'label', 'frames', and 'slices'
    """

    def __init__(self, labels, tracking=False):
        self.labels = labels
        self.num_features = labels.shape[-1]
        self.num_frames = labels.shape[0]
        self._cell_ids = None
        self._cell_info = None
        self._tracking = tracking

        if self._tracking and self.num_features != 1:
            raise ValueError('Labels for tracking projects must have one feature.')

    @property
    def cell_ids(self):
        if self._cell_ids is None:
            self.compute_ids()
        return self._cell_ids

    @property
    def cell_info(self):
        if self._cell_info is None:
            if self._tracking:
                self.compute_tracks()
            else:
                self.compute_info()
        return self._cell_info

    def compute_ids(self):
        """
        Make the cell_ids dict.
        """
        self._cell_ids = {}
        for feature in range(self.num_features):
            self.compute_feature_ids(feature)

    def compute_feature_ids(self, feature):
        """
        Make a list of cell IDs present in a given feature.

        Args:
            feature (int): which feature to find IDs
        """
        feature = int(feature)
        # Find the labels in the feature
        feature_labels = self.labels[..., feature]
        feature_cells = np.unique(feature_labels)[np.nonzero(np.unique(feature_labels))]
        self.cell_ids[feature] = feature_cells

    def compute_info(self):
        """
        Make the cell_info dict.
        """
        self._cell_info = {}
        for feature in range(self.num_features):
            self.compute_feature_info(feature)

    def compute_feature_info(self, feature):
        """
        Args:
            feature (int): which feature to recompute label metadata for
        """
        feature = int(feature)
        # Find the labels in the feature
        feature_labels = self.labels[..., feature]
        feature_cells = np.unique(feature_labels)[np.nonzero(np.unique(feature_labels))]
        # Compute the label metadata for the feature
        feature_info = {}
        for cell in feature_cells:
            cell = int(cell)
            feature_info[cell] = {'label': str(cell),
                                  'frames': [],
                                  'slices': ''}
            for frame in range(self.num_frames):
                if cell in feature_labels[frame, ...]:
                    feature_info[cell]['frames'].append(int(frame))
        self.cell_ids[feature] = feature_cells
        self.cell_info[feature] = feature_info

    def compute_tracks(self):
        """
        Create an tracks dictionary from a labels array.
        Includes no relationships, only placeholders to build a lineage,
        like frame_div, daughters, capped, parent.
        """
        assert self.num_features == 1

        cells = np.unique(self.labels)[np.nonzero(np.unique(self.labels))]
        tracks = {}
        for cell in cells:
            cell = int(cell)
            tracks[cell] = {'label': str(cell),
                            'frames': [],
                            'slices': '',
                            'frame_div': None,
                            'daughters': [],
                            'capped': False,
                            'parent': None}
            for frame in range(self.labels.shape[0]):
                if cell in self.labels[frame, ...]:
                    tracks[cell]['frames'].append(int(frame))
        self.cell_ids = {0: cells}
        self.cell_info = {0: tracks}
