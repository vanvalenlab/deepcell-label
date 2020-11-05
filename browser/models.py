"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import copy
import io
import json
import logging
import tarfile
import tempfile
import timeit

import boto3
from flask_sqlalchemy import SQLAlchemy
from flask import current_app
from matplotlib import pyplot as plt
import numpy as np
from skimage.exposure import rescale_intensity
from sqlalchemy.ext.compiler import compiles

from helpers import is_npz_file, is_trk_file
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from imgutils import pngify, add_outlines


logger = logging.getLogger('models.Project')  # pylint: disable=C0103
db = SQLAlchemy()  # pylint: disable=C0103


@compiles(db.PickleType, 'mysql')
def compile_pickle_mysql(type_, compiler, **kw):
    """
    Replaces default BLOB with LONGBLOB for PickleType columns on MySQL backend.
    BLOB (64 kB) truncates pickled objects, while LONGBLOB (4 GB) stores it in full.
    TODO: change to MEDIUMBLOB (16 MB)?
    """
    return 'LONGBLOB'


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    finished = db.Column(db.TIMESTAMP)

    raw_frames = db.relationship('RawFrame', backref='project')
    rgb_frames = db.relationship('RGBFrame', backref='project')
    label_frames = db.relationship('LabelFrame', backref='project')
    state = db.relationship('State', backref='project', uselist=False)

    def __init__(self, filename, input_bucket, output_bucket, path,
                 rgb=False, raw_key='raw', annotated_key=None):
        init_start = timeit.default_timer()
        if annotated_key is None:
            annotated_key = get_ann_key(filename)

        start = timeit.default_timer()
        trial = self.load(filename, input_bucket, path)
        current_app.logger.debug('Loaded file %s from S3 in %s s.',
                                 filename, timeit.default_timer() - start)
        raw = trial[raw_key]
        annotated = trial[annotated_key]
        # possible differences between single channel and rgb displays
        if raw.ndim == 3:
            raw = np.expand_dims(raw, axis=0)
            annotated = np.expand_dims(annotated, axis=0)

        # Create state
        start = timeit.default_timer()
        self.state = State(self.id, filename, path, output_bucket,
                           raw, annotated, trial, rgb)
        current_app.logger.debug('Created state for %s in %ss.',
                                 filename, timeit.default_timer() - start)

        # Create frames from raw, RGB, and labeled images
        start = timeit.default_timer()
        self.raw_frames = [RawFrame(self.id, i, frame)
                           for i, frame in enumerate(raw)]
        current_app.logger.debug('Created raw frames for %s in %ss.',
                                 filename, timeit.default_timer() - start)

        start = timeit.default_timer()
        self.rgb_frames = [RGBFrame(self.id, i, frame)
                           for i, frame in enumerate(raw)]
        current_app.logger.debug('Created RGB frames for %s in %ss.',
                                 filename, timeit.default_timer() - start)

        start = timeit.default_timer()
        self.label_frames = [LabelFrame(self.id, i, frame)
                             for i, frame in enumerate(annotated)]
        current_app.logger.debug('Created label frames for %s in %ss.',
                                 filename, timeit.default_timer() - start)
        # Log total time in constructor
        current_app.logger.debug('Initialized project for %s in %s s.',
                                 filename, timeit.default_timer() - init_start)

    @property
    def label_array(self):
        """Compiles all label frames into a single numpy array."""
        return np.array([frame.frame for frame in self.label_frames])

    @property
    def raw_array(self):
        """Compiles all raw frames into a single numpy array."""
        return np.array([frame.frame for frame in self.raw_frames])

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def load(self, filename, bucket, path):
        """
        Load a file from the S3 input bucket.

        Args:
            filename (str): filename; used to check if loading .npz or .trk file
            bucket (str): bucket to pull from on S3
            path (str): full path to the file within the bucket, including the filename
        """
        _load = get_load(filename)
        s3 = self._get_s3_client()
        response = s3.get_object(Bucket=bucket, Key=path)
        return _load(response['Body'].read())

    @staticmethod
    def get(project_id):
        """
        Return the project with the given ID, if it exists.

        Args:
            project_id (int): primary key of project to get

        Returns:
            Project: row from the Project table
        """
        start = timeit.default_timer()
        project = Project.query.filter_by(id=project_id).first()
        logger.debug('Got project %s in %ss.',
                     project_id, timeit.default_timer() - start)
        return project

    @staticmethod
    def create(filename, input_bucket, output_bucket, path, rgb=False):
        """
        Create a new project.
        Wraps the Project constructor with logging and database commits.

        Args:
            filename (str): filename including .npz or .trk extension
            input_bucket (str): S3 bucket to download file
            output_bucket (str): S3 bucket to upload file
            path (str): full path to download & upload file in buckets; includes filename
            rgb (bool): whether to display raw frames in RGB mode

        Returns:
            Project: new row in the Project table
        """
        start = timeit.default_timer()
        new_project = Project(filename, input_bucket, output_bucket, path, rgb=rgb)
        db.session.add(new_project)
        db.session.commit()
        current_app.logger.debug('Created new project with ID = "%s" in %ss.',
                                 new_project.id, timeit.default_timer() - start)
        return new_project

    def update(self):
        """
        Commit the project changes from an action.
        """
        start = timeit.default_timer()
        db.session.commit()
        logger.debug('Updated project %s in %ss.',
                     self.id, timeit.default_timer() - start)

    def finish(self):
        """
        Complete a project and its associated frames and state.
        Sets the PickleType columns of the frames and state to None.
        """
        start = timeit.default_timer()
        self.finished = db.func.current_timestamp()
        # Set PickleType columns in state to None
        self.state.finish()
        # Set PickleType columns in frames to None
        for label_frame in self.label_frames:
            label_frame.finish()
        for raw_frame in self.raw_frames:
            raw_frame.finish()
        for rgb_frame in self.rgb_frames:
            rgb_frame.finish()
        db.session.commit()  # commit the changes
        logger.debug('Finished project with ID = "%s" in %ss.',
                     self.id, timeit.default_timer() - start)

    def get_label_arr(self):
        """
        Returns:
            list: nested list of labels at each positions, with negative label outlines.
        """
        state = self.state
        # Create label array
        label_frame = self.label_frames[state.frame]
        label_arr = label_frame.frame[..., state.feature]
        return add_outlines(label_arr).tolist()

    def get_label_png(self):
        """
        Returns:
            BytesIO: returns the current label frame as a .png
        """
        state = self.state
        # Create label png
        label_frame = self.label_frames[state.frame]
        label_arr = label_frame.frame[..., state.feature]
        label_png = pngify(imgarr=np.ma.masked_equal(label_arr, 0),
                           vmin=0,
                           vmax=state.get_max_label(),
                           cmap=state.colormap)
        return label_png

    def get_raw_png(self):
        """
        Returns:
            BytesIO: contains the current raw frame as a .png
        """
        state = self.state
        # RGB png
        if state.rgb:
            raw_frame = self.rgb_frames[state.frame]
            raw_arr = raw_frame.frame
            raw_png = pngify(imgarr=raw_arr,
                             vmin=None,
                             vmax=None,
                             cmap=None)
            return raw_png
        # Raw png
        raw_frame = self.raw_frames[state.frame]
        raw_arr = raw_frame.frame[..., state.channel]
        raw_png = pngify(imgarr=raw_arr,
                         vmin=0,
                         vmax=None,
                         cmap='cubehelix')
        return raw_png


