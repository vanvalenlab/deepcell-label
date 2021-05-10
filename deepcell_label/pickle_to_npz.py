"""
Convert PickleType objects into NPZ objects to
significantly reduce their memory footprint in the database.


Unfortunately, because this script will change the underlying data
of the SQLAlchemy schema, the models cannot be used and the queries
must be executed in raw SQL. Once the data is migrated, the models
must be updated to reflect the NPZ Data type.

There are 4 fields that should be updated from Pickle to NPZ:

- RawFrame.frame
- RGBFrame.frame
- LabelFrame.frame
- FrameMemento.frame_array

Each of these belongs to a Project, so this script will query all
finished projects, and update each of the above fields.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import io
import logging
import pickle
import sys

from flask import current_app
from flask.logging import default_handler
import sqlalchemy.types as types
import numpy as np

from deepcell_label import create_app
from deepcell_label import models

# add the models to the system modules for pickle compatibility
# https://stackoverflow.com/a/2121918
sys.modules['models'] = models


def convert_to_npz(data):
    if data is None:
        return None
    bytestream = io.BytesIO()
    np.savez_compressed(bytestream, array=data)
    bytestream.seek(0)
    return bytestream.read()


def initialize_logger():
    """Set up logger format and level"""
    formatter = logging.Formatter(
        '[%(asctime)s]:[%(levelname)s]:[%(name)s]: %(message)s')

    default_handler.setFormatter(formatter)
    default_handler.setLevel(logging.DEBUG)

    wsgi_handler = logging.StreamHandler(
        stream='ext://flask.logging.wsgi_errors_stream')
    wsgi_handler.setFormatter(formatter)
    wsgi_handler.setLevel(logging.DEBUG)

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(default_handler)

    # 3rd party loggers
    logging.getLogger('sqlalchemy').addHandler(logging.DEBUG)
    logging.getLogger('botocore').setLevel(logging.INFO)
    logging.getLogger('urllib3').setLevel(logging.INFO)


def load_pickle_obj(obj):
    if obj is None:
        return None
    return pickle.loads(obj)


def load_npz_from_db(obj):
    if obj is None:
        return None
    bytestream = io.BytesIO(obj)
    bytestream.seek(0)
    array = np.load(bytestream, allow_pickle=True)['array']
    if None in array:
        print('loaded array with None')
        return None
    elif np.array(None).dtype is np.dtype('O'):
        print('loaded object array')
        print(array)
    return array


def _unpickle(obj):
    # Some columns in the test DB unpickle correctly,
    # others seem to already be uncompressed NPZ data.
    try:
        unpickled_obj = load_pickle_obj(obj)
    except pickle.UnpicklingError:
        unpickled_obj = load_npz_from_db(obj)
    return unpickled_obj


def save_as_npz(obj):
    bytestream = io.BytesIO()
    np.savez_compressed(bytestream, array=obj)
    bytestream.seek(0)
    return bytestream.read()


def update_frames(project_id, table):
    """3 tables have the same column that needs to be resaved as npz"""
    def update_frame(data, project_id, frame_id):
        models.db.session.execute(
            'UPDATE %s SET frame = :data WHERE project_id = :pid AND frame_id = :fid' % table,
            {'data': data, 'pid': project_id, 'fid': frame_id}
        )

    schema_map = {
        'rawframes': models.RawFrame,
        'labelframes': models.LabelFrame,
        'rgbframes': models.RGBFrame,
    }

    # Get all raw_frame IDs and data for the associated project
    # Using RawFrame schema to ensure unpickling happens properly
    _cls = schema_map[table]
    # results = models.db.session.query(_cls).filter(_cls.project_id == project_id)
    results = models.db.session.execute(
        'SELECT frame_id, frame FROM %s WHERE project_id = :pid' % table,
        {'pid': project_id}
    )

    for i, row in enumerate(results):
        frame_id = row['frame_id']
        frame = row['frame']

        unpickled_array = _unpickle(frame)
        npz = save_as_npz(unpickled_array)
        update_frame(npz, project_id, frame_id)

        # get the data again to confirm its legit.
        _results = models.db.session.execute(
            'SELECT frame FROM %s WHERE project_id = :pid AND frame_id = :fid' % table,
            {'pid': project_id, 'fid': frame_id}
        )
        for row in _results:  # should only be 1 value
            try:
                loaded_array = load_npz_from_db(row[0])
                np.testing.assert_array_equal(unpickled_array, loaded_array)
                old_length = len(frame) if frame is not None else 0
                new_length = len(row[0]) if row[0] is not None else 0
                print(table, 'row', i, 'size changed from', old_length, 'to', new_length)
            except AssertionError:
                print(
                    '%s: loaded npz is not equal to loaded pickle for '
                    'project %s and frame %s, rolling back!' %
                    (table, project_id, frame_id))
                update_frame(frame, project_id, frame_id)


def update_mementos(project_id):
    # FrameMemento table has a `frame_array` that is also a numpy array
    mementos = models.db.session.execute(
        'SELECT action_id, frame_id, frame_array FROM framemementos '
        'WHERE project_id = :pid',
        {'pid': project_id}
    )
    for i, (action_id, frame_id, frame_array) in enumerate(mementos):
        unpickled_array = _unpickle(frame_array)
        npz = save_as_npz(unpickled_array)
        # get the data again to confirm its legit.
        models.db.session.execute(
            'UPDATE framemementos SET frame_array = :data WHERE '
            'project_id = :pid AND action_id = :aid AND frame_id = :fid',
            {'data': npz, 'pid': project_id, 'aid': action_id, 'fid': frame_id}
        )

        # get the data again to confirm its legit.
        _results = models.db.session.execute(
            'SELECT frame_array FROM framemementos '
            'WHERE project_id = :pid AND '
            'action_id = :aid AND frame_id = :fid',
            {'pid': project_id, 'aid': action_id, 'fid': frame_id}
        )
        for (_result,) in _results:  # should only be 1 value
            try:
                loaded_array = load_npz_from_db(_result)
                np.testing.assert_array_equal(unpickled_array, loaded_array)
                print('framemementos row', i, 'size changed from',
                      len(frame_array), 'to', len(_result))
            except AssertionError:
                print('%s: loaded npz is not equal to loaded pickle for '
                      'project %s and frame %s, rolling back!',
                      'framemementos', project_id, frame_id)

                models.db.session.execute(
                    'UPDATE framemementos SET frame_array = :data WHERE '
                    'project_id = :pid AND action_id = :aid AND frame_id = :fid',
                    {'data': npz, 'pid': project_id, 'aid': action_id, 'fid': frame_id}
                )


# still creating the application to initialize the database connection
application = create_app()  # pylint: disable=C0103


if __name__ == '__main__':
    initialize_logger()
    # get all projects in the database

    # Could use the schema here but due to differing schema
    # on dev/prod databases, just using raw SQL.
    finished_projects = models.db.session.execute(
        'SELECT id FROM projects')

    # for each project, update the associated pickle objects
    for (project_id,) in finished_projects:
        # update `frame` on each of these tables
        update_frames(project_id, table='rawframes')
        update_frames(project_id, table='labelframes')
        update_frames(project_id, table='rgbframes')
        # update `frame_array ` in framemementos table
        update_mementos(project_id)

    models.db.session.commit()
