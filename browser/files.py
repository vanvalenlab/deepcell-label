"""File classes to store np arrays and metadata for images viewed in Caliban."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import io
import json
import tarfile
import tempfile

import boto3
import numpy as np

from helpers import is_npz_file, is_trk_file
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

class BaseFile(object):  # pylint: disable=useless-object-inheritance
    """Base class for the files viewed in Caliban."""

    def __init__(self, filename, bucket, path, raw_key, annotated_key):
        self.filename = filename
        self.bucket = bucket
        self.path = path

        self.raw_key = raw_key
        self.annotated_key = annotated_key

        self.trial = self.load()
        self.raw = self.trial[raw_key]
        self.annotated = self.trial[annotated_key]

        self.channel_max = self.raw.shape[-1]
        self.feature_max = self.annotated.shape[-1]
        # TODO: is there a potential IndexError here?
        self.max_frames = self.raw.shape[0]
        self.height = self.raw.shape[1]
        self.width = self.raw.shape[2]

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def load(self):
        """Load a file from the S3 input bucket"""
        if is_npz_file(self.filename):
            _load = load_npz
        elif is_trk_file(self.filename):
            _load = load_trks
        else:
            raise ValueError('Cannot load file: {}'.format(self.filename))

        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=self.bucket, Key=self.path)
        return _load(response['Body'].read())


class ZStackFile(BaseFile):
    """
    Class for .npz files for Z-stack images.
    """

    def __init__(self, filename, bucket, path,
                 raw_key='raw', annotated_key='annotated'):
        super(ZStackFile, self).__init__(filename, bucket, path, raw_key, annotated_key)

        # create a dictionary that has frame information about each cell
        # analogous to .trk lineage but do not need relationships between cells included
        self.cell_ids = {}
        self.cell_info = {}

        for feature in range(self.feature_max):
            self.create_cell_info(feature)

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


class TrackFile(BaseFile):
    """
    Class for .trk files for cell tracking.
    """

    def __init__(self, filename, bucket, path,
                 raw_key='raw', annotated_key='tracked'):
        super(TrackFile, self).__init__(filename, bucket, path, raw_key, annotated_key)

        # lineages is a list of dictionaries. There should be only a single one
        # when using a .trk file
        if len(self.trial['lineages']) != 1:
            raise ValueError('Input file has multiple trials/lineages.')

        self.tracks = self.trial['lineages'][0]


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
