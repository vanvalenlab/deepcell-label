"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import copy
import io
import json
import logging
import pickle
import tarfile
import tempfile
import timeit

import boto3
from flask_sqlalchemy import SQLAlchemy
from flask import current_app
from matplotlib import pyplot as plt
import numpy as np
from skimage.exposure import rescale_intensity

from helpers import is_npz_file, is_trk_file
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY


logger = logging.getLogger('models.Project')  # pylint: disable=C0103
db = SQLAlchemy()  # pylint: disable=C0103


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    finished = db.Column(db.TIMESTAMP)

    raw_frames = db.relationship('RawFrame', backref='project')
    label_frames = db.relationship('LabelFrame', backref='project')
    metadata_ = db.relationship('Metadata', backref='project', uselist=False)

    def __init__(self, filename, bucket, path, rgb=False, raw_key=None, annotated_key=None):
        init_start = timeit.default_timer()
        if raw_key is None:
            raw_key = 'raw'
        if annotated_key is None:
            annotated_key = get_ann_key(filename)

        start = timeit.default_timer()
        trial = self.load(filename, bucket, path)
        current_app.logger.debug('Loaded file %s from S3 in %s s.',
                                 filename, timeit.default_timer() - start)
        raw = trial[raw_key]
        annotated = trial[annotated_key]
        # possible differences between single channel and rgb displays
        if raw.ndim == 3:
            raw = np.expand_dims(raw, axis=0)
            annotated = np.expand_dims(annotated, axis=0)

        start = timeit.default_timer()
        # Create metadata
        self.metadata_ = Metadata(self.id, filename, path, raw, annotated, trial)
        current_app.logger.debug('Created metadata for %s in %ss.',
                                 filename, timeit.default_timer() - start)

        # Create frames from raw and labeled images
        start = timeit.default_timer()
        self.raw_frames = [RawFrame(self.id, i, frame) 
                           for i, frame in enumerate(raw)]
        current_app.logger.debug('Created raw frames for %s in %ss.',
            filename, timeit.default_timer() - start)
        self.label_frames = [LabelFrame(self.id, i, frame) 
                             for i, frame in enumerate(annotated)]
        current_app.logger.debug('Created label frames for %s in %ss.',
                                 filename, timeit.default_timer() - start)

        # # Create rgb frames
        # self.rgb = rgb
        # if self.rgb:
        #     self.rgb_frames = [Frame(self.id, i, frame, rgb=True) for i, frame in enumerate(raw)]
        current_app.logger.debug('Total time in __init__ for %s: %s s.',
                                 filename, timeit.default_timer() - init_start)

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def load(self, filename, bucket, path):
        """Load a file from the S3 input bucket"""
        _load = get_load(filename)
        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=bucket, Key=path)
        return _load(response['Body'].read())

    @staticmethod
    def get_project(project_id):
        """Return the project with the given ID, if it exists."""
        start = timeit.default_timer()
        project = Project.query.filter_by(id=project_id).first()
        logger.debug('Got project %s in %ss.',
                     project_id, timeit.default_timer() - start)
        return project

    @staticmethod
    def create_project(filename, bucket, path):
        """Create a new project."""
        start = timeit.default_timer()
        new_project = Project(filename, bucket, path)
        db.session.add(new_project)
        db.session.commit()
        logger.debug('Created new project with ID = "%s" in %ss.',
                     new_project.id, timeit.default_timer() - start)
        return new_project

    @staticmethod
    def finish_project(project):
        """Complete a project and set its frames to null."""
        start = timeit.default_timer()
        project.lastUpdate = project.updatedAt
        project.finished = db.func.current_timestamp()
        project.metadata_.finish()
        # TODO: finish frames
        db.session.commit()  # commit the changes
        logger.debug('Finished project with ID = "%s" in %ss.',
                     project.id, timeit.default_timer() - start)


