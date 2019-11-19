import os

import boto3

from config import S3_KEY, S3_SECRET, S3_BUCKET


ALLOWED_EXTENSIONS = set([
    '.txt', '.md', '.markdown', '.pdf',
    '.png', '.jpg', '.jpeg', '.gif',
])


def allowed_file(name):
    return os.path.splitext(str(name).lower())[-1] in ALLOWED_EXTENSIONS


def is_trk_file(name):
    '''Determines if a given file is a trk or trks file.

    Args:
        name (str): potential trk or trks filename.

    Returns:
        bool: True if the file is trk or trks, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in {'.trk', '.trks'}


def is_npz_file(name):
    '''Determines if a given file is a npz file.

    Args:
        name (str): potential npz filename.

    Returns:
        bool: True if the file is npz, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in {'.npz'}


# Connect to the s3 service
s3 = boto3.client(
    "s3",
    aws_access_key_id=S3_KEY,
    aws_secret_access_key=S3_SECRET
)

def upload_file_to_s3(file, bucket_name, acl="public-read"):

    """
    Docs: http://boto3.readthedocs.io/en/latest/guide/s3.html
    """

    try:

        s3.upload_fileobj(
            file,
            bucket_name,
            file.filename,
            ExtraArgs={
                "ACL": acl,
                "ContentType": file.content_type
            }
        )

    except Exception as e:
        print("Something Happened: ", e)
        return e

    return "{}{}".format(S3_BUCKET, file.filename)