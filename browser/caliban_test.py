"""Test for File classes"""

from copy import deepcopy
import itertools


import pytest
from matplotlib import pyplot as plt
import numpy as np

import caliban
from imgutils import pngify


@pytest.fixture
def view(file_):
    return caliban.View(file_)


@pytest.fixture()
def zstack_edit(zstack_file):
    return caliban.ZStackEdit(zstack_file, 'output_bucket')


@pytest.fixture
def track_edit(track_file):
    return caliban.TrackEdit(track_file, 'output_bucket')


@pytest.fixture(params=[
    pytest.lazy_fixture('zstack_edit'),
    pytest.lazy_fixture('track_edit')
])
def edit(request):
    return request.param


def test_init(view):
    assert len(view.max_intensity) == view.file.channel_max


def test_get_array(view):
    for feature in range(view.file.feature_max):
        for frame in range(view.file.max_frames):
            arr = view.get_array(frame, add_outlines=False)
            assert (arr == view.annotated[frame, ..., feature]).all()
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
            expected_ann = np.ma.masked_equal(view.annotated[frame, ..., feature], 0)
            expected_ann_frame = pngify(expected_ann,
                                        vmin=0,
                                        vmax=view.get_max_label(),
                                        cmap=view.color_map)
            assert expected_ann_frame.getvalue() == ann_frame.getvalue()


def test_get_max_label(view):
    for feature in range(view.file.feature_max):
        view.action_change_feature(feature)
        max_label = view.get_max_label()
        assert max_label in view.annotated[..., feature]
        assert max_label + 1 not in view.annotated[..., feature]
        assert max_label == view.annotated[..., feature].max()
        if max_label == 0:
            assert (view.annotated[..., feature] == 0).all()


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


def test_zstack_add_cell_info(zstack_edit):
    max_frames = zstack_edit.file.max_frames
    cell_ids = zstack_edit.file.cell_ids
    cell_info = zstack_edit.file.cell_info
    new_label = 999
    assert not zstack_edit._y_changed
    assert not zstack_edit.info_changed
    for feature in cell_ids:
        assert new_label not in cell_ids[feature]
        zstack_edit.action_change_feature(feature)
        # Add new label to first frame
        zstack_edit.add_cell_info(new_label, 0)
        assert new_label in cell_ids[feature]
        assert cell_info[feature][new_label] == {'label': str(new_label),
                                                 'frames': [0],
                                                 'slices': ''}
        assert zstack_edit._y_changed
        assert zstack_edit.info_changed
        # Add new label to all frames (including first frame again)
        for frame in range(max_frames):
            assert new_label in cell_ids[feature]
            zstack_edit.add_cell_info(new_label, frame)
            assert cell_info[feature][new_label] == {'label': str(new_label),
                                                     'frames': list(range(frame + 1)),
                                                     'slices': ''}
            assert zstack_edit._y_changed
            assert zstack_edit.info_changed


def test_track_add_cell_info(track_edit):
    max_frames = track_edit.file.max_frames
    tracks = track_edit.file.tracks
    assert not track_edit._y_changed
    assert not track_edit.info_changed
    new_label = 999
    # Add new label to first frame
    assert new_label not in tracks
    track_edit.add_cell_info(new_label, 0)
    assert new_label in tracks
    assert tracks[new_label] == {
        'label': int(new_label),
        'frames': [0],
        'daughters': [],
        'frame_div': None,
        'parent': None,
        'capped': False,
    }
    assert track_edit._y_changed
    assert track_edit.info_changed
    # Add new label to all frames (including first frame again)
    for frame in range(max_frames):
        assert new_label in tracks
        track_edit.add_cell_info(new_label, frame)
        assert tracks[new_label] == {
            'label': int(new_label),
            'frames': list(range(frame + 1)),
            'daughters': [],
            'frame_div': None,
            'parent': None,
            'capped': False,
        }
        assert track_edit._y_changed
        assert track_edit.info_changed


