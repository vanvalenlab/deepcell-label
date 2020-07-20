"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging
import pickle
import timeit

from flask_sqlalchemy import SQLAlchemy


logger = logging.getLogger('models.Project')  # pylint: disable=C0103
db = SQLAlchemy()  # pylint: disable=C0103


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    filename = db.Column(db.Text, nullable=False)
    state = db.Column(db.LargeBinary(length=(2 ** 32) - 1))
    subfolders = db.Column(db.Text, nullable=False)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    updatedAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now(),
                          onupdate=db.func.current_timestamp())
    finished = db.Column(db.TIMESTAMP)
    numUpdates = db.Column(db.Integer, nullable=False, default=0)
    firstUpdate = db.Column(db.TIMESTAMP)
    lastUpdate = db.Column(db.TIMESTAMP)

    def __init__(self, filename, state, subfolders):
        self.filename = filename
        self.state = state
        self.subfolders = subfolders

    @staticmethod
    def get_project_by_id(project_id):
        """Return the project with the given ID, if it exists."""
        start = timeit.default_timer()
        project = Project.query.filter_by(id=project_id).first()
        logger.debug('Got project with ID = "%s" in %ss.',
                     project_id, timeit.default_timer() - start)
        return project

    @staticmethod
    def create_project(filename, state, subfolders):
        """Create a new project."""
        start = timeit.default_timer()
        state_data = pickle.dumps(state, pickle.HIGHEST_PROTOCOL)
        new_project = Project(
            filename=filename,
            state=state_data,
            subfolders=subfolders)
        db.session.add(new_project)
        db.session.commit()
        logger.debug('Created new project with ID = "%s" in %ss.',
                     new_project.id, timeit.default_timer() - start)
        return new_project

    @staticmethod
    def update_project(project, state):
        """Update a project's current state."""
        start = timeit.default_timer()
        if not project.firstUpdate:
            project.firstUpdate = db.func.current_timestamp()

        project.state = pickle.dumps(state, pickle.HIGHEST_PROTOCOL)
        project.numUpdates += 1

        db.session.commit()
        logger.debug('Updated project with ID = "%s" in %ss.',
                     project.id, timeit.default_timer() - start)

    @staticmethod
    def finish_project(project):
        """Complete a project and set the state to null."""
        start = timeit.default_timer()
        project.lastUpdate = project.updatedAt
        project.finished = db.func.current_timestamp()
        project.state = None
        db.session.commit()  # commit the changes
        logger.debug('Finished project with ID = "%s" in %ss.',
                     project.id, timeit.default_timer() - start)
