"""Configuration options and environment variables."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from decouple import config


DEBUG = True
PORT = config('PORT', cast=int, default=5000)

S3_KEY = config('S3_KEY')
S3_SECRET = config('S3_SECRET')

TEMPLATES_AUTO_RELOAD = config('TEMPLATES_AUTO_RELOAD', cast=bool, default=True)

SQLALCHEMY_TRACK_MODIFICATIONS = config('SQLALCHEMY_TRACK_MODIFICATIONS',
                                        cast=bool, default=False)

SQLALCHEMY_DATABASE_URI = config('SQLALCHEMY_DATABASE_URI',
                                 default='sqlite:////tmp/caliban.db')
