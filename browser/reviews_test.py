"""Test for File classes"""

from copy import deepcopy
import itertools


import pytest
import numpy as np

import reviews


@pytest.fixture()
def zstack_review(zstack_file):
    return reviews.ZStackReview(zstack_file, 'output_bucket')


@pytest.fixture
def track_review(track_file):
    return reviews.TrackReview(track_file, 'output_bucket')


@pytest.fixture(params=[
    pytest.lazy_fixture('zstack_review'),
    pytest.lazy_fixture('track_review')
])
def review(request):
    return request.param


def test_zstack_add_cell_info(zstack_review):
    max_frames = zstack_review.file.max_frames
    cell_ids = zstack_review.file.cell_ids
    cell_info = zstack_review.file.cell_info
    new_label = 999
    assert not zstack_review._y_changed
    assert not zstack_review.info_changed
    for feature in cell_ids:
        assert new_label not in cell_ids[feature]
        zstack_review.action_change_feature(feature)
        # Add new label to first frame
        zstack_review.add_cell_info(new_label, 0)
        assert new_label in cell_ids[feature]
        assert cell_info[feature][new_label] == {'label': str(new_label),
                                                 'frames': [0],
                                                 'slices': ''}
        assert zstack_review._y_changed
        assert zstack_review.info_changed
        # Add new label to all frames (including first frame again)
        for frame in range(max_frames):
            assert new_label in cell_ids[feature]
            zstack_review.add_cell_info(new_label, frame)
            assert cell_info[feature][new_label] == {'label': str(new_label),
                                                     'frames': list(range(frame + 1)),
                                                     'slices': ''}
            assert zstack_review._y_changed
            assert zstack_review.info_changed


def test_track_add_cell_info(track_review):
    max_frames = track_review.file.max_frames
    tracks = track_review.file.tracks
    assert not track_review._y_changed
    assert not track_review.info_changed
    new_label = 999
    # Add new label to first frame
    assert new_label not in tracks
    track_review.add_cell_info(new_label, 0)
    assert new_label in tracks
    assert tracks[new_label] == {
        'label': int(new_label),
        'frames': [0],
        'daughters': [],
        'frame_div': None,
        'parent': None,
        'capped': False,
    }
    assert track_review._y_changed
    assert track_review.info_changed
    # Add new label to all frames (including first frame again)
    for frame in range(max_frames):
        assert new_label in tracks
        track_review.add_cell_info(new_label, frame)
        assert tracks[new_label] == {
            'label': int(new_label),
            'frames': list(range(frame + 1)),
            'daughters': [],
            'frame_div': None,
            'parent': None,
            'capped': False,
        }
        assert track_review._y_changed
        assert track_review.info_changed


def test_del_cell_info(review):
    max_frames = review.file.max_frames
    cell_ids = review.file.cell_ids
    cell_info = review.file.cell_info
    assert not review._y_changed
    assert not review.info_changed
    for feature in cell_ids:
        review.action_change_feature(feature)
        for cell in cell_ids[feature]:
            assert cell in cell_ids[feature]
            assert cell in cell_info[feature]
            # Remove from all frames except last
            for frame in range(max_frames - 1):
                review.del_cell_info(cell, frame)
                assert frame not in cell_info[feature][cell]['frames']
                assert review._y_changed
                assert review.info_changed
            # Remove frm last frame
            assert cell in cell_ids[feature]
            assert cell in cell_info[feature]
            review.del_cell_info(cell, max_frames - 1)
            assert cell not in cell_ids[feature]
            assert cell not in cell_info[feature]
            assert review._y_changed
            assert review.info_changed
        # All cells removed from feature
        np.testing.assert_array_equal(cell_ids[feature], np.array([]))
        assert review.file.cell_info[feature] == {}