class State(db.Model):
    """
    Table definition that stores the project state.
    Includes both static project info, like filename and data dimensions,
    and label metadata that is updated by actions.
    """
    # pylint: disable=E1101
    __tablename__ = 'state'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    updatedAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now(),
                          onupdate=db.func.current_timestamp())
    finished = db.Column(db.TIMESTAMP)
    numUpdates = db.Column(db.Integer, nullable=False, default=0)
    firstUpdate = db.Column(db.TIMESTAMP)
    lastUpdate = db.Column(db.TIMESTAMP)

    # Static Project info
    filename = db.Column(db.Text, nullable=False)
    path = db.Column(db.Text, nullable=False)
    output_bucket = db.Column(db.Text, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    num_frames = db.Column(db.Integer, nullable=False)
    num_channels = db.Column(db.Integer, nullable=False)
    num_features = db.Column(db.Integer, nullable=False)
    # View info
    rgb = db.Column(db.Boolean, default=False)
    frame = db.Column(db.Integer, default=0)
    channel = db.Column(db.Integer, default=0)
    feature = db.Column(db.Integer, default=0)
    scale_factor = db.Column(db.Float, default=1)
    colormap = db.Column(db.PickleType)
    # Label metadata
    cell_ids = db.Column(db.PickleType(comparator=lambda *a: False))
    cell_info = db.Column(db.PickleType(comparator=lambda *a: False))

    def __init__(self, project_id, filename, path, output_bucket, raw, annotated, trial, rgb):
        self.project_id = project_id
        self.filename = filename
        self.path = path
        self.output_bucket = output_bucket
        self.num_frames = raw.shape[0]
        self.height = raw.shape[1]
        self.width = raw.shape[2]
        self.num_channels = raw.shape[-1]
        self.num_features = annotated.shape[-1]
        cmap = plt.get_cmap('viridis')
        cmap.set_bad('black')
        self.colormap = cmap
        self.rgb = rgb

        # Label metadata
        # create a dictionary with frame information about each cell
        # analogous to .trk lineage but doesn't include cells relationships
        self.cell_ids = {}
        self.cell_info = {}
        for feature in range(self.num_features):
            self.create_cell_info(feature, annotated)

        # Overwrite cell_info with lineages to include cell relationships for .trk files
        if is_trk_file(filename):
            if len(trial['lineages']) != 1:
                raise ValueError('Input file has multiple trials/lineages.')
            self.cell_info = {0: trial['lineages'][0]}
            # Track files require a different scale factor
            self.scale_factor = 2

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
        """
        Make or remake the entire cell info dict.

        Args:
            feature (int): which feature to create the cell info dict
            labels (ndarray): the complete label array (all frames, all features)
        """
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

    def update(self):
        """
        Update the state by explicitly copying the PickleType
        columns so the database knows to commit them.
        """
        if not self.firstUpdate:
            self.firstUpdate = db.func.current_timestamp()
        self.numUpdates += 1

        self.cell_ids = self.cell_ids.copy()
        self.cell_info = self.cell_info.copy()

    def finish(self):
        """Complete state and set its PickleType column to null."""
        self.lastUpdate = self.updatedAt
        self.finished = db.func.current_timestamp()
        self.cell_ids = None
        self.cell_info = None


class RawFrame(db.Model):
    """
    Table definition that stores the raw frames in a project.
    """
    # pylint: disable=E1101
    __tablename__ = 'rawframes'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)

    def __init__(self, project_id, frame_id, frame):
        self.project_id = project_id
        self.frame_id = frame_id
        self.frame = frame

    def finish(self):
        """
        Finish the frame by setting its PickleType column to null.
        """
        self.frame = None


