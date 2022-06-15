# Deployment

## Host a static site with an S3 bucket

## Host the backend with Elastic Beanstalk

## Create a shared endpoint with CloudFront

d12345abcde.cloudfront.net

### Add two custom origins

two custom origins for

- the flask backend on Elastic Beanstalk
- the S3 bucket hosted static site

All the default settings when setting up the origin are acceptable. You may want to change Response timeout for the backend from 30 seconds to the maximum 60 seconds to support loading large and/or slow downloads.

### Add Behaviors to split traffic between the origins

The default behavior should be to

Add a new rule to direct requests starting with /api to the backend.

Set Allowed HTTP methods to GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Set Cache policy to CacheDisab

## Use a custom domain name

## Switching from deployment to development

Comment out remote database info in .env and fmd_config.cfg so local databases are used instead of remote databases

- SQLALCHEMY_DATABASE_URI in .env
- DATABASE in fmd_config.cfg
