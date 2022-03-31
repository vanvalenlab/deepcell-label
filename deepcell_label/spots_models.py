"""SQL Alchemy database models."""
from __future__ import absolute_import, division, print_function

import io
import logging
import timeit
from secrets import token_urlsafe

import boto3
from flask_sqlalchemy import SQLAlchemy

from deepcell_label.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

logger = logging.getLogger('models.Project')  # pylint: disable=C0103
db = SQLAlchemy()  # pylint: disable=C0103


class Project(db.Model):
    """Project table definition."""

    # pylint: disable=E1101
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project = db.Column(db.String(12), unique=True, nullable=False, index=True)
    createdAt = db.Column(db.TIMESTAMP, nullable=False, default=db.func.now())
    url = db.Column(db.Text, nullable=False)
    parent = db.Column(db.Integer, db.ForeignKey('projects.id'))

    def __init__(self, data):
        """
        Args:
            data (BytesIO): zip file with loaded project data
            parent (string): public token for existing project
        """
        start = timeit.default_timer()

        # Create a unique 12 character base64 project ID
        while True:
            project = token_urlsafe(9)  # 9 bytes is 12 base64 characters
            if not db.session.query(Project).filter_by(project=project).first():
                self.project = project
                break

        # Upload to s3
        s3 = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
        bucket = 'spots-visualizer'
        path = f'{self.project}.zip'
        s3.upload_fileobj(io.BytesIO(data), bucket, path)
        self.url = f'https://s3.amazonaws.com/{bucket}/{path}'

        logger.debug(
            'Initialized project %s and uploaded to %s in %ss.',
            self.project,
            self.url,
            timeit.default_timer() - start,
        )