class RGBFrame(db.Model):
    """
    Table definition for the raw RGB frames in our projects.
    """
    # pylint: disable=E1101
    __tablename__ = 'rgbframes'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)

    def __init__(self, project_id, frame_id, frame):
        self.project_id = project_id
        self.frame_id = frame_id
        self.frame = self.reduce_to_RGB(frame)

    def finish(self):
        """Finish a frame by setting its frame to null."""
        self.frame = None

    def rescale_95(self, frame):
        """
        Rescale a single- or multi-channel image.

        Args:
            frame (np.array): 2d image frame to rescale

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

    def rescale_raw(self, frame):
        """
        Rescale first 6 raw channels individually and store in memory.
        The rescaled raw array is used subsequently for image display purposes.

        Args: multi-channel frame to rescale

        Returns:
            np.array: upto 6-channel rescaled image
        """
        rescaled = np.zeros(frame.shape, dtype='uint8')
        # this approach allows noise through
        for channel in range(min(6, frame.shape[-1])):
            raw_channel = frame[..., channel]
            if np.sum(raw_channel) != 0:
                rescaled[..., channel] = self.rescale_95(raw_channel)
        return rescaled

    def reduce_to_RGB(self, frame):
        """
        Go from rescaled raw array with up to 6 channels to an RGB image for display.
        Handles adding in CMY channels as needed, and adjusting each channel if
        viewing adjusted raw. Used to update self.rgb, which is used to display
        raw current frame.

        Args:
            frame (np.array): upto 6-channel image to reduce to 3-channel image

        Returns:
            np.array: 3-channel image
        """
        rescaled = self.rescale_raw(frame)
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


class LabelFrame(db.Model):
    """
    Table definition for the label frames in our projects.
    Allows us to update and finish each frame.
    """
    # pylint: disable=E1101
    __tablename__ = 'labelframes'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)
    updatedAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now(),
                          onupdate=db.func.current_timestamp())
    numUpdates = db.Column(db.Integer, nullable=False, default=0)
    firstUpdate = db.Column(db.TIMESTAMP)
    lastUpdate = db.Column(db.TIMESTAMP)

    def __init__(self, project_id, frame_id, frame):
        self.project_id = project_id
        self.frame_id = frame_id
        self.frame = frame

    def update(self):
        """
        Update a frame's data by explicitly copying the PickleType
        columns so the database knows to commit the changes.
        """
        if not self.firstUpdate:
            self.firstUpdate = db.func.current_timestamp()
        self.frame = self.frame.copy()
        self.numUpdates += 1

    def finish(self):
        """Finish a frame by setting its frame to null."""
        self.lastUpdate = self.updatedAt
        self.frame = None


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0] + 1)


def get_ann_key(filename):
    """
    Returns:
        str: expected key for the label array depending on the filename
    """
    if is_trk_file(filename):
        return 'tracked'
    return 'annotated'  # default key


def get_load(filename):
    """
    Returns:
        function: loads a response body from S3
    """
    if is_npz_file(filename):
        _load = load_npz
    elif is_trk_file(filename):
        _load = load_trks
    else:
        raise ValueError('Cannot load file: {}'.format(filename))
    return _load


def load_npz(filename):
    """
    Loads a NPZ file.

    Args:
        filename: full path to the file including .npz extension

    Returns:
        dict: contains raw and annotated images as numpy arrays
    """
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
    """
    Load a trk/trks file.

    Args:
        trks_file (str): full path to the file including .trk/.trks

    Returns:
        dict: contains raw, tracked, and lineage data
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