class Metadata(db.Model):
    """
    Table definition that stores the project metadata.
    Includes both static project info, like filename and data dimensions, and
    label metadata that is updated by actions.
    """
    # pylint: disable=E1101
    __tablename__ = 'metadata'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), 
                           primary_key=True, nullable=False)
    # Project metadata
    filename = db.Column(db.Text, nullable=False)
    subfolders = db.Column(db.Text, nullable=True)
    height = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    numFrames = db.Column(db.Integer, nullable=False)
    numChannels = db.Column(db.Integer, nullable=False)
    numFeatures = db.Column(db.Integer, nullable=False)
    # View metadata
    frame = db.Column(db.Integer, default=0)
    channel = db.Column(db.Integer, default=0)
    feature = db.Column(db.Integer, default=0)
    scale_factor = db.Column(db.Float, default=1)
    color_map = db.Column(db.PickleType, default=plt.get_cmap('viridis').set_bad('black'))
    # Label metadata
    cell_ids = db.Column(db.PickleType)
    cell_info = db.Column(db.PickleType)

    def __init__(self, project_id, filename, subfolders, raw, annotated, trial):
        self.project_id = project_id
        self.filename = filename
        self.subfolders = subfolders
        self.numFrames = raw.shape[0]
        self.height = raw.shape[1]
        self.width = raw.shape[2]
        self.numChannels = raw.shape[-1]
        self.numFeatures = annotated.shape[-1]

        # Label metadata
        # create a dictionary with frame information about each cell
        # analogous to .trk lineage but doesn't include cells relationships
        self.cell_ids = {}
        self.cell_info = {}
        for feature in range(self.numFeatures):
            self.create_cell_info(feature, annotated)

        # Overwrite cell_info with lineages to include cell relationships for .trk files
        if is_trk_file(filename):
            if len(trial['lineages']) != 1:
                raise ValueError('Input file has multiple trials/lineages.')
            self.cell_info = {0: trial['lineages'][0]}

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

    def create_cell_info(self, feature, labels):
        """Make or remake the entire cell info dict"""
        feature = int(feature)
        annotated = labels[..., feature]

        self.cell_ids[feature] = np.unique(annotated)[np.nonzero(np.unique(annotated))]

        self.cell_info[feature] = {}

        for cell in self.cell_ids[feature]:
            cell = int(cell)

            self.cell_info[feature][cell] = {}
            self.cell_info[feature][cell]['label'] = str(cell)
            self.cell_info[feature][cell]['frames'] = []

            for frame in range(annotated.shape[0]):
                if cell in annotated[frame, ...]:
                    self.cell_info[feature][cell]['frames'].append(int(frame))
            self.cell_info[feature][cell]['slices'] = ''

    def get_max_label(self):
        """
        Get the highest label in use in currently-viewed feature.
        If feature is empty, returns 0 to prevent other functions from crashing.

        Returns:
            int: highest label in the current feature
        """
        # check this first, np.max of empty array will crash
        if len(self.cell_ids[self.feature]) == 0:
            max_label = 0
        # if any labels exist in feature, find the max label
        else:
            max_label = int(np.max(self.cell_ids[self.feature]))
        return max_label

    @staticmethod
    def get_metadata(project_id):
        """
        Return the metadata from the given project.

        Args:
            project_id (int): project that the metadata belongs to
        """
        start = timeit.default_timer()
        metadata = Metadata.query.filter_by(project_id=project_id).first()
        logger.debug('Got metadata from project %s in %ss.',
                     project_id, timeit.default_timer() - start)
        return metadata

    @staticmethod
    def create_metadata(project_id, filename, path, raw, annotated, trial):
        """
        Create a metadata row for a project.

        Args:
            project_id (int): project that the frame belongs to
            frame (CalibanMetadata): object with projcet metadata about the file and labels
        """
        start = timeit.default_timer()
        new_metadata = Metadata(project_id, filename, path, raw, annotated, trial)
        db.session.add(new_metadata)
        db.session.commit()
        logger.debug('Created metadata for project %s in %ss.',
                     project_id, timeit.default_timer() - start)
        return new_metadata

    @staticmethod
    def update_metadata(metadata, caliban_metadata):
        """
        Only updates cell_ids and cell_info.
        """
        start = timeit.default_timer()
        metadata.cell_ids = caliban_metadata.cell_ids
        metadata.cell_info = caliban_metadata.cell_ifno
        db.session.commit()
        logger.debug('Updated metadata in project %s in %ss.',
                     metadata.project_id, timeit.default_timer() - start)

    @staticmethod
    def finish_metadata(metadata):
        """Complete a project and set its frames to null."""
        start = timeit.default_timer()
        metadata.cell_ids = None
        metadata.cell_info = None
        db.session.commit()  # commit the changes
        logger.debug('Finished metadata from project %s in %ss.',
                     metadata.project_id, timeit.default_timer() - start)

    def action_change_channel(self, channel):
        """
        Change current channel.

        Args:
            channel (int): which channel to switch to

        Raises:
            ValueError: if channel is not in [0, numChannels)

        Returns:
            bool: whether to redraw X
            bool: whether to redraw y
            bool: whether to redraw info
        """
        if channel < 0 or channel > self.numChannels - 1:
            raise ValueError('Channel {} is outside of range [0, {}].'.format(
                channel, self.numChannels - 1))
        self.channel = channel
        return True, False, False

    def action_change_feature(self, feature):
        """
        Change current feature.

        Args:
            feature (int): which feature to switch to

        Raises:
            ValueError: if feature is not in [0, feature_max)

        Returns:
            bool: whether to redraw X
            bool: whether to redraw y
            bool: whether to redraw info
        """
        if feature < 0 or feature > self.numFeatures - 1:
            raise ValueError('Feature {} is outside of range [0, {}].'.format(
                feature, self.numFeatures - 1))
        self.feature = feature
        return False, True, False

    def action_change_frame(self, frame):
        """
        Change current frame.

        Args:
            feature (int): which frame to view

        Raises:
            ValueError: if feature is not in [0, numFrames)

        Returns:
            bool: whether to redraw X
            bool: whether to redraw y
            bool: whether to redraw info
        """
        if frame < 0 or frame > self.frame - 1:
            raise ValueError('Frame {} is outside of range [0, {}].'.format(
                frame, self.numFrames - 1))
        self.frame = frame
        return True, True, False

