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