def test_action_new_single_cell(review):
    max_frames = review.file.max_frames
    cell_ids = deepcopy(review.file.cell_ids)
    for feature in cell_ids:
        review.action_change_feature(feature)
        for cell in cell_ids[feature]:
            for frame in range(max_frames - 1):
                review.action_new_single_cell(cell, frame)
                new_label = review.get_max_label()
                assert new_label in review.file.annotated[frame, ..., feature]
                assert cell not in review.file.annotated[frame, ..., feature]
            review.action_new_single_cell(cell, max_frames - 1)
            new_label = review.get_max_label()
            assert new_label in review.file.annotated[max_frames - 1]
            assert cell not in review.file.annotated[..., feature]


def test_action_delete_mask(review):
    max_frames = review.file.max_frames
    cell_ids = deepcopy(review.file.cell_ids)
    for feature in cell_ids:
        review.action_change_feature(feature)
        for cell in cell_ids[feature]:
            for frame in range(max_frames - 1):
                review.action_delete_mask(cell, frame)
                assert cell not in review.file.annotated[frame, ..., feature]
            review.action_new_single_cell(cell, max_frames - 1)
            assert cell not in review.file.annotated[..., feature]


def test_action_swap_single_frame(review):
    max_frames = review.file.max_frames
    ann = review.file.annotated
    cell_ids = deepcopy(review.file.cell_ids)
    assert not review._y_changed
    assert not review.info_changed
    for feature in cell_ids:
        review.action_change_feature(feature)
        # All pairs of labels in that feature
        for cell1, cell2 in itertools.product(cell_ids[feature], cell_ids[feature]):
            for frame in range(max_frames):
                cell1_ann = ann[frame, ..., feature] == cell1
                cell2_ann = ann[frame, ..., feature] == cell2
                review.action_swap_single_frame(cell1, cell2, frame)
                np.testing.assert_array_equal(cell1_ann, ann[frame, ..., feature] == cell2)
                np.testing.assert_array_equal(cell2_ann, ann[frame, ..., feature] == cell1)
                assert review._y_changed
                assert review.info_changed

# def test_action_handle_draw(review):

#     for feature in cell_ids:
#         review.action_change_feature(feature)

#     self, trace, target_value, brush_value, brush_size, erase, frame):
#     """Use a "brush" to draw in the brush value along trace locations of
#         the annotated data.
#     """

# def test_action_trim_pixels(review):
#     max_frames = review.file.max_frames
#     ann = review.file.annotated
#     cell_ids = deepcopy(review.file.cell_ids)
#     assert not review._y_changed
#     assert not review.info_changed
#     for feature in cell_ids:
#         review.action_change_feature(feature)
#         for cell in cell_ids[feature]:
#             for frame in range(max_frames):
#                 review.action_trim_pixels(cell, frame, x_location, y_location)

#             (self, label, frame, x_location, y_location)


# def test_action_fill_hole(review):

#     review.action_fill_hole(label, frame, x_location, y_location)

#     pass


# def test_action_flood_contiguous(review):

#     review.action_flood_contiguous(label, frame, x_location, y_location)

# def test_action_watershed(review):

#     review.action_watershed(label, frame, x1_location, y1_location, x2_location, y2_location)

# def test_action_threshold(review):

#     review.action_threshold(y1, x1, y2, x2, frame, label):


# Tests for zstack specific actions

def test_action_new_cell_stack(zstack_review):
    for feature in range(zstack_review.file.feature_max):
        zstack_review.action_change_feature(feature)
        label = zstack_review.get_max_label()
        if label == 0:  # no labels in feature
            continue
        frames = zstack_review.file.cell_info[feature][label]['frames']
        # replace from back to front
        for frame in frames[::-1]:
            new_label = zstack_review.get_max_label() + 1
            zstack_review.action_new_cell_stack(label, frame)
            assert new_label in zstack_review.file.annotated[frame, ..., feature]
            assert label not in zstack_review.file.annotated[frame:, ..., feature]
        # replace only in first frame
        label = zstack_review.get_max_label()
        frames = zstack_review.file.cell_info[feature][label]['frames']
        new_label = label + 1
        zstack_review.action_new_cell_stack(label, frames[0])
        assert label not in zstack_review.file.annotated[..., feature]
        for frame in frames:
            assert new_label in zstack_review.file.annotated[frame, ..., feature]

