import os
import sys

from decouple import config

# UPLOAD_FOLDER           =  os.path.join(os.getcwd(), "uploads")

DEBUG 					= True
PORT 					= 5000

S3_KEY = config('S3_KEY')
S3_SECRET = config('S3_SECRET')

MYSQL_USERNAME = config('MYSQL_USERNAME')
MYSQL_HOSTNAME = config('MYSQL_HOSTNAME')
MYSQL_PORT = config('MYSQL_PORT', cast = int, default = 3306)
MYSQL_PASSWORD = config('MYSQL_PASSWORD')
MYSQL_DATABASE = config('MYSQL_DATABASE', default = 'caliban')
