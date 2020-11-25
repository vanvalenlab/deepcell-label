import boto3
import io
import pathlib
import tempfile
import tarfile
import json

import numpy as np

from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_OUTPUT_BUCKET
from helpers import is_track_file, is_zstack_file


class Exporter():
    """
    Interface to export work from a DeepCell Label project.
    """

    def __init__(self, project):
        self.project = project
        self.path = self.format_path()

    def format_path(self):
        """
        Converts the path to have a valid extension and
        adds the Project's token to create a unique filename.
        """
        path = pathlib.Path(self.project.path)
        if is_zstack_file(path):
            path = path.with_suffix('.npz')
        elif is_track_file(path):
            path = path.with_suffix('.trk')
        path = path.with_name(path.stem + '_' + self.project.token + path.suffix)
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
        if is_zstack_file(self.path):
            _export = self.export_npz
        elif is_track_file(self.path):
            _export = self.export_trk
        else:
            raise ValueError('Cannot export file: {}'.format(self.path))
        return _export

    def export_npz(self):
        """
        Creates a npz file based on the image stacks edited in a DeepCell Label project.

        Args:
            project (models.Project): DeepCell Label project containing image data to save

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

    def __init__(self, project):
        super().__init__(project)

    def export(self, bucket=S3_OUTPUT_BUCKET):
        _export = self.get_export()
        filestream = _export()
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


class LocalFileSystemExporter(Exporter):
    """
    Implementation of Exporter interface to download Project files to the local file system.
    """
    pass


class BrowserExporter(Exporter):
    """
    Implementation of Exporter interface to download Project files through the browser.
    """

    def export(self):
        _export = self.get_export()
        filestream = _export()
        return filestream
