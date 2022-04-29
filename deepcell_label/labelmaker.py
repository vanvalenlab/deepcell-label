"""Computes label metadata dictionaries from label arrays."""

import numpy as np


class LabelInfoMaker:
    """
    Given a labeled image array with shape (frames, height, width, features),
    generates dictionaries with label metadata.

    The dictionaries are
    cells: key for each feature, values are dicts
           each feature dict has a key for each cell, values are dicts
           each cell dict has keys 'label' and 'frames'
    """

    def __init__(self, labels):
        self.labels = labels
        self.num_features = labels.shape[-1]
        self.num_frames = labels.shape[0]
        self.compute_cells()

    @property
    def cells(self):
        if self._cells is None:
            self._cells = {}
            for feature in range(self.num_features):
                self.compute_feature_cells(feature)
        return self._cells

    def compute_cells(self):
        """
        Creates cells dictionary from the labels.
        """
        self.cells = {}
        for feature in range(self.num_features):
            self.compute_feature_cells(feature)

    def compute_feature_cells(self, feature):
        """
        Create cells dictionary for one feature of the labels.
        """
        labels = self.labels[..., feature]
        cells = np.unique(labels)[np.nonzero(np.unique(labels))]

        feature_cells = {}
        for cell in cells:
            cell = int(cell)
            feature_cells[cell] = {
                'label': cell,
                'frames': [],
            }
            for frame in range(labels.shape[0]):
                if cell in labels[frame, ...]:
                    feature_cells[cell]['frames'].append(frame)

        self.cells[feature] = feature_cells
