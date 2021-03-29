"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import copy
import enum
import io
import logging
import os
import timeit
from secrets import token_urlsafe

from flask import current_app
from flask_sqlalchemy import SQLAlchemy
from matplotlib import pyplot as plt
import numpy as np
from skimage.exposure import rescale_intensity
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.schema import PrimaryKeyConstraint, ForeignKeyConstraint

from imgutils import pngify, add_outlines


logger = logging.getLogger('models.Project')  # pylint: disable=C0103
# Accessing relationships (like project.label_frames) issues a Query, causing a flush
# autoflush=False prevents the flush, so we still access the db.session.dirty after the query
db = SQLAlchemy(session_options={'autoflush': False})  # pylint: disable=C0103


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
        """Convert plain numpy arrays to MutableNdarray."""
        if not isinstance(value, MutableNdarray):
            if isinstance(value, np.ndarray):
                mutable_array = value.view(MutableNdarray)
                return mutable_array

            # this call will raise ValueError
            return Mutable.coerce(key, value)
        else:
            return value

    def __setitem__(self, key, value):
        """Detect array set events and emit change events."""
        np.ndarray.__setitem__(self, key, value)
        self.changed()

    def __delitem__(self, key):
        """Detect array del events and emit change events."""
        np.ndarray.__delitem__(self, key)
        self.changed()


