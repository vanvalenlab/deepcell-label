"""SQL Alchemy database models."""
from __future__ import absolute_import, division, print_function

import io
import logging
import timeit
from secrets import token_urlsafe

import boto3
import s3fs
from flask_sqlalchemy import SQLAlchemy
import zarr

from deepcell_label.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET

logger = logging.getLogger('models.Project')  # pylint: disable=C0103
db = SQLAlchemy()  # pylint: disable=C0103


class Project(db.Model):
    """Project table definition."""

    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project = db.Column(db.String(12), unique=True, nullable=False, index=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    bucket = db.Column(db.Text, nullable=False)
    key = db.Column(db.Text, nullable=False)

    def __init__(self, loader):
        """
        Args:
            loader: loaders.Loader object
        """
        start = timeit.default_timer()

        # Create a unique 12 character base64 project ID
        while True:
            project = token_urlsafe(9)  # 9 bytes is 12 base64 characters
            if not db.session.query(Project).filter_by(project=project).first():
                self.project = project
                break

        self.bucket = S3_BUCKET
        self.key = f'{self.project}.zarr'

        s3_fs = s3fs.S3FileSystem(anon=False, key=AWS_ACCESS_KEY_ID, secret=AWS_SECRET_ACCESS_KEY)
        s3_store = s3fs.S3Map(root=f'{self.bucket}/{self.key}', s3=s3_fs, check=False)
        zarr_file = loader.zarr
        print(zarr_file.tree())
        # Upload the zarr to s3_store
        zarr.convenience.copy_store(zarr_file.store, s3_store)

        logger.debug(
            'Initialized project %s and uploaded to %s in %ss.',
            self.project,
            self.bucket,
            timeit.default_timer() - start,
        )

    @staticmethod
    def get(project):
        """
        Return the project with the given ID, if it exists.

        Args:
            project (int): unique 12 character base64 string to identify project

        Returns:
            Project: row from the Project table
        """
        start = timeit.default_timer()
        project = db.session.query(Project).filter_by(project=project).first()
        logger.debug('Got project %s in %ss.', project, timeit.default_timer() - start)
        return project

    @staticmethod
    def create(data):
        """
        Create a new project in the Project table.

        Args:
            data: zip file with loaded project data

        Returns:
            Project: new row in the Project table
        """
        start = timeit.default_timer()
        project = Project(data)
        db.session.add(project)
        db.session.commit()
        logger.debug(
            'Created new project %s in %ss.',
            project.project,
            timeit.default_timer() - start,
        )
        return project
