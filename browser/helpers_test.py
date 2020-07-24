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


def test_is_trk_file():
    assert helpers.is_trk_file('test.trk')
    assert helpers.is_trk_file('test.trks')
    assert helpers.is_trk_file('test.TrKs')
    assert helpers.is_trk_file('test.TRk')
    assert not helpers.is_trk_file('test.pdf')
    assert not helpers.is_trk_file('test.npz')
    assert not helpers.is_trk_file('this is just a string')
    assert not helpers.is_trk_file(1234)
    assert not helpers.is_trk_file(None)
    assert not helpers.is_trk_file(dict())


def test_is_npz_file():
    assert helpers.is_npz_file('test.npz')
    assert helpers.is_npz_file('test.NpZ')
    assert not helpers.is_npz_file('test.pdf')
    assert not helpers.is_npz_file('test.trk')
    assert not helpers.is_npz_file('this is just a string')
    assert not helpers.is_npz_file(1234)
    assert not helpers.is_npz_file(None)
    assert not helpers.is_npz_file(dict())
