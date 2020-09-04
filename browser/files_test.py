"""Test for File classes"""

import pytest
import numpy as np

from files import CalibanFile


def test_init(file_):
    raw = file_.raw
    ann = file_.annotated
    assert raw.shape[:-1] == ann.shape[:-1]
    assert raw.shape[-1] == file_.channel_max
    assert ann.shape[-1] == file_.feature_max
    assert raw.shape[0] == file_.max_frames
    assert raw.shape[1] == file_.height
    assert raw.shape[2] == file_.width

    assert len(file_.cell_ids) == file_.feature_max
    assert len(file_.cell_info) == file_.feature_max
    for feature in range(file_.feature_max):
        assert len(file_.cell_ids[feature]) == len(file_.cell_info[feature])


def test_create_cell_info(file_):
    for feature in range(file_.feature_max):
        file_.create_cell_info(feature)
        labels = file_.annotated[..., feature]
        labels_uniq = np.unique(labels[labels != 0])
        assert 0 not in file_.cell_ids[feature]
        for label in labels_uniq:
            assert label in file_.cell_ids[feature]
            assert str(label) == file_.cell_info[feature][label]['label']
            label_in_frame = np.isin(labels, label).any(axis=(1, 2))
            label_frames = file_.cell_info[feature][label]['frames']
            no_label_frames = [i for i in range(file_.max_frames) if i not in label_frames]
            assert label_in_frame[label_frames].all()
            assert not label_in_frame[no_label_frames].any()