def test_del_cell_info(edit):
    max_frames = edit.file.max_frames
    cell_ids = edit.file.cell_ids
    cell_info = edit.file.cell_info
    assert not edit._y_changed
    assert not edit.info_changed
    for feature in cell_ids:
        edit.action_change_feature(feature)
        for cell in cell_ids[feature]:
            assert cell in cell_ids[feature]
            assert cell in cell_info[feature]
            # Remove from all frames except last
            for frame in range(max_frames - 1):
                edit.del_cell_info(cell, frame)
                assert frame not in cell_info[feature][cell]['frames']
                assert edit._y_changed
                assert edit.info_changed
            # Remove frm last frame
            assert cell in cell_ids[feature]
            assert cell in cell_info[feature]
            edit.del_cell_info(cell, max_frames - 1)
            assert cell not in cell_ids[feature]
            assert cell not in cell_info[feature]
            assert edit._y_changed
            assert edit.info_changed
        # All cells removed from feature
        np.testing.assert_array_equal(cell_ids[feature], np.array([]))
        assert edit.file.cell_info[feature] == {}


def test_action_new_single_cell(edit):
    max_frames = edit.file.max_frames
    cell_ids = deepcopy(edit.file.cell_ids)
    for feature in cell_ids:
        edit.action_change_feature(feature)
        for cell in cell_ids[feature]:
            for frame in range(max_frames - 1):
                edit.action_new_single_cell(cell, frame)
                new_label = edit.get_max_label()
                assert new_label in edit.annotated[frame, ..., feature]
                assert cell not in edit.annotated[frame, ..., feature]
            edit.action_new_single_cell(cell, max_frames - 1)
            new_label = edit.get_max_label()
            assert new_label in edit.annotated[max_frames - 1]
            assert cell not in edit.annotated[..., feature]


def test_action_delete_mask(edit):
    max_frames = edit.file.max_frames
    cell_ids = deepcopy(edit.file.cell_ids)
    for feature in cell_ids:
        edit.action_change_feature(feature)
        for cell in cell_ids[feature]:
            for frame in range(max_frames - 1):
                edit.action_delete_mask(cell, frame)
                assert cell not in edit.annotated[frame, ..., feature]
            edit.action_new_single_cell(cell, max_frames - 1)
            assert cell not in edit.annotated[..., feature]


def test_action_swap_single_frame(edit):
    max_frames = edit.file.max_frames
    ann = edit.annotated
    cell_ids = deepcopy(edit.file.cell_ids)
    assert not edit._y_changed
    assert not edit.info_changed
    for feature in cell_ids:
        edit.action_change_feature(feature)
        # All pairs of labels in that feature
        for cell1, cell2 in itertools.product(cell_ids[feature], cell_ids[feature]):
            for frame in range(max_frames):
                cell1_ann = ann[frame, ..., feature] == cell1
                cell2_ann = ann[frame, ..., feature] == cell2
                edit.action_swap_single_frame(cell1, cell2, frame)
                np.testing.assert_array_equal(cell1_ann, ann[frame, ..., feature] == cell2)
                np.testing.assert_array_equal(cell2_ann, ann[frame, ..., feature] == cell1)
                assert edit._y_changed
                assert edit.info_changed

# def test_action_handle_draw(edit):

#     for feature in cell_ids:
#         edit.action_change_feature(feature)

#     self, trace, target_value, brush_value, brush_size, erase, frame):
#     """Use a "brush" to draw in the brush value along trace locations of
#         the annotated data.
#     """

# def test_action_trim_pixels(edit):
#     max_frames = edit.file.max_frames
#     ann = edit.annotated
#     cell_ids = deepcopy(edit.file.cell_ids)
#     assert not edit._y_changed
#     assert not edit.info_changed
#     for feature in cell_ids:
#         edit.action_change_feature(feature)
#         for cell in cell_ids[feature]:
#             for frame in range(max_frames):
#                 edit.action_trim_pixels(cell, frame, x_location, y_location)

