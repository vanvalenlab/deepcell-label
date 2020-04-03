"""Configuration options and environment variables."""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from decouple import config


DEBUG = True
PORT = config('PORT', cast=int, default=5000)

S3_KEY = config('S3_KEY')
S3_SECRET = config('S3_SECRET')

MYSQL_USERNAME = config('MYSQL_USERNAME')
MYSQL_HOSTNAME = config('MYSQL_HOSTNAME')
MYSQL_PORT = config('MYSQL_PORT', cast=int, default=3306)
MYSQL_PASSWORD = config('MYSQL_PASSWORD')
MYSQL_DATABASE = config('MYSQL_DATABASE', default='caliban')

TEMPLATES_AUTO_RELOAD = config('TEMPLATES_AUTO_RELOAD', cast=bool, default=True)
