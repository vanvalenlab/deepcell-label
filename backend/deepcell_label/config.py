"""Configuration options and environment variables."""
from __future__ import absolute_import, division, print_function

import platform

from decouple import config

DEBUG = config('DEBUG', cast=bool, default=True)
PORT = config('PORT', cast=int, default=5000)

AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
S3_BUCKET = config('S3_BUCKET', default='deepcell-label-input')

TEMPLATES_AUTO_RELOAD = config('TEMPLATES_AUTO_RELOAD', cast=bool, default=True)

# SQLAlchemy settings
SQLALCHEMY_TRACK_MODIFICATIONS = config(
    'SQLALCHEMY_TRACK_MODIFICATIONS', cast=bool, default=False
)

SQLALCHEMY_DATABASE_URI = config(
    'SQLALCHEMY_DATABASE_URI', default='sqlite:////tmp/deepcell_label.db'
)

# Flask monitoring dashboard
# When empty, disables the dashboard
DASHBOARD_CONFIG = config('DASHBOARD_CONFIG', default='')

# Flask-Dropzone
DROPZONE_MAX_FILE_SIZE = config('DROPZONE_MAX_FILE_SIZE', default=128)  # measured in MB
DROPZONE_TIMEOUT = config('DROPZONE_TIMEOUT', default=60 * 1000)  # measured in ms

# Compression settings
COMPRESS_MIMETYPES = [
    'text/html',
    'text/css',
    'text/xml',
    'application/json',
    'application/javascript',
]
COMPRESS_LEVEL = 6
COMPRESS_MIN_SIZE = 500
COMPRESS_ALGORITHM = 'gzip'

# Flag for checking operating system
DELETE_TEMP = platform.system() != 'Windows'
