"""Tests for helpers.py"""

import pytest

import helpers


def test_allowed_file(mocker):
    extensions = set(['.png'])
    mocker.patch('helpers.ALLOWED_EXTENSIONS', extensions)

    assert helpers.allowed_file('test.png')
    assert helpers.allowed_file('test.PnG')
    assert not helpers.allowed_file('test.pdf')
    assert not helpers.allowed_file('this is just a string')
    assert not helpers.allowed_file(1234)
    assert not helpers.allowed_file(None)
    assert not helpers.allowed_file(dict())


def test_is_track_file():
    assert helpers.is_track_file('test.trk')
    assert helpers.is_track_file('test.trks')
    assert helpers.is_track_file('test.TrKs')
    assert helpers.is_track_file('test.TRk')
    assert not helpers.is_track_file('test.pdf')
    assert not helpers.is_track_file('test.npz')
    assert not helpers.is_track_file('this is just a string')
    assert not helpers.is_track_file(1234)
    assert not helpers.is_track_file(None)
    assert not helpers.is_track_file(dict())


def test_is_zstack_file():
    assert helpers.is_zstack_file('test.npz')
    assert helpers.is_zstack_file('test.NpZ')
    assert not helpers.is_zstack_file('test.pdf')
    assert not helpers.is_zstack_file('test.trk')
    assert not helpers.is_zstack_file('this is just a string')
    assert not helpers.is_zstack_file(1234)
    assert not helpers.is_zstack_file(None)
    assert not helpers.is_zstack_file(dict())