class SourceEnum(enum.Enum):
    s3 = 's3'
    dropped = 'dropped'
    lfs = 'lfs'


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    token = db.Column(db.String(12), unique=True, nullable=False, index=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    finished = db.Column(db.TIMESTAMP)

    path = db.Column(db.Text, nullable=False)
    source = db.Column(db.Enum(SourceEnum), nullable=False)
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
    action_id = db.Column(db.Integer, db.ForeignKey('actions.action_id'))
    action = db.relationship('Action', uselist=False, post_update=True,
                             primaryjoin="and_(Project.id==Action.project_id, "
                                         "foreign(Project.action_id)==Action.action_id)")
    actions = db.relationship('Action', backref='project', foreign_keys='[Action.project_id]')
    num_actions = db.Column(db.Integer, default=0)

    def __init__(self, loader):
        init_start = timeit.default_timer()
        raw = loader.raw_array
        label = loader.label_array

        # Record static project attributes
        self.path = str(loader.path)
        self.source = loader.source
        self.num_frames = raw.shape[0]
        self.height = raw.shape[1]
        self.width = raw.shape[2]
        self.num_channels = raw.shape[-1]
        self.num_features = label.shape[-1]
        cmap = plt.get_cmap('viridis')
        cmap.set_bad('black')
        self.colormap = cmap

        if self.is_track:
            # Track files require a different scale factor
            self.scale_factor = 2

        # Create frames from raw, RGB, and labeled images
        self.raw_frames = [RawFrame(i, frame)
                           for i, frame in enumerate(raw)]
        self.rgb_frames = [RGBFrame(i, frame)
                           for i, frame in enumerate(raw)]
        self.label_frames = [LabelFrame(i, frame)
                             for i, frame in enumerate(label)]

        # Create label metadata
        self.labels = Labels()
        self.labels.cell_ids = loader.cell_ids
        self.labels.cell_info = loader.cell_info

        logger.debug('Initialized project from %s in %ss.',
                     self.path, timeit.default_timer() - init_start)

    @property
    def label_array(self):
        """Compiles all label frames into a single numpy array."""
        return np.array([frame.frame for frame in self.label_frames])

    @property
    def raw_array(self):
        """Compiles all raw frames into a single numpy array."""
        return np.array([frame.frame for frame in self.raw_frames])

    @property
    def is_zstack(self):
        return os.path.splitext(self.path.lower())[-1] in {'.npz', '.png', '.tif', '.tiff'}

    @property
    def is_track(self):
        return os.path.splitext(self.path.lower())[-1] in {'.trk', '.trks'}

    @staticmethod
    def get(token):
        """
        Return the project with the given ID, if it exists.

        Args:
            token (int): unique 12 character base64 string to identify project

        Returns:
            Project: row from the Project table
        """
        start = timeit.default_timer()
        project = db.session.query(Project).filter_by(token=token).first()
        logger.debug('Got project %s in %ss.',
                     token, timeit.default_timer() - start)
        return project

    @staticmethod
    def create(loader):
        """
        Create a new project in the Project table.

        Args:
            loader (Loader): loads or creates raw_array, label_array, cell_ids, & cell_info

        Returns:
            Project: new row in the Project table
        """
        start = timeit.default_timer()
        new_project = Project(loader)
        # Assign a unique 12 character base64 token to the project
        while True:
            token = token_urlsafe(9)  # 9 bytes is 12 base64 characters
            if not db.session.query(Project).filter_by(token=token).first():
                new_project.token = token
                break
        db.session.add(new_project)
        db.session.commit()
        new_project.create_memento('create_project', all_frames=True)
        db.session.commit()
        logger.debug('Created new project %s (id %s) in %ss.',
                     new_project.token, new_project.id, timeit.default_timer() - start)
        return new_project

    def update(self):
        """
        Commit the project changes from an action.
        Records the effects of the action in the Action table.
        """
        start = timeit.default_timer()
        if self.action.labels_changed:
            self.labels.update()
        db.session.commit()
        logger.debug('Updated project %s in %ss.',
                     self.id, timeit.default_timer() - start)

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
        self.finished = db.func.current_timestamp()
        db.session.commit()
        logger.debug('Finished project %s in %ss.',
                     self.id, timeit.default_timer() - start)

    def create_memento(self, action_name, all_frames=False, session=None):
        """
        Saves the project state.
        """
        session = session or db.session
        # Create action and store project state inside
        action = Action(self, action_name=action_name)
        for frame in self.label_frames:
            if frame in session.dirty or all_frames:
                session.add(FrameMemento(action=action, frame=frame))
        action.labels = self.labels
        if self.action is not None:
            self.action.next_action = action
        # Move the Project to the new action
        self.action = action
        self.num_actions += 1

    def undo(self):
        """
        Restores the project to before the current action.

        Returns:
            dict: payload to send to frontend
        """
        start = timeit.default_timer()
        action = self.action
        if self.action.prev_action is None:
            return
        # Restore edited label frames
        for prev_frame in action.before_frames:
            frame_id = prev_frame.frame_id
            frame = prev_frame.frame_array
            self.label_frames[frame_id].frame = frame
        # Restore edited label info
        if action.before_labels is not None:
            self.labels.cell_ids = action.before_labels.cell_ids
            self.labels.cell_info = action.before_labels.cell_info

        payload = self.make_payload(y=action.y_changed,
                                    labels=action.labels_changed)
        action.done = False
        self.action = action.prev_action

        db.session.commit()
        logger.debug('Undo action %s project %s in %ss.',
                     action.action_id, self.id, timeit.default_timer() - start)
        return payload

    def redo(self):
        """
        Restore the project to after the next action.

        Returns:
            dict: payload to send to frontend
        """
        start = timeit.default_timer()
        if self.action.next_action is None:
            return
        next_action = self.action.next_action

        # Restore edited label frames
        for after_frame in next_action.after_frames:
            frame_id = after_frame.frame_id
            frame = after_frame.frame_array
            self.label_frames[frame_id].frame = frame
        # Restore edited label info
        if next_action.after_labels is not None:
            self.labels.cell_ids = next_action.after_labels.cell_ids
            self.labels.cell_info = next_action.after_labels.cell_info

        payload = self.make_payload(y=next_action.y_changed,
                                    labels=next_action.labels_changed)
        self.action = self.action.next_action
        next_action.done = True

        db.session.commit()
        logger.debug('Redo action %s project %s in %ss.',
                     next_action.action_id, self.id, timeit.default_timer() - start)
        return payload

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

    def make_first_payload(self):
        """
        Creates the first payload to be sent to the front-end,
        containing extra metadata about the Project.

        Returns:
            dict: payload with image data, label tracks, and project attributes
        """
        payload = {}

        # payload['tracks'] = self.labels.readable_tracks

        # Other Project attributes to initialize frontend variables
        payload['frame'] = self.frame
        payload['channel'] = self.channel
        payload['feature'] = self.feature

        payload['numFrames'] = self.num_frames
        payload['numChannels'] = self.num_channels
        payload['numFeatures'] = self.num_features

        payload['width'] = self.width
        payload['height'] = self.height

        # # First frame edited by each action
        # # Excludes the first action, which loads the project
        # payload['actionFrames'] = [action.frames[0].frame_id
        #                            for action in self.actions[1:] if action.done]

        return payload

        # payload = {}

        # img_payload = {}
        # raw_png = self._get_raw_png()
        # img_payload['raw'] = f'data:image/png;base64,{encode(raw_png)}'
        # label_png = self._get_label_png()
        # img_payload['segmented'] = f'data:image/png;base64,{encode(label_png)}'
        # img_payload['seg_arr'] = self._get_label_arr()
        # payload['imgs'] = img_payload

        # payload['tracks'] = self.labels.readable_tracks

        # # Other Project attributes to initialize frontend variables
        # payload['frame'] = self.frame
        # payload['numFrames'] = self.num_frames
        # payload['project_id'] = self.token
        # payload['dimensions'] = (self.width, self.height)
        # # Attributes specific to filetype
        # if self.is_track:
        #     payload['screen_scale'] = self.scale_factor
        # if self.is_zstack:
        #     payload['channel'] = self.channel
        #     payload['numChannels'] = self.num_channels
        #     payload['feature'] = self.feature
        #     payload['numFeatures'] = self.num_features

        # # First frame edited by each action
        # # Excludes the first action, which loads the project
        # payload['actionFrames'] = [action.frames[0].frame_id
        #                            for action in self.actions[1:] if action.done]

        # return payload

    def make_payload(self, x=False, y=False, labels=False):
        """
        Creates a payload to send to the front-end after completing an action.

        Args:
            x (bool): when True, payload includes raw image PNG
            y (bool): when True, payload includes labeled image data
                           sends both a PNG and an array of where each label is
            labels (bool): when True, payload includes the label "tracks",
                           or the frames that each label appears in (e.g. [0-10, 15-20])

        Returns:
            dict: payload with image data and label tracks
        """
        if x or y:
            img_payload = {}
            if x:
                raw_png = self._get_raw_png()
                img_payload['raw'] = f'data:image/png;base64,{encode(raw_png)}'
            if y:
                label_png = self._get_label_png()
                img_payload['segmented'] = f'data:image/png;base64,{encode(label_png)}'
                img_payload['seg_arr'] = self._get_label_arr()
        else:
            img_payload = False

        if labels:
            tracks = self.labels.readable_tracks
        else:
            tracks = False

        return {'imgs': img_payload, 'tracks': tracks}

    def _get_label_arr(self):
        """
        Returns:
            list: nested list of labels at each positions, with negative label outlines.
        """
        # Create label array
        label_frame = self.label_frames[self.frame]
        label_arr = label_frame.frame[..., self.feature]
        return add_outlines(label_arr).tolist()

    def _get_label_png(self):
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

    def _get_raw_png(self):
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

    def get_raw_png(self, channel, frame):
        """
        Returns:
            BytesIO: contains the raw frame as a .png
        """
        # Raw png
        raw_frame = self.raw_frames[frame]
        raw_arr = raw_frame.frame[..., channel]
        raw_png = pngify(imgarr=raw_arr,
                         vmin=0,
                         vmax=None,
                         cmap='cubehelix')
        return raw_png

    def get_labeled_png(self, feature, frame):
        """
        Returns:
            BytesIO: contains the raw frame as a .png
        """
        # Create label png
        label_frame = self.label_frames[frame]
        label_arr = label_frame.frame[..., feature]
        label_png = pngify(imgarr=np.ma.masked_equal(label_arr, 0),
                           vmin=0,
                           vmax=self.get_max_label(),
                           cmap=self.colormap)
        return label_png

    def get_labeled_array(self, feature, frame):
        """
        Returns:
            BytesIO: contains numpy array of labels
        """
        # Create label array
        label_frame = self.label_frames[frame]
        label_arr = label_frame.frame[..., feature]
        out = io.BytesIO()
        np.save(out, add_outlines(label_arr))
        out.seek(0)
        return out


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

    actions = association_proxy('frame_actions', 'action')

    def __init__(self, frame_id, frame):
        self.frame_id = frame_id
        self.frame = frame

    def finish(self):
        """Finish a frame by setting its frame to null."""
        self.frame = None


class Action(db.Model):
    """
    Memento class in the memento pattern.
    Record a Projects internal state, like label frames and label metadata before each action.
    """
    # pylint: disable=E1101
    __tablename__ = 'actions'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'),
                           primary_key=True, nullable=False, autoincrement=False)
    action_id = db.Column(db.Integer, primary_key=True, nullable=False)
    action_time = db.Column(db.TIMESTAMP)   # Set when finishing an action
    # Name of the action (e.g. "handle_draw")
    action_name = db.Column(db.String(64))
    # Action to jump to upon undo
    prev_action_id = db.Column(db.Integer, db.ForeignKey('actions.action_id'))
    prev_action = db.relationship('Action', uselist=False, post_update=True,
                                  primaryjoin="and_(remote(Action.project_id)==Action.project_id,"
                                  "remote(Action.action_id)==foreign(Action.prev_action_id))")
    # Action to jump to upon redo
    next_action_id = db.Column(db.Integer, db.ForeignKey('actions.action_id'))
    next_action = db.relationship('Action', uselist=False, post_update=True,
                                  primaryjoin="and_(remote(Action.project_id)==Action.project_id,"
                                  "remote(Action.action_id)==foreign(Action.next_action_id))")
    # Whether the action is currently in the Projects lineage
    done = db.Column(db.Boolean, default=True)
    # Records label info after an action (whether or not its changed)
    # Pickles an ORM row from the Labels table
    labels = db.Column(db.PickleType)

    frames = association_proxy('action_frames', 'frame')

    def __init__(self, project, action_name=''):
        self.project = project
        self.prev_action = project.action
        self.action_id = project.num_actions
        self.action_name = action_name

    @property
    def y_changed(self):
        return len(self.frames) > 0

    @property
    def labels_changed(self):
        return self.labels is not None

    @property
    def before_frames(self):
        """
        Returns a list of FrameMementos containing
        the before version of frames edited by this action.
        TODO: profile this search
        """
        # Find the most last version of each edited frame before this action
        before_frames = []
        for frame in self.frames:
            # Actions in the frame's lineage before this action
            valid_actions = filter(lambda action: action.done and action.action_id < self.action_id,
                                   frame.actions)
            # Action containing the most recent version
            before_action = max(valid_actions, key=lambda action: action.action_id)
            before_frame = next(filter(lambda bf, f=frame: bf.frame_id == f.frame_id,
                                       before_action.action_frames))
            before_frames.append(before_frame)
        return before_frames

    @property
    def after_frames(self):
        """Returns a list of FramesMementos containing
        the after version of frames edited by this action."""
        return self.action_frames

    @property
    def before_labels(self):
        if self.prev_action is None:
            return None
        return self.prev_action.labels

    @property
    def after_labels(self):
        return self.labels


class FrameMemento(db.Model):
    """
    Table to store label frames in a Memento.
    """
    # pylint: disable=E1101
    __tablename__ = 'framemementos'
    project_id = db.Column(db.Integer)
    action_id = db.Column(db.Integer)
    frame_id = db.Column(db.Integer)
    frame_array = db.Column(db.PickleType)

    action = db.relationship("Action", backref="action_frames")
    frame = db.relationship("LabelFrame", backref="frame_actions")

    __table_args__ = (
        PrimaryKeyConstraint('project_id', 'action_id', 'frame_id'),
        ForeignKeyConstraint(
            ['project_id', 'action_id'],
            ['actions.project_id', 'actions.action_id']
        ),
        ForeignKeyConstraint(
            ['project_id', 'frame_id'],
            ['labelframes.project_id', 'labelframes.frame_id']
        )
    )

    def __init__(self, action, frame):
        self.action = action
        self.frame = frame
        self.frame_array = frame.frame.copy()


def consecutive(data, stepsize=1):
    return np.split(data, np.where(np.diff(data) != stepsize)[0] + 1)


def encode(x):
    return base64.encodebytes(x.read()).decode()