def test_action_replace_single(zstack_review):
    for feature in range(zstack_review.file.feature_max):
        zstack_review.action_change_feature(feature)
        labels = zstack_review.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            # Front end checks labels are different
            if cell1 == cell2:
                continue
            for frame in range(zstack_review.file.max_frames):
                annotated = zstack_review.file.annotated[frame, ..., feature].copy()
                # Front end checks labels selected in the same frame
                if (cell1 not in annotated or cell2 not in annotated):
                    continue
                assert cell1 in annotated
                assert cell2 in annotated
                zstack_review.action_replace_single(cell1, cell2, frame)
                new_ann = zstack_review.file.annotated[frame, ..., feature]
                assert cell1 in new_ann
                assert cell2 not in new_ann
                assert ((new_ann == cell1) == ((annotated == cell1) | (annotated == cell2))).all()

def test_action_replace(zstack_review):
    for feature in range(zstack_review.file.feature_max):
        zstack_review.action_change_feature(feature)
        labels = zstack_review.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            old_ann = zstack_review.file.annotated[..., feature].copy()
            # Front end checks labels are different
            if cell1 == cell2:
                continue
            zstack_review.action_replace(cell1, cell2)
            ann = zstack_review.file.annotated[..., feature]
            assert cell1 in ann
            assert cell2 not in ann
            assert (ann[old_ann == cell2] == cell1).all()

def test_action_swap_all_frame(zstack_review):
    for feature in range(zstack_review.file.feature_max):
        zstack_review.action_change_feature(feature)
        labels = zstack_review.file.cell_ids[feature]
        for cell1, cell2 in itertools.product(labels, labels):
            old_ann = zstack_review.file.annotated[..., feature].copy()
            old_cell_info = zstack_review.file.cell_info.copy()
            zstack_review.action_swap_all_frame(cell1, cell2)
            ann = zstack_review.file.annotated[..., feature]
            cell_info = zstack_review.file.cell_info
            assert (ann[old_ann == cell1] == cell2).all()
            assert (ann[old_ann == cell2] == cell1).all()
            assert old_cell_info[feature][cell1]['frames'] == cell_info[feature][cell2]['frames']
            assert old_cell_info[feature][cell2]['frames'] == cell_info[feature][cell1]['frames']

# def test_action_predict_single(zstack_review):

#     zstack_review.action_predict_single(frame)

# def test_action_predict_zstack(zstack_review):

#     zstack_review.action_predict_zstack()

# def test_action_save_zstack(zstack_review):

#     zstack_review.action_save_zstack()

# # add_cell_info?
# # del_cell_info?
# # create_cell_info?

# # tests for TrackReview specific actions

# def test_action_new_track(track_review):
#     old_tracks = track_review.tracks.copy()
#     for label in old_tracks:
#         new_label = track_review.get_max_label() + 1
#         # Replacing on first frame has no effect
#         track_review.action_new_track(label, 0)
#         assert new_label not in track_review.tracks
#         assert label in track_review.tracks
#         assert track_review.tracks[label] == old_tracks[label]
#         # Replace on second frame
#         track_review.action_new_track(label, 1)
#         assert new_label in tracks
#         assert 

#     track_review.action_new_track(label, frame)

# def test_action_set_parent(track_review):

#     track_review.action_set_parent(label_1, label_2)

# def test_action_replace(track_review):

#     track_review.action_replace(label_1, label_2)

# def test_action_swap_tracks(track_review):

#     track_review.action_swap_tracks(label_1, label_2)

# def test_action_save_track(track_review):

#     track_review.action_save_track()

# # add_cell_info?
# # del_cell_info?