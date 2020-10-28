"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
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
from sqlalchemy import event
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.orm import column_property
from sqlalchemy.sql import select, func

from helpers import is_npz_file, is_trk_file
from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from imgutils import pngify, add_outlines


logger = logging.getLogger('models.Project')  # pylint: disable=C0103
# Accessing one-to-many relationships (like project.label_frames) issues a Query, causing a flush
# autoflush=False prevents the flush, so we still access the db.session.dirty after the query
db = SQLAlchemy(session_options={"autoflush": False})  # pylint: disable=C0103


@compiles(db.PickleType, 'mysql')
def compile_pickle_mysql(type_, compiler, **kw):
    """
    Replaces default BLOB with LONGBLOB for PickleType columns on MySQL backend.
    BLOB (64 kB) truncates pickled objects, while LONGBLOB (4 GB) stores it in full.
    TODO: change to MEDIUMBLOB (16 MB)?
    """
    return 'LONGBLOB'


class MutableNdarray(Mutable, np.ndarray):
    @classmethod
    def coerce(cls, key, value):
        "Convert plain numpy arrays to MutableNdarray."
        if not isinstance(value, MutableNdarray):
            if isinstance(value, np.ndarray):
                mutable_array = MutableNdarray(shape=value.shape, dtype=value.dtype, buffer=value)
                return mutable_array

            # this call will raise ValueError
            return Mutable.coerce(key, value)
        else:
            return value

    def __setitem__(self, key, value):
        "Detect array set events and emit change events."
        np.ndarray.__setitem__(self, key, value)
        self.changed()

    def __delitem__(self, key):
        "Detect array del events and emit change events."
        np.ndarray.__delitem__(self, key)
        self.changed()


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    finished = db.Column(db.TIMESTAMP)

    filename = db.Column(db.Text, nullable=False)
    path = db.Column(db.Text, nullable=False)
    output_bucket = db.Column(db.Text, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    num_frames = db.Column(db.Integer, nullable=False)
    num_channels = db.Column(db.Integer, nullable=False)
    num_features = db.Column(db.Integer, nullable=False)
    rgb = db.Column(db.Boolean, default=False)
    frame = db.Column(db.Integer, default=0)
    channel = db.Column(db.Integer, default=0)
    feature = db.Column(db.Integer, default=0)
    scale_factor = db.Column(db.Float, default=1)
    colormap = db.Column(db.PickleType)

    raw_frames = db.relationship('RawFrame', backref='project')
    rgb_frames = db.relationship('RGBFrame', backref='project')
    label_frames = db.relationship('LabelFrame', backref='project',
                                   # Delete frames detached by undo/redo
                                   cascade='save-update, merge, delete, delete-orphan')
    labels = db.relationship('Labels', backref='project', uselist=False,
                             # Delete labels detached by undo/redo
                             cascade='save-update, merge, delete, delete-orphan')

    # Action history
    action_id = db.Column(db.Integer)
    next_action_id = db.Column(db.Integer, default=0)
    actions = db.relationship('Action', backref='project')

    def __init__(self, filename, input_bucket, output_bucket, path,
                 raw_key='raw', annotated_key=None):
        init_start = timeit.default_timer()

        # Load data
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

        # Record static project attributes
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

        # Create label metadata
        self.labels = Labels()
        for feature in range(self.num_features):
            self.labels.create_cell_info(feature, annotated)
        # Overwrite cell_info with lineages to include cell relationships for .trk files
        if is_trk_file(self.filename):
            if len(trial['lineages']) != 1:
                raise ValueError('Input file has multiple trials/lineages.')
            self.labels.cell_info = {0: trial['lineages'][0]}

        # Create frames from raw, RGB, and labeled images
        self.raw_frames = [RawFrame(i, frame)
                           for i, frame in enumerate(raw)]
        self.rgb_frames = [RGBFrame(i, frame)
                           for i, frame in enumerate(raw)]
        self.label_frames = [LabelFrame(i, frame)
                             for i, frame in enumerate(annotated)]

        current_app.logger.debug('Initialized project for %s in %s s.',
                                 filename, timeit.default_timer() - init_start)

    @property
    def action(self):
        return self.actions[self.action_id]

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
    def create(filename, input_bucket, output_bucket, path):
        """
        Create a new project.
        Wraps the Project constructor with logging and database commits.

        Args:
            filename (str): filename including .npz or .trk extension
            input_bucket (str): S3 bucket to download file
            output_bucket (str): S3 bucket to upload file
            path (str): full path to download & upload file in buckets; includes filename

        Returns:
            Project: new row in the Project table
        """
        start = timeit.default_timer()
        new_project = Project(filename, input_bucket, output_bucket, path)
        db.session.add(new_project)
        db.session.commit()
        # Initialize the first action after the projec has persisted so
        # pickled rows (View and Labels) don't reference a transient project
        new_project.actions = [Action(project=new_project)]
        action = new_project.actions[0]
        action.labels_changed = True
        action.x_changed = True
        action.y_changed = True
        new_project.action_id = 0
        new_project.next_action_id = 1
        db.session.commit()
        current_app.logger.debug('Created new project with ID = "%s" in %ss.',
                                 new_project.id, timeit.default_timer() - start)
        return new_project

    def update(self):
        """
        Commit the project changes from an action.
        Records the effects of the action in the Actions table.
        """
        start = timeit.default_timer()
        # Copy the PickleType columns to ensure that we persist the changes
        if self.action.labels_changed:
            self.labels.update()
        if self.action.multi_changed:
            for label_frame in self.label_frames:
                label_frame.update()
        elif self.action.y_changed:
            self.label_frames[self.frame].update()
        db.session.commit()
        current_app.logger.debug('Updated project %s in %ss.',
                                 self.action_id, self.id,
                                 timeit.default_timer() - start)

    def make_new_action(self):
        """
        Creates a new action for a Project and links it the previous action.
        """
        start = timeit.default_timer()
        # TODO: Identify and record the edited frames/label metadata
        # Create a new row in the action history for the next action
        # TODO: record the action type (e.g. "handle_draw") to store in action history
        action = self.action
        new_action = Action(project=self)
        action.next_action_id = new_action.action_id
        self.action_id = new_action.action_id
        self.next_action_id += 1
        db.session.add(new_action)
        current_app.logger.debug('Initialized action %s project %s in %ss.',
                                 self.action_id, self.id,
                                 timeit.default_timer() - start)
        db.session.commit()

    def undo(self):
        """
        Restores the project to before the most recent action.

        Returns:
            dict: payload to send to frontend
        """
        start = timeit.default_timer()
        if self.action.prev_action_id is None:
            return
        prev_action = self.actions[self.action.prev_action_id]
        # Restore label frames
        # Assumes that we store every frame before every action
        # TODO: only store/restore edited frames
        for frame, prev_frame in zip(self.label_frames, prev_action.frames):
            frame.frame = prev_frame.frame
        # Restore label metadata
        # TODO: only store/restore if changed
        db.session.expunge(self.labels)
        self.labels = prev_action.labels
        db.session.add(self.labels)
        self.action_id = prev_action.action_id
        db.session.commit()
        payload = self.make_payload(send_x=prev_action.x_changed,
                                    send_y=prev_action.y_changed,
                                    send_labels=prev_action.labels_changed)
        current_app.logger.debug('Undo action %s project %s in %ss.',
                                 self.action_id, self.id, timeit.default_timer() - start)
        return payload

    def redo(self):
        """
        Restore the project to after the next action.

        Returns:
            dict: payload to send to frontend
        """
        start = timeit.default_timer()
        if self.action.next_action_id is None:
            # TODO: error handling when there is no action to redo
            return
        next_action = self.actions[self.action.next_action_id]
        # Restore label frames
        # Assumes that we store every frame before every action
        # TODO: only store and restore edited frames
        for frame, next_frame in zip(self.label_frames, next_action.frames):
            frame.frame = next_frame.frame
        # Restore label metadata
        # TODO: only store/restore if changed
        db.session.expunge(self.labels)
        self.labels = next_action.labels
        db.session.add(self.labels)
        # Make the payload using the _changed flags for the current action
        payload = self.make_payload(send_x=self.action.x_changed,
                                    send_y=self.action.y_changed,
                                    send_labels=self.action.labels_changed)
        self.action_id = next_action.action_id
        db.session.commit()
        current_app.logger.debug('Redo action %s project %s in %ss.',
                                 self.action_id, self.id, timeit.default_timer() - start)
        return payload

    def finish(self):
        """
        Complete a project and its associated objects.
        Sets the PickleType columns to None.
        """
        start = timeit.default_timer()
        self.finished = db.func.current_timestamp()
        self.colormap = None
        # Clear label metadata
        self.labels.finish()
        # Clear frames
        for label_frame in self.label_frames:
            label_frame.finish()
        for raw_frame in self.raw_frames:
            raw_frame.finish()
        for rgb_frame in self.rgb_frames:
            rgb_frame.finish()
        # Clear ActionHistory
        for action in self.actions:
            action.finish()
        db.session.commit()
        logger.debug('Finished project with ID = "%s" in %ss.',
                     self.id, timeit.default_timer() - start)

    def get_max_label(self):
        """
        Get the highest label in use in currently-viewed feature.
        If feature is empty, returns 0 to prevent other functions from crashing.

        Returns:
            int: highest label in the current feature
        """
        # check this first, np.max of empty array will crash
        if len(self.labels.cell_ids[self.feature]) == 0:
            max_label = 0
        # if any labels exist in feature, find the max label
        else:
            max_label = int(np.max(self.labels.cell_ids[self.feature]))
        return max_label

    def get_label_arr(self):
        """
        Returns:
            list: nested list of labels at each positions, with negative label outlines.
        """
        # Create label array
        label_frame = self.label_frames[self.frame]
        label_arr = label_frame.frame[..., self.feature]
        return add_outlines(label_arr).tolist()

    def get_label_png(self):
        """
        Returns:
            BytesIO: returns the current label frame as a .png
        """
        # Create label png
        label_frame = self.label_frames[self.frame]
        label_arr = label_frame.frame[..., self.feature]
        label_png = pngify(imgarr=np.ma.masked_equal(label_arr, 0),
                           vmin=0,
                           vmax=self.get_max_label(),
                           cmap=self.colormap)
        return label_png

    def get_raw_png(self):
        """
        Returns:
            BytesIO: contains the current raw frame as a .png
        """
        # RGB png
        if self.rgb:
            raw_frame = self.rgb_frames[self.frame]
            raw_arr = raw_frame.frame
            raw_png = pngify(imgarr=raw_arr,
                             vmin=None,
                             vmax=None,
                             cmap=None)
            return raw_png
        # Raw png
        raw_frame = self.raw_frames[self.frame]
        raw_arr = raw_frame.frame[..., self.channel]
        raw_png = pngify(imgarr=raw_arr,
                         vmin=0,
                         vmax=None,
                         cmap='cubehelix')
        return raw_png

    def make_payload(self, send_x=False, send_y=False, send_labels=False):
        """
        Creates a payload to send to the front-end after completing an action.

        Args:
            send_x (bool): when True, payload includes raw image PNG
            send_y (bool): when True, payload includes labeled image data
                           sends both a PNG and an array of where each label is
            send_labels (bool): when True, payload includes the label "tracks",
                                or the frames that each label appears in (e.g. [0-10, 15-20])

        Returns:
            dict: payload with image data and label tracks
        """
        if send_x or send_y:
            img_payload = {}
            encode = lambda x: base64.encodebytes(x.read()).decode()
            if send_x:
                raw_png = self.get_raw_png()
                img_payload['raw'] = f'data:image/png;base64,{encode(raw_png)}'
            if send_y:
                label_png = self.get_label_png()
                img_payload['segmented'] = f'data:image/png;base64,{encode(label_png)}'
                img_payload['seg_arr'] = self.get_label_arr()
        else:
            img_payload = False

        if send_labels:
            tracks = self.labels.readable_tracks
        else:
            tracks = False

        return {'imgs': img_payload, 'tracks': tracks}


class Labels(db.Model):
    """
    Table definition that stores metadata about the labeling.
    Cell_info stores a dictionary with frame information about each cell.
    """
    # pylint: disable=E1101
    __tablename__ = 'labels'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    # Label metadata
    cell_ids = db.Column(db.PickleType(comparator=lambda *a: False))
    cell_info = db.Column(db.PickleType(comparator=lambda *a: False))

    def __init__(self):
        self.cell_ids = {}
        self.cell_info = {}

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

    def update(self):
        """
        Update the label metatdata by explicitly copying the PickleType
        columns so the database knows to commit them.
        """
        # TODO: use Mutable mixin to avoid explicit copying
        self.cell_ids = self.cell_ids.copy()
        self.cell_info = self.cell_info.copy()

    def finish(self):
        """Set PickleType columns to null."""
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

    def __init__(self, frame_id, frame):
        # self.project_id = project_id
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

    def __init__(self, frame_id, frame):
        # self.project_id = project_id
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
    frame = db.Column(MutableNdarray.as_mutable(db.PickleType))
    updatedAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now(),
                          onupdate=db.func.current_timestamp())
    numUpdates = db.Column(db.Integer, nullable=False, default=0)
    firstUpdate = db.Column(db.TIMESTAMP)
    lastUpdate = db.Column(db.TIMESTAMP)

    def __init__(self, frame_id, frame):
        # self.project = project
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


