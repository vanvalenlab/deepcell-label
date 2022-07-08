# Deployment

Deploying DeepCell Label at a web address like label.deepcell.org uses several services on AWS and Google Cloud Platform, including

- an [S3 bucket hosted static site](#host-a-static-site-with-an-s3-bucket) for the frontend assets
- an [Elastic Beanstalk instance](#host-the-backend-with-elastic-beanstalk) for the backend
- a [CloudFront distribution](#create-a-shared-endpoint-with-cloudfront)
- a [custom domain name](#use-a-custom-domain-name)
- an [MySQL database](#appendix-using-the-aws-rds-database)

This guide walkthrough how to create, configure, and coordinates these services to complete a deployment. Unless otherwise specified, use the default settings for each service.

## Host a static site with an S3 bucket

Create a new S3 bucket with the [AWS console](https://s3.console.aws.amazon.com/s3/buckets) and uncheck "Block all public access".

In the Properties tab of the bucket, scroll to the bottom to find the Static website hosting settings.

- Enable static site hosting.
- Set the Index document to `index.html`
- Set the Error document to `index.html`
  - needed for React Router to serve different pages like /project, /loading, etc. Otherwise, the site raises a 404 error because it cannot find a file named `project` or `loading` in the bucket.

The Static site hosting section will now show a "Bucket website endpoint" with a URL for the site. Make a note of this URL to use with CloudFront.

In the Permissions tab,
set the Bucket policy to

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::INSERT_BUCKET_NAME_HERE/*"
        }
    ]
}
```

Note that you need to update the bucket name at `INSERT_BUCKET_NAME_HERE`.

Build the frontend by running

- `cd frontend` to open the frontend folder
- `yarn` to install or update the dependencies
- `yarn build` to generate the static assets

Open the `frontend/build` folder and upload all the files to the S3 bucket.

## Host the backend with Elastic Beanstalk

Loading and editing data with DeepCell Label happens with a Flask application hosted on Elastic Beanstalk.

Install the Elastic Beanstalk command line tools following [these instructions](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html). You can check that they are installed by running `eb --version` on the command line.

If using Elastic Beanstalk for the first time in the repository, run `eb init` from the `backend` folder of the repository to initialize Elastic Beanstalk.

- Select region 14 to use the existing application for deepcell label
- Select the `caliban-test-with-db` application
- Decline CodeCommit

use `eb create`. creating an Elastic Beanstalk environment for the first time,

- Select load balancer type 2: application
- Decline spot fleet requests

To use existing environment, run `eb use ENVIRONMENT_NAME` to set the environment for the current git branch. Each time you switch git branches, make sure to set the environment with `eb use`.

Once the environment is set, run `eb status`. Look for CNAME to see the instance's endpoint URL. You can also find this URL on the [AWS Console](https://us-east-2.console.aws.amazon.com/elasticbeanstalk/home). Make a note of this URL to use with CloudFront.

Before deploying the instance, confirm that you have set the following values in the `.env` file:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET` - this is the bucket where you will store files uploaded to DCL
- `SQLALCHEMY_DATABASE_URI`

When you're ready to deploy, run `eb deploy`.

## Create a shared endpoint with CloudFront

Now that both the frontend and backend are online, we need to reach them through a single endpoint with CloudFront on AWS.

### Create a CloudFront distribution for the S3 bucket

On the [CloudFront AWS Console](https://us-east-1.console.aws.amazon.com/cloudfront/v3/home), create a distribution.
Set the Origin domain to the "Bucket website endpoint" URL from the S3 static site.

### Add a second origin for Elastic Beanstalk

Under the Origins tab for the distribution, create an origin where the Origin domain is the URL for the Elastic Beanstalk instance. You may want to change Response timeout for the backend from 30 seconds to the maximum 60 seconds to support loading large and/or slow downloads.

### Add a behaviors to redirect API requests to Elastic

By adding the S3 hosted static site origin first, the default behavior will be to forward requests to this origin. We'll add a behavior to to forward API requests to the backend.

Under the Behaviors tab, create a behavior, then

- Set the Path pattern to `/api/*`
- Set the Origin to the backend on Elastic Beanstalk
- Set Allowed HTTP methods to `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
  - allows sending POST requests that update data
- Set Cache policy to `CacheDisabled`
  - prevents sending stale project data
- Set Origin request policy to `AllViewer`
  - forwards query strings such as the bucket to fetch data from

## Use a custom domain name

The application is now online at the domain name generated by CloudFront. Follow these steps to use a custom domain name for a deployment, such as label.deepcell.org.

- on Cloud DNS on [console.cloud.google.com](console.cloud.google.com)

  - Add a CNAME record where the data is the URL for the CloudFront endpoint and the DNS name is `label.deepcell.org.`.

  - Add a CNAME record where the data is `label.deepcell.org.` and DNS name is `www.label.deepcell.org.`.

- on the CloudFront distribution
  - Set the Alternate domain name (CNAME) to `label.deepcell.org`
  - Set the Custom SSL certificate to `*.deepcell.org`, or your own certificate for the domain name to use

## Updating the deployment

- Redeploy the backend with `eb deploy` in the backend folder
  - Make sure the database credentials are set before deploying
- Rebuild the frontend with `yarn build` in the frontend folder
- Reupload the compiled frontend static assets to the S3 bucket
- Invalidate the CloudFront cache for `/` and `/index.html` so the updated assets are served

## Appendix: using the AWS RDS database

A MySQL database is set up with RDS on AWS. It's not part of the deployment process, other than providing credentials to the backend to connect to it.

In case the database requires changes, access it on the command like with

```
mysql --host=$HOST --user=$USERNAME --password -P $PORT
```

and modify it with commands such as these: [MySQL cheat sheet](https://devhints.io/mysql). Make sure to set the HOST, USERNAME, and PORT for the command. If you're switching the database that the backend uses (for instance, when the database schema changes dramatically), connect to the MySQL instance and create the new database with `CREATE DATABASE new-database-name`. The Flask backend sets up tables once it connects to the new database.

### Switching between deployment and development

While developing, avoid connecting the Flask backend to the production RDS database on AWS to increase performance and to not clutter the database with development activity.

While developing, comment out remote database info in .env and fmd_config.cfg so local databases are used instead of remote databases. This includes

- `SQLALCHEMY_DATABASE_URI` in .env
- `DATABASE` in fmd_config.cfg

Before deploying the backend, uncomment these lines and then recomment them when continuing with development.
