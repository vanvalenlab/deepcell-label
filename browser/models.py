"""SQL Alchemy database models."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import pickle

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()  # pylint: disable=C0103


class Project(db.Model):
    """Project table definition."""
    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    filename = db.Column(db.String, nullable=False)
    state = db.Column(db.LargeBinary(length=(2 ** 32) - 1))
    subfolders = db.Column(db.String, nullable=False)
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
        return Project.query.filter_by(id=project_id).first()

    @staticmethod
    def create_project(filename, state, subfolders):
        """Create a new project."""
        state_data = pickle.dumps(state, pickle.HIGHEST_PROTOCOL)
        new_project = Project(
            filename=filename,
            state=state_data,
            subfolders=subfolders)
        db.session.add(new_project)
        db.session.commit()
        return new_project

    @staticmethod
    def update_project(project, state):
        """Update a project's current state."""
        if not project.firstUpdate:
            project.firstUpdate = db.func.current_timestamp()

        project.state = pickle.dumps(state, pickle.HIGHEST_PROTOCOL)
        project.numUpdates += 1

        db.session.commit()

    @staticmethod
    def finish_project(project):
        """Complete a project and set the state to null."""
        project.lastUpdate = project.updatedAt
        project.finished = db.func.current_timestamp()
        project.state = None
        db.session.commit()  # commit the changes
