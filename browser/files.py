"""File classes to store np arrays and metadata for images viewed in Caliban."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import copy
import io
import json
import tarfile
import tempfile

import boto3
import numpy as np

from helpers import is_npz_file, is_trk_file
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY


class CalibanFile(object):  # pylint: disable=useless-object-inheritance
    """Base class for the files viewed in Caliban."""

    def __init__(self, filename, bucket, path, raw_key=None, annotated_key=None):
        self.filename = filename
        self.bucket = bucket
        self.path = path

        self.raw_key = raw_key if raw_key is not None else 'raw'
        self.annotated_key = annotated_key if annotated_key is not None else get_ann_key(filename)

        trial = self.load()
        self.raw = trial[self.raw_key]
        self.annotated = trial[self.annotated_key]

        self.channel_max = self.raw.shape[-1]
        self.feature_max = self.annotated.shape[-1]
        # TODO: is there a potential IndexError here?
        self.max_frames = self.raw.shape[0]
        self.height = self.raw.shape[1]
        self.width = self.raw.shape[2]

        # possible differences between single channel and rgb displays
        # moved from the rgb block in View Constructor
        if self.raw.ndim == 3:
            self.raw = np.expand_dims(self.raw, axis=0)
            self.annotated = np.expand_dims(self.annotated, axis=0)

            # reassigning height/width for new shape.
            self.max_frames = self.raw.shape[0]
            self.height = self.raw.shape[1]
            self.width = self.raw.shape[2]

        # create a dictionary with frame information about each cell
        # analogous to .trk lineage but doesn't include cells relationships
        self.cell_ids = {}
        self.cell_info = {}
        for feature in range(self.feature_max):
            self.create_cell_info(feature)

        # If we have a track file, overwrite cell_info with lineages to include cell relationships
        if is_trk_file(filename):
            if len(trial['lineages']) != 1:
                raise ValueError('Input file has multiple trials/lineages.')
            self.cell_info = {0: trial['lineages'][0]}  # Track files have only one feature

    @property
    def tracks(self):
        """Alias for .trk for backward compatibility"""
        return self.cell_info[0]

    @property
    def readable_tracks(self):
        """
        Preprocesses tracks for presentation on browser. For example,
        simplifying track['frames'] into something like [0-29] instead of
        [0,1,2,3,...].
        """
        cell_info = copy.deepcopy(self.cell_info)
        for _, feature in cell_info.items():
            for _, label in feature.items():
                slices = list(map(list, consecutive(label['frames'])))
                slices = '[' + ', '.join(["{}".format(a[0])
                                          if len(a) == 1 else "{}-{}".format(a[0], a[-1])
                                          for a in slices]) + ']'
                label['slices'] = str(slices)

        return cell_info

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def load(self):
        """Load a file from the S3 input bucket"""
        _load = get_load(self.filename)
        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=self.bucket, Key=self.path)
        return _load(response['Body'].read())

    def create_cell_info(self, feature):
        """Make or remake the entire cell info dict"""
        feature = int(feature)
        annotated = self.annotated[..., feature]

        self.cell_ids[feature] = np.unique(annotated)[np.nonzero(np.unique(annotated))]

        self.cell_info[feature] = {}

        for cell in self.cell_ids[feature]:
            cell = int(cell)

            self.cell_info[feature][cell] = {}
            self.cell_info[feature][cell]['label'] = str(cell)
            self.cell_info[feature][cell]['frames'] = []

            for frame in range(self.annotated.shape[0]):
                if cell in annotated[frame, ...]:
                    self.cell_info[feature][cell]['frames'].append(int(frame))
            self.cell_info[feature][cell]['slices'] = ''


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0] + 1)


def get_ann_key(filename):
    if is_trk_file(filename):
        return 'tracked'
    return 'annotated'  # 'annotated' is the default key


def get_load(filename):
    if is_npz_file(filename):
        _load = load_npz
    elif is_trk_file(filename):
        _load = load_trks
    else:
        raise ValueError('Cannot load file: {}'.format(filename))
    return _load


def load_npz(filename):

    data = io.BytesIO(filename)
    npz = np.load(data)

    # standard nomenclature for image (X) and annotation (y)
    if 'y' in npz.files:
        raw_stack = npz['X']
        annotation_stack = npz['y']

    # some files may have alternate names 'raw' and 'annotated'
    elif 'raw' in npz.files:
        raw_stack = npz['raw']
        annotation_stack = npz['annotated']

    # if files are named something different, give it a try anyway
    else:
        raw_stack = npz[npz.files[0]]
        annotation_stack = npz[npz.files[1]]

    return {'raw': raw_stack, 'annotated': annotation_stack}


# copied from:
# vanvalenlab/deepcell-tf/blob/master/deepcell/utils/tracking_utils.py3

def load_trks(trkfile):
    """Load a trk/trks file.
    Args:
        trks_file: full path to the file including .trk/.trks
    Returns:
        A dictionary with raw, tracked, and lineage data
    """
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(trkfile)
        with tarfile.open(temp.name, 'r') as trks:

            # numpy can't read these from disk...
            array_file = io.BytesIO()
            array_file.write(trks.extractfile('raw.npy').read())
            array_file.seek(0)
            raw = np.load(array_file)
            array_file.close()

            array_file = io.BytesIO()
            array_file.write(trks.extractfile('tracked.npy').read())
            array_file.seek(0)
            tracked = np.load(array_file)
            array_file.close()

            try:
                trk_data = trks.getmember('lineages.json')
            except KeyError:
                try:
                    trk_data = trks.getmember('lineage.json')
                except KeyError:
                    raise ValueError('Invalid .trk file, no lineage data found.')

            lineages = json.loads(trks.extractfile(trk_data).read().decode())
            lineages = lineages if isinstance(lineages, list) else [lineages]

            # JSON only allows strings as keys, so convert them back to ints
            for i, tracks in enumerate(lineages):
                lineages[i] = {int(k): v for k, v in tracks.items()}

        return {'lineages': lineages, 'raw': raw, 'tracked': tracked}
