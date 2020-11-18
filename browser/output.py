import boto3

from config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_OUTPUT_BUCKET


class CalibanOutput():
    """
    Interface for exporting work from a Caliban session.
    """

    def save():
        """
        Exports an image stack from a Caliban project, 
        including raw images, labeled images, and optional label metadata.
        """

    
    def get_save(filename):
            """
        Returns:
            function: exports a Caliban project into a BytesIO buffer
        """
        if is_npz_file(filename):
            _save = save_npz
        elif is_trk_file(filename):
            _save = save_trks
        else:
            raise ValueError('Cannot save file: {}'.format(filename))
        return _save

        def save_npz(project):
        """
        Creates a npz file based on the image stacks edited in a Caliban project.

        Args:
            project (models.Project): Caliban project containing image data to save

        Returns:
            BytesIO: data buffer containing .npz data
        """
        # save file to BytesIO object
        store_npz = io.BytesIO()

        # X and y are array names by convention
        np.savez(store_npz, X=project.raw_array, y=project.label_array)
        store_npz.seek(0)

        return store_npz

    def save_trk(project):
        # clear any empty tracks before saving file
        tracks = project.labels.cell_info
        empty_tracks = []
        for key in tracks:
            if not tracks[key]['frames']:
                empty_tracks.append(tracks[key]['label'])
        for track in empty_tracks:
            del tracks[track]

        # Save image dat to create file object in memory
        trk_file_obj = io.BytesIO()
        with tarfile.open(fileobj=trk_file_obj, mode='w') as trks:
            with tempfile.NamedTemporaryFile('w') as lineage_file:
                json.dump(tracks, lineage_file, indent=1)
                lineage_file.flush()
                trks.add(lineage_file.name, 'lineage.json')

            with tempfile.NamedTemporaryFile() as raw_file:
                np.save(raw_file, project.raw_array)
                raw_file.flush()
                trks.add(raw_file.name, 'raw.npy')

            with tempfile.NamedTemporaryFile() as tracked_file:
                np.save(tracked_file, project.label_array)
                tracked_file.flush()
                trks.add(tracked_file.name, 'tracked.npy')

        trk_file_obj.seek(0)
        return trk_file_obj


class S3Output():
    """
    Implementation of FileLoader interface for loading files from S3 buckets.
    """

    def upload(self, project):
        
        _save = get_save(self.filename)
        bytes_io = _save(project)
        
        # store npz file object in bucket/path
        s3 = self.project._get_s3_client()
        s3.upload_fileobj(bytes_io, self.output_bucket, self.path)

    def _get_s3_client(self):
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )



class LocalFileSystemOutput():

class BrowserOutput():
    """
    Exports Caliban project as as an
    """




