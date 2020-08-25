"""Test for File classes"""

import pytest
import numpy as np

from files import BaseFile, ZStackFile, TrackFile


def test_empty_file(mocker):
    mocker.patch('files.BaseFile.load', new=load_empty)

    basefile = BaseFile('filename', 'bucket', 'path', 'raw', 'annotated')

    assert not hasattr(basefile, 'cell_ids')
    assert not hasattr(basefile, 'cell_info')
    assert not hasattr(basefile, 'lineages')

    assert basefile.filename == 'filename'
    assert basefile.bucket == 'bucket'
    assert basefile.path == 'path'

    assert basefile.max_frames == 5
    assert basefile.height == 100
    assert basefile.width == 50
    assert basefile.channel_max == 2
    assert basefile.feature_max == 1

    assert basefile.raw.shape == (5, 100, 50, 2)
    assert basefile.annotated.shape == (5, 100, 50, 1)


def test_empty_zstack(mocker):
    mocker.patch('files.ZStackFile.load', new=load_empty)
    zstack = ZStackFile('filename', 'bucket', 'path')

    assert hasattr(zstack, 'cell_ids')
    assert hasattr(zstack, 'cell_info')
    # Only one feature
    assert len(zstack.cell_ids) == 1
    assert len(zstack.cell_info) == 1
    # No annotations
    np.testing.assert_array_equal(zstack.cell_ids[0], np.array([]))
    assert zstack.cell_info[0] == {}
    assert zstack.readable_tracks == zstack.cell_info


def test_one_label_stack(mocker):
    mocker.patch('files.ZStackFile.load', new=load_one_label)
    zstack = ZStackFile('filename', 'bucket', 'path')

    assert hasattr(zstack, 'cell_ids')
    assert hasattr(zstack, 'cell_info')
    # Only one feature
    assert len(zstack.cell_ids) == 1
    assert len(zstack.cell_info) == 1
    # One annotation
    np.testing.assert_array_equal(zstack.cell_ids[0], np.array([1]))
    assert zstack.cell_info[0] == {1: {'label': '1',
                                       'frames': list(range(zstack.max_frames)),
                                       'slices': ''}}


def test_empty_track(mocker):
    def load(self):
        return {'raw': np.zeros((5, 100, 50, 2)),
                'tracked': np.zeros((5, 100, 50, 1)),
                'lineages': [{}]}
    mocker.patch('files.TrackFile.load', new=load)
    track = TrackFile('filename', 'bucket', 'path')

    assert hasattr(track, 'tracks')


def test_multiple_lineages(mocker):
    def load(self):
        return {'raw': np.zeros((5, 100, 50, 2)),
                'tracked': np.zeros((5, 100, 50, 1)),
                'lineages': [{}, {}]}
    mocker.patch('files.TrackFile.load', new=load)
    with pytest.raises(ValueError):
        track = TrackFile('filename', 'bucket', 'path')


def load_empty(self):
    return {'raw': np.zeros((5, 100, 50, 2)), 'annotated': np.zeros((5, 100, 50, 1))}


def load_one_label(self):
    return {'raw': np.zeros((5, 100, 50, 2)), 'annotated': np.ones((5, 100, 50, 1))}