class RawFrame(db.Model):
    """
    Table definition that stores the raw frames in a project.
    """
    # pylint: disable=E1101
    __tablename__ = 'rawframes'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())

    def __init__(self, project_id, frame_id, frame, rgb=False):
        self.project_id = project_id
        self.frame_id = frame_id
        self.rgb = rgb
        if self.rgb:
            self.frame = self.reduce_to_RGB(frame)
        else:
            self.frame = frame

    def rescale_95(self, frame):
        """
        Rescale a single- or multi-channel image.

        Returns:
            np.array: rescaled image
        """
        percentiles = np.percentile(frame[frame > 0], [5, 95])
        rescaled_frame = rescale_intensity(
            frame,
            in_range=(percentiles[0], percentiles[1]),
            out_range='uint8')
        rescaled_frame = rescaled_frame.astype('uint8')
        return rescaled_frame

    def reduce_to_RGB(self, frame):
        """
        Go from rescaled raw array with up to 6 channels to an RGB image for display.
        Handles adding in CMY channels as needed, and adjusting each channel if
        viewing adjusted raw. Used to update self.rgb, which is used to display
        raw current frame.

        Returns:
            np.array: 3-channel image
        """
        rescaled = self.rescale_raw()
        # rgb starts as uint16 so it can handle values above 255 without overflow
        rgb_img = np.zeros((frame.shape[0], frame.shape[1], 3), dtype='uint16')

        # for each of the channels that we have
        for c in range(min(6, frame.shape[-1])):
            # straightforward RGB -> RGB
            new_channel = (rescaled[..., c]).astype('uint16')
            if c < 3:
                rgb_img[..., c] = new_channel
            # collapse cyan to G and B
            if c == 3:
                rgb_img[..., 1] += new_channel
                rgb_img[..., 2] += new_channel
            # collapse magenta to R and B
            if c == 4:
                rgb_img[..., 0] += new_channel
                rgb_img[..., 2] += new_channel
            # collapse yellow to R and G
            if c == 5:
                rgb_img[..., 0] += new_channel
                rgb_img[..., 1] += new_channel

            # clip values to uint8 range so it can be cast without overflow
            rgb_img[..., 0:3] = np.clip(rgb_img[..., 0:3], a_min=0, a_max=255)

        return rgb_img.astype('uint8')

    @staticmethod
    def get_frame(project_id, frame_id):
        """
        Return the given frame from the given project.

        Args:
            project_id (int): project that the frame belongs to
            frame_id (int): index of frame to return
        """
        start = timeit.default_timer()
        frame = RawFrame.query.filter_by(project_id=project_id, frame_id=frame_id).first()
        logger.debug('Got frame %s from project %s in %ss.',
                     frame_id, project_id, timeit.default_timer() - start)
        return frame

    @staticmethod
    def create_frame(project_id, frame):
        """
        Create a new project.

        Args:
            project_id (int): project that the frame belongs to
            frame (CalibanFrame): object with image data
        """
        start = timeit.default_timer()
        new_frame = RawFrame(
            project_id=project_id,
            frame_id=frame.frame_id,
            frame=frame.frame)
        db.session.add(new_frame)
        db.session.commit()
        logger.debug('Created frame %s in project %s in %ss.',
                     frame.frame_id, project_id, timeit.default_timer() - start)
        return new_frame

