"""Configuration options and environment variables."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from decouple import config


DEBUG = config('DEBUG', cast=bool, default=True)
PORT = config('PORT', cast=int, default=5000)

AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')

TEMPLATES_AUTO_RELOAD = config('TEMPLATES_AUTO_RELOAD', cast=bool, default=True)

# SQLAlchemy settings
SQLALCHEMY_TRACK_MODIFICATIONS = config('SQLALCHEMY_TRACK_MODIFICATIONS',
                                        cast=bool, default=False)

SQLALCHEMY_DATABASE_URI = config('SQLALCHEMY_DATABASE_URI',
                                 default='sqlite:////tmp/caliban.db')

# Compression settings
COMPRESS_MIMETYPES = ['text/html', 'text/css', 'text/xml',
                      'application/json', 'application/javascript']
COMPRESS_LEVEL = 6
COMPRESS_MIN_SIZE = 500
COMPRESS_ALGORITHM = 'gzip'
