"""Tests for View classes"""
from matplotlib import pyplot as plt
import numpy as np
import pytest

from files import BaseFile
from imgutils import pngify
from views import BaseView


@pytest.fixture
def view(file_):
    return BaseView(file_)


def test_init(view):
    assert len(view.max_intensity) == view.file.channel_max


def test_get_array(view):
    for feature in range(view.file.feature_max):
        for frame in range(view.file.max_frames):
            arr = view.get_array(frame, add_outlines=False)
            assert (arr == view.file.annotated[frame, ..., feature]).all()
            arr_o = view.get_array(frame, add_outlines=True)
            assert (arr_o[arr_o >= 0] == arr[arr_o >= 0]).all()
            assert (arr_o[arr_o < 0] == -arr[arr_o < 0]).all()


def test_get_frame(view):
    for channel in range(view.file.channel_max):
        view.action_change_channel(channel)
        for frame in range(view.file.max_frames):
            raw_frame = view.get_frame(frame, True)
            assert view.current_frame == frame
            expected_raw_frame = pngify(view.file.raw[frame, ..., channel],
                                        vmin=0,
                                        vmax=view.max_intensity[view.channel],
                                        cmap='cubehelix')
            assert expected_raw_frame.getbuffer() == raw_frame.getbuffer()
    for feature in range(view.file.feature_max):
        view.action_change_feature(feature)
        for frame in range(view.file.max_frames):
            ann_frame = view.get_frame(frame, False)
            assert view.current_frame == frame
            expected_ann = np.ma.masked_equal(view.file.annotated[frame, ..., feature], 0)
            expected_ann_frame = pngify(expected_ann,
                                        vmin=0,
                                        vmax=view.get_max_label(),
                                        cmap=view.color_map)
            assert expected_ann_frame.getvalue() == ann_frame.getvalue()


def test_get_max_label(view):
    for feature in range(view.file.feature_max):
        view.action_change_feature(feature)
        max_label = view.get_max_label()
        assert max_label in view.file.annotated[..., feature]
        assert max_label + 1 not in view.file.annotated[..., feature]
        assert max_label == view.file.annotated[..., feature].max()
        if max_label == 0:
            assert (view.file.annotated[..., feature] == 0).all()


def test_action_change_channel(view):
    for channel in range(view.file.channel_max):
        view.action_change_channel(channel)
        assert view.channel == channel
    with pytest.raises(ValueError):
        view.action_change_channel(-1)
    with pytest.raises(ValueError):
        view.action_change_channel(view.file.channel_max)


def test_action_change_feature(view):
    for feature in range(view.file.feature_max):
        view.action_change_feature(feature)
        assert view.feature == feature
    with pytest.raises(ValueError):
        view.action_change_feature(-1)
    with pytest.raises(ValueError):
        view.action_change_feature(view.file.feature_max)