class Action(db.Model):
    """
    Records a sequence of actions
    and the label frames and label metadata before each action.
    """
    # pylint: disable=E1101
    __tablename__ = 'actions'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False, autoincrement=False)
    action_id = db.Column(db.Integer, primary_key=True, nullable=False)
    # Action to restore upon undo
    prev_action_id = db.Column(db.Integer)
    # Action to restore upon redo
    next_action_id = db.Column(db.Integer)
    # Name of the previous action (e.g. "handle_draw")
    prev_action = db.Column(db.String)
    x_changed = db.Column(db.Boolean, default=False)
    y_changed = db.Column(db.Boolean, default=False)
    multi_changed = db.Column(db.Boolean, default=False)
    labels_changed = db.Column(db.Boolean, default=False)
    frames = db.relationship('FrameHistory', backref='action',
                             primaryjoin="and_("
                             "Action.action_id == foreign(FrameHistory.action_id), "
                             "Action.project_id == FrameHistory.project_id)")
    # Pickles an ORM row from the Labels table
    labels = db.Column(db.PickleType)

    def __init__(self, project):
        """
        Called when completing an action and
        creating a new, empty action row for the next action."""
        self.project = project
        self.action_id = project.next_action_id
        self.prev_action_id = project.action_id
        self.labels = project.labels
        self.frames = [FrameHistory(project=project, frame=frame)
                       for frame in project.label_frames]

    def finish(self):
        for frame in self.frames:
            frame.finish()
        self.labels = None


class FrameHistory(db.Model):
    """
    Table to store label frames before an action edits them.
    """
    # pylint: disable=E1101
    __tablename__ = 'framehistories'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False)
    action_id = db.Column(db.Integer, db.ForeignKey('actions.action_id'),
                          primary_key=True, nullable=False)
    frame_id = db.Column(db.Integer, primary_key=True, nullable=False)
    frame = db.Column(db.PickleType)

    project = db.relationship('Project')

    def __init__(self, project, frame):
        self.project = project
        self.frame = frame.frame
        self.frame_id = frame.frame_id

    def finish(self):
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
