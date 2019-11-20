import os
import sys


UPLOAD_FOLDER           =  os.path.join(os.getcwd(), "uploads")

S3_KEY 					= os.environ.get("S3_ACCESS_KEY")
S3_SECRET 				= os.environ.get("S3_SECRET_ACCESS_KEY")

DEBUG 					= True
PORT 					= 5000


MYSQL_USERNAME = os.getenv('MYSQL_USERNAME')
MYSQL_HOSTNAME = os.getenv('MYSQL_HOSTNAME')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', '3306'))
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'caliban')