class LabelFrame(db.Model):
    """
    Table definition for the label frames in our projects.
    Extends the Frame class with functions to update and finish the frame.
    """
    # pylint: disable=E1101
    __tablename__ = 'labelframes'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    updatedAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now(),
                          onupdate=db.func.current_timestamp())
    finished = db.Column(db.TIMESTAMP)
    numUpdates = db.Column(db.Integer, nullable=False, default=0)
    firstUpdate = db.Column(db.TIMESTAMP)
    lastUpdate = db.Column(db.TIMESTAMP)

    # TODO: could this causes issues as LabelFrame extends RawFrame?
    # project = db.relationship('Project', backref=db.backref('labelframes'))

    def __init__(self, project_id, frame_id, frame):
        self.project_id = project_id
        self.frame_id = frame_id
        self.frame = frame

    @staticmethod
    def get_frame(project_id, frame_id):
        """
        Return the given frame from the given project.

        Args:
            project_id (int): project that the frame belongs to
            frame_id (int): index of frame to return
        """
        start = timeit.default_timer()
        frame = LabelFrame.query.filter_by(project_id=project_id, frame_id=frame_id).first()
        logger.debug('Got frame %s from project %s in %ss.',
                     frame_id, project_id, timeit.default_timer() - start)
        return frame

    @staticmethod
    def create_frame(project_id, frame):
        """
        Create a new project.

        Args:
            project_id (int): project that the frame belongs to
            frame (CalibanFrame): object with image data
        """
        start = timeit.default_timer()
        new_frame = LabelFrame(
            project_id=project_id,
            frame_id=frame.frame_id,
            frame=frame.frame)
        db.session.add(new_frame)
        db.session.commit()
        logger.debug('Created frame %s in project %s in %ss.',
                     frame.frame_id, project_id, timeit.default_timer() - start)
        return new_frame    

    @staticmethod
    def update_frame(frame, caliban_frame):
        """
        Update a frame's data.

        Args:
            frame (LabelFrame): row in the labelframes table to update
            caliban_frame (CalibanFrame): updated object to write to database
        """
        start = timeit.default_timer()
        if not frame.firstUpdate:
            frame.firstUpdate = db.func.current_timestamp()

        frame.frame = caliban_frame.frame
        frame.numUpdates += 1

        db.session.commit()
        logger.debug('Updated frame %s in project %s in %ss.',
                     frame.frame_index, frame.project_id, timeit.default_timer() - start)

    def finish_frame(self):
        """Complete a frame and set its frame data to null."""
        start = timeit.default_timer()
        self.lastUpdate = self.updatedAt
        self.finished = db.func.current_timestamp()
        self.frame = None
        db.session.commit()  # commit the changes
        logger.debug('Finished frame %s in project %s in %ss.',
                     self.frame_index, self.project_id, timeit.default_timer() - start)


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
