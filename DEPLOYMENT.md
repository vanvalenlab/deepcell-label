# Deployment

To put DeepCell Label online so it is accessible through a web address like label.deepcell.org, there are several services on AWS and Google Cloud Platform that need to be coordinated, including:

- an S3 bucket hosted static site
- an Elastic Beanstalk instance
- an MySQL database RDS
- a CloudFront distribution
- DNS on Google Cloud Platform

## Host a static site with an S3 bucket

In the Properties tab, scroll to the bottom to find the Static website hosting settings.

- Enable static site hosting.
- Set the Index document to `index.html`
- Set the Error document to `index.html`
  - needed for React Router to serve different pages like /project, /loading, etc. Otherwise, the site raises a 404 error because it cannot find a file named `project` or `loading` in the bucket.

The Static site hosting section will now show a "Bucket website endpoint" where the site is hosted. Take note of this URL for later.

In the Permissions tab,
Set the Bucket policy to

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

Note that you need to change the bucket name at `INSERT_BUCKET_NAME_HERE`.

Build the frontend by running `yarn build` in the frontend folder which generates the static assets in the build folder. Open the build folder and upload all the files to the bucket.

## Host the backend with Elastic Beanstalk

Start by installing the Elastic Beanstalk command line tools following [these instructions](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html). You can check that they are installed by running `eb --version` on the command line.

If using Elastic Beanstalk for the first time in the repository, run `eb init` from the root of the repository to initialize Elastic Beanstalk.

If there is an existing environment, use `eb use ENVIRONMENT_NAME` to use that environment for the current git branch. Each time you switch branches with git, you'll need to set the environment with `eb use`.

Once the EB environment is set, run `eb status` to see the state of the environment. Note the endpoint for the EB instance under CNAME. You can also find this info through the [Elastic Beanstalk page on the AWS Console](https://us-east-2.console.aws.amazon.com/elasticbeanstalk/home).

When you're ready to deploy, run `eb deploy`.

## Create a shared endpoint with CloudFront

Now that both the frontend and backend are online, we need to reach them through a single endpoint with CloudFront on AWS.

## Create a CloudFront distribution

Set the Origin domain to the "Bucket website endpoint" from the S3

### Add two custom origins

two custom origins for

- the flask backend on Elastic Beanstalk
- the S3 bucket hosted static site

All the default settings when setting up the origin are acceptable. You may want to change Response timeout for the backend from 30 seconds to the maximum 60 seconds to support loading large and/or slow downloads.

### Add Behaviors to split traffic between the origins

By adding the S3 hosted static site origin first, the default behavior will be to forward requests to this origin.

To redirect API requests to the backend, add a new behavior with these settings

- Set the Path pattern to `/api/*`
- Set the Origin to the backend on Elastic Beanstalk
- Set Allowed HTTP methods to `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
  - allows sending POST requests that update data
- Set Cache policy to `CacheDisabled`
  - prevents sending stale project data
- Set Origin request policy to `AllViewer`
  - forwards query strings such as the bucket to fetch data from

## Use a custom domain name

We use Google Cloud Platform for our Domain Name System (DNS).

To use a custom domain name for a deployment, such as label.deepcell.org,

- on Cloud DNS on console.cloud.google.com,

  - Add a CNAME record where the data is the URL for the CloudFront endpoint such as `d1234abcd.cloudfront.net.` and the DNS name is `label.deepcell.org.`.

  - Add a CNAME record where the data is `label.deepcell.org.` and DNS name is `www.label.deepcell.org.`.

- on the CloudFront distribution,
  - set the Alternate domain name (CNAME) to `label.deepcell.org`

## Updating the deployment

For future deployments on the same resources, you'll need to

- redeploy the backend with `eb deploy`
  - make sure the database credentials are set before deploying
- rebuild the frontend with `yarn build` in the frontend folder
- reupload the built static assets for the frontend to the S3 bucket
- invalidate the CloudFront cache for `/` and `/index.html` so the updated assets are served

## Appendix: using the AWS RDS database

We have a MySQL database already set up with RDS on AWS. It is shared between deployments, so it's not generally part of deployment, other than providing credentials to the backend to connect to it.

Access the RDS MySQL instance on the command like with

```
mysql --host=deepcell-label-db-1.cbwvcgkyjfot.us-east-2.rds.amazonaws.com --user=deepcelladmin --password -P 3306
```

and interact with commands like the ones on this [MySQL cheat sheet](https://devhints.io/mysql). If you're switching the database that the backend uses (for instance, if the database schema changes dramatically), you'll need to create the new database first on the command with `CREATE DATABASE new-database-name`. The backend will set up the tables once the database exists.

### Switching between deployment and development

While developing, avoid connecting the Flask backend to the production RDS database on AWS to increase performance and to not clutter the database with development activity.

While developing, comment out remote database info in .env and fmd_config.cfg so local databases are used instead of remote databases. This includes

- `SQLALCHEMY_DATABASE_URI` in .env
- `DATABASE` in fmd_config.cfg

Before deploying the backend, uncomment these lines and then recomment them when continuing with development.
