"""Feedback classes for comparing np arrays before and after quality control."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
from matplotlib import pyplot as plt

from views import BaseView
from imgutils import pngify


class Feedback(BaseView):
    """Class to view feedback from quality control on zstack images."""

    # TODO: @tddough98 replace input_file/output_file with worker_file/qc_file
    def __init__(self, input_file, output_file):

        self.input_file = input_file
        self.output_file = output_file

        super(Feedback, self).__init__(input_file)

        self.diff_cmap = plt.get_cmap('Dark2')

    def get_labels(self, frame, file_):
        """Get the labels for the given frame and file."""
        # why does this function only return one label at a time? how are the labels combined?
        self.current_frame = frame
        labels = file_.annotated[frame, ..., self.feature]
        labels = np.ma.masked_equal(labels, 0)
        return pngify(imgarr=labels,
                      vmin=0,
                      vmax=self.get_max_label(),
                      cmap=self.color_map)

    def get_diff(self, frame):
        """Compute the difference in labels between the input and output for the current frame."""
        self.current_frame = frame
        labels = self.input_file.annotated[frame, ..., self.feature]
        labels_qc = self.output_file.annotated[frame, ..., self.feature]

        # Create boolean arrays to show each type of change
        merged = merged_area(labels, labels_qc)
        split = split_area(labels, labels_qc)
        added = added_area(labels, labels_qc)
        deleted = deleted_area(labels, labels_qc)
        grown = grown_area(labels, labels_qc)
        shrunk = shrunk_area(labels, labels_qc)
        converted = converted_area(labels, labels_qc)

        # all_changes = added | deleted | grown | shrunk | converted

        # Combine diff types
        diff = np.zeros(labels.shape)
        diff[converted] = 1
        diff[added] = 2
        diff[deleted] = 3
        diff[merged] = 4
        diff[split] = 5
        diff[grown] = 6
        diff[shrunk] = 7

        # Mask zero values
        diff = np.ma.array(diff, mask=diff == 0)

        return pngify(imgarr=diff,
                      vmin=1,
                      vmax=self.diff_cmap.N,
                      cmap=self.diff_cmap)

    def get_stats(self, frame):
        """
        Returns a dictionary of statistics about changed labels.
        """
        # Get the input and output labelings
        labels = self.input_file.annotated[frame, ..., self.feature]
        labels_qc = self.output_file.annotated[frame, ..., self.feature]

        # Create boolean arrays to show each type of change
        merged = merged_area(labels, labels_qc)
        split = split_area(labels, labels_qc)
        added = added_area(labels, labels_qc)
        deleted = deleted_area(labels, labels_qc)
        grown = grown_area(labels, labels_qc)
        shrunk = shrunk_area(labels, labels_qc)
        converted = converted_area(labels, labels_qc)

        stats = {}

        stats['label_count'], stats['qc_count'] = total_labels(labels, labels_qc)

        return stats


def total_labels(input_labels, output_labels):
    """Returns the number of unique labels in the input and output labelings."""
    # 0 is the absence of a label
    input_uniq = np.unique(input_labels[input_labels != 0])
    output_uniq = np.unique(output_labels[output_labels != 0])
    return input_uniq.shape[0], output_uniq.shape[0]


def merged_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where
    two labels have been combined into one label."""
    # Find where output labels cover deleted labels
    area = deleted_area(input_labels, output_labels) & (output_labels != 0)
    # Merged area covers the entire label, not just the "subsumed" label
    area = np.isin(output_labels, output_labels[area])
    return area


def split_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where one label has been split into two labels."""
    # Find where input labels cover added labels
    area = added_area(input_labels, output_labels) & (input_labels != 0)
    # Split area should include both labels, not just the new label
    area = np.isin(input_labels, input_labels[area])
    return area


def added_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where cells have been added."""
    return ~np.isin(output_labels, input_labels)


def deleted_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where cells have been deleted."""
    return ~np.isin(input_labels, output_labels)


def grown_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where labels have expanded."""
    area = (input_labels == 0) & (output_labels != 0)
    # Remove new labels
    added = added_area(input_labels, output_labels)
    area = area & ~added
    return area


def shrunk_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True where labels have shrunk."""
    area = (input_labels != 0) & (output_labels == 0)
    # Remove deleted labels
    deleted = deleted_area(input_labels, output_labels)
    area = area & ~deleted
    return area


def converted_area(input_labels, output_labels):
    """Returns a boolean numpy array that is True area with converted labels."""
    area = (input_labels != output_labels) & (input_labels != 0) & (output_labels != 0)
    return area


def labels_in_area(labels, area):
    """
    Given a labeling and an boolean array,
    returns a list of the unique labels in the True area.
    """
    return np.unique(labels[area])


def fraction_of_area(area):
    """
    Returns the fraction of the boolean area that is True.
    """
    return area.mean()