#             (self, label, frame, x_location, y_location)


# def test_action_fill_hole(edit):

#     edit.action_fill_hole(label, frame, x_location, y_location)

#     pass


# def test_action_flood_contiguous(edit):

#     edit.action_flood_contiguous(label, frame, x_location, y_location)

# def test_action_watershed(edit):

#     edit.action_watershed(label, frame, x1_location, y1_location, x2_location, y2_location)

# def test_action_threshold(edit):

#     edit.action_threshold(y1, x1, y2, x2, frame, label):


# Tests for zstack specific actions

def test_action_new_cell_stack(zstack_edit):
    for feature in range(zstack_edit.file.feature_max):
        zstack_edit.action_change_feature(feature)
        label = zstack_edit.get_max_label()
        if label == 0:  # no labels in feature
            continue
        frames = zstack_edit.file.cell_info[feature][label]['frames']
        # replace from back to front
        for frame in frames[::-1]:
            new_label = zstack_edit.get_max_label() + 1
            zstack_edit.action_new_cell_stack(label, frame)
            assert new_label in zstack_edit.annotated[frame, ..., feature]
            assert label not in zstack_edit.annotated[frame:, ..., feature]
        # replace only in first frame
        label = zstack_edit.get_max_label()
        frames = zstack_edit.file.cell_info[feature][label]['frames']
        new_label = label + 1
        zstack_edit.action_new_cell_stack(label, frames[0])
        assert label not in zstack_edit.annotated[..., feature]
        for frame in frames:
            assert new_label in zstack_edit.annotated[frame, ..., feature]


def test_action_replace_single(zstack_edit):
    for feature in range(zstack_edit.file.feature_max):
        zstack_edit.action_change_feature(feature)
        labels = zstack_edit.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            # Front end checks labels are different
            if cell1 == cell2:
                continue
            for frame in range(zstack_edit.file.max_frames):
                annotated = zstack_edit.annotated[frame, ..., feature].copy()
                # Front end checks labels selected in the same frame
                if (cell1 not in annotated or cell2 not in annotated):
                    continue
                assert cell1 in annotated
                assert cell2 in annotated
                zstack_edit.action_replace_single(cell1, cell2, frame)
                new_ann = zstack_edit.annotated[frame, ..., feature]
                assert cell1 in new_ann
                assert cell2 not in new_ann
                assert ((new_ann == cell1) == ((annotated == cell1) | (annotated == cell2))).all()


def test_action_replace(zstack_edit):
    for feature in range(zstack_edit.file.feature_max):
        zstack_edit.action_change_feature(feature)
        labels = zstack_edit.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            old_ann = zstack_edit.annotated[..., feature].copy()
            # Front end checks labels are different
            if cell1 == cell2:
                continue
            zstack_edit.action_replace(cell1, cell2)
            ann = zstack_edit.annotated[..., feature]
            assert cell1 in ann
            assert cell2 not in ann
            assert (ann[old_ann == cell2] == cell1).all()


def test_action_swap_all_frame(zstack_edit):
    for feature in range(zstack_edit.file.feature_max):
        zstack_edit.action_change_feature(feature)
        labels = zstack_edit.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            old_ann = zstack_edit.annotated[..., feature].copy()
            old_cell_info = zstack_edit.file.cell_info.copy()
            zstack_edit.action_swap_all_frame(cell1, cell2)
            ann = zstack_edit.annotated[..., feature]
            cell_info = zstack_edit.file.cell_info
            assert (ann[old_ann == cell1] == cell2).all()
            assert (ann[old_ann == cell2] == cell1).all()
            assert old_cell_info[feature][cell1]['frames'] == cell_info[feature][cell2]['frames']
            assert old_cell_info[feature][cell2]['frames'] == cell_info[feature][cell1]['frames']
