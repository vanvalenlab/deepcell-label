# DeepCell Label: Cloud-Based Labeling for Single-Cell Analysis

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=master)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=master)

Label is effective for crowdsourced data labeling, as it distributes images and the tools to label them through a browser.

Label is targeted toward cell segmentation, and flexibly displays bioimages so that single cells can be labels. The application works multiplexed images from , 3D images, and timelapse movies, and can label images from scratch or review and correct labels from model predictions or existing datasets.

DeepCell Label is built with [React](https://reactjs.org/), [XState](https://xstate.js.org/docs/), and [Flask](https://flask.palletsprojects.com/en/2.0.x/) and can be used locally or deployed on the cloud (e.g. with [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)).

Visit [label.deepcell.org](https://label.deepcell.org) and create a project from one of our example files or from your own .tiff, .png, or .npz. Detailed instructions about the user interface are available in the dropdown instructions on the

## Architecture

## Local use

Clone the repository

```
git clone https://github.com/vanvalenlab/deepcell-label.git
```

You use [AWS Identity and Access Management (IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/) to manage permissions.

### Set up Flask backend

Install the Python dependencies

```
pip install -r requirements.txt
```

Start the
runs the Flask backend on

Note that by default the database is made in `/tmp` and is erased on restart. To keep a persistent database, change `SQLALCHEMY_DATABASE_URI` in `.env` to another value like `sqlite:///~/Documents/deepcell_label.db`.

```
flask run
```

```
cd visualizer
yarn
yarn start
```

runs a lo

## Cloud deployment

DeepCell Label can be deployed on the web, as we have done with [label.deepcell.org](https://label.deepcell.org). Here, we'll walk you through our deploymenet process on AWS, but your own servers or any other cloud provider will also work.

Before we begin, install the AWS Command Line Interface from [aws.amazon.com/cli](https://aws.amazon.com/cli/). You can instead use the AWS Management Console if you'd prefer not to use the command line.

Deploying on AWS has three major steps:

- create an S3-hosted static site to serve the frontend
- create an AWS Elastic Beanstalk to host the backend
- create a CloudFront distribution to access both the frontend and the backend

### React frontend on S3 Static Site hosting

From the `visualizer` directory, build the frontend assets with [yarn](https://yarnpkg.com/en/docs/install) and [yarn run build](https://yarnpkg.com/en/docs/cli/yarn-run-build).

### Flask backend on AWS Elastic Beanstalk

To set up a new Elastic Beanstalk instance, `eb create env-name` to create a new Elastic Beanstalk environment.

To update the environment, `eb deploy` to deploy the latest version of the code.

#### Database

The Flask backend uses SQLAlchemy to connect to a database on [Amazon Relational Database Service](https://aws.amazon.com/rds/).

The specific instance used for [label.deepcell.org](https://label.deepcell.org) is a MySQL db.m5.xlarge instance with 200 GiB of storage. The database is created with the following command:

```
create-db-instance
--db-instance-identifier deepcell-label-db-1
--allocated-storage 200
--db-instance-class db.m5.xlarge
--engine mysql
```

Before deploying, make sure to update the `.env` file with the correct `SQLALCHEMY_DATABASE_URI` to point to the remote database on RDS.
For example, for the `deepcell_label` database on RDS, we set

```
SQLALCHEMY_DATABASE_URI=mysql://username:password@deepcell-label-db-1.cbwvcgkyjfot.us-east-2.rds.amazonaws.com/deepcell_label
```

Comment out this line to use the default SQLite database for local development.

#### Flask Monitoring Dashboard

The backend uses [Flask Monitoring Dashboard](https://flask-monitoringdashboard.readthedocs.io/en/latest/).) to monitor its usage and performance. Access dashboard through `label.deepcell.org/dashboard` with the credentials defined in `fmd_config.cfg`.

When deploying a new version of the backend to Elastic Beanstalk, make sure `DATABASE` in `fmd_config.cfg` is set to the remote database on RDS, like

```
DATABASE=mysql://username:password@deepcell-label-db-1.cbwvcgkyjfot.us-east-2.rds.amazonaws.com/fmd
```

Comment out this line if you don't want to use the remote database, like for local development.

### Cloudfront

Once both the frontend and backend are deployed, create a CloudFront distribution to access them from a single domain.

- create two origins for the frontend and backend
- define behaviors to direct traffic to the appropriate origin and cache the results appropriately
- create a distribution with the above origins and behaviors

If using an alternate domain name, use the `--domain-name` option to specify it.

When updating the frontend, make sure to invalidate the cached `/` and `/index.html` URL in the CloudFront distribution. Other assets will have a different file name and do not need to be invalidated.
