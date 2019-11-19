import os
import sys


UPLOAD_FOLDER           =  os.path.join(os.getcwd(), "uploads")

S3_KEY 					= os.environ.get("S3_ACCESS_KEY")
S3_SECRET 				= os.environ.get("S3_SECRET_ACCESS_KEY")

DEBUG 					= True
PORT 					= 5000
