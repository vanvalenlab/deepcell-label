"""Classes to export a DeepCell Label project as a .npz or .trk file."""
import boto3
import io
import pathlib
import tempfile
import tarfile
import json
from urllib.parse import urlparse

import numpy as np

from deepcell_label.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY


class Exporter():
    """
    Interface to export work from a DeepCell Label project.
    """

    def __init__(self, project, format):
        self.project = project
        self.format = '.' + format.lower().strip('.')
        self.path = self.format_path()

    def format_path(self):
        """
        Converts the path to have a valid extension and
        adds the Project's token to create a unique filename.
        """
        path = urlparse(self.project.path).path
        path = path.strip('/')
        path = pathlib.Path(path).with_suffix(self.format)
        return str(path)

    def export(self):
        """
        Exports an image stack from a DeepCell Label project,
        including raw image stack, labeled image stack, and optional label metadata dicts.
        """
        _export = self.get_export()
        filestream = _export()
        return filestream

    def get_export(self):
        """
        Returns:
            function: exports a DeepCell Label project into a BytesIO buffer
        """
        if self.format == '.npz':
            _export = self.export_npz
        elif self.format == '.trk':
            _export = self.export_trk
        else:
            raise ValueError('Invalid format: {}. Select from .npz or .trk'.format(self.format))
        return _export

    def export_npz(self):
        """
        Creates a npz file based on the image stacks edited in a DeepCell Label project.

        Args:
            project (deepcell_label.models.Project):
                DeepCell Label project containing image data to save

        Returns:
            BytesIO: data buffer containing .npz data
        """
        # save file to BytesIO object
        store_npz = io.BytesIO()
        # X and y are array names by convention
        np.savez(store_npz, X=self.project.raw_array, y=self.project.label_array)
        store_npz.seek(0)
        return store_npz

    def export_trk(self):
        # clear any empty tracks before saving file
        tracks = self.project.labels.cell_info[0]
        empty_tracks = []
        for key in tracks:
            if not tracks[key]['frames']:
                empty_tracks.append(tracks[key]['label'])
        for track in empty_tracks:
            del tracks[track]

        # Save image data to create file object in memory
        trk_file_obj = io.BytesIO()
        with tarfile.open(fileobj=trk_file_obj, mode='w') as trks:
            with tempfile.NamedTemporaryFile('w') as lineage_file:
                json.dump(tracks, lineage_file, indent=1)
                lineage_file.flush()
                trks.add(lineage_file.name, 'lineage.json')

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, self.project.raw_array)
                raw_file.flush()
                trks.add(raw_file.name, 'raw.npy')

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, self.project.label_array)
                tracked_file.flush()
                trks.add(tracked_file.name, 'tracked.npy')

        trk_file_obj.seek(0)
        return trk_file_obj


class S3Exporter(Exporter):
    """
    Implementation of Exporter interface to upload files to S3 buckets.
    """

    def export(self, bucket):
        filestream = super().export()
        # store npz file object in bucket/path
        s3 = self._get_s3_client()
        s3.upload_fileobj(filestream, bucket, self.path)
        return filestream

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
