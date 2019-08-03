import boto3, botocore
from config import S3_KEY, S3_SECRET, S3_BUCKET

ALLOWED_EXTENSIONS = set(['txt', 'md', 'markdown', 'pdf', 'png', 'jpg', 'jpeg', 'gif'])

def allowed_file(name):
    return "." in name and name.split(".")[1].lower() in ALLOWED_EXTENSIONS

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