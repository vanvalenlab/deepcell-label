# DeepCell Label: Cloud-Based Labeling for Single-Cell Analysis

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=master)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=master)
[![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/vanvalenlab/deepcell-label/blob/master/LICENSE)

DeepCell Label is a web-based tool to flexibly visualize and label cells in biological images, and is tailored for cell segmentation. Label works with multiplexed images, 3D image stacks, and time-lapse movies. The tool can label images from scratch, or review and correct labels from model predictions or existing datasets.

DeepCell Label distributes images and labeling tools through a browser, providing easy access to crowdsource data labeling and to review, correct, and curate labels as a domain expert.

DeepCell Label is built with [React](https://reactjs.org/), [XState](https://xstate.js.org/docs/), and [Flask](https://flask.palletsprojects.com/en/2.0.x/) and [runs locally](#local-use) or [on the cloud](#cloud-deployment) (e.g. with [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)).

Visit [label.deepcell.org](https://label.deepcell.org) and create a project from one of our example files or from your own .tiff, .png, or .npz files. Detailed instructions are available in the dropdown instructions tab when working in DeepCell Label.

## Local use

To run DeepCell Label locally, you will set up the client and the server from your computer.

To begin, clone the repository with the following command:

```
git clone https://github.com/vanvalenlab/deepcell-label.git
cd deepcell-label
```

### Set up Flask server

The backend will store and update project data.

Install the Python dependencies with:

```
pip install -r requirements.txt
```

Then, start the server with:

```
flask run
```

When starting the application, Flask will create the database and tables if they do not exist. By default, the app makes a database in `/tmp` and erases on restart. To make a persistent database, change `SQLALCHEMY_DATABASE_URI` in `.env` to create the database in another folder like `SQLALCHEMY_DATABASE_URI=sqlite:///~/Documents/deepcell_label.db`.

### Set up React client

Once the server is running, we need to set up the frontend to interact with it. Install the dependencies for the frontend with:

```
cd visualizer
yarn
```

Then, start the frontend with:

```
yarn start
```

Visit [localhost:3000](http://localhost:3000) to see the DeepCell Label homepage.

## Cloud deployment

For longer term use, deploy DeepCell Label on the cloud. For example, [label.deepcell.org](https://label.deepcell.org) is deployed on AWS. We'll walk you through our deployment process on AWS, but any cloud provider or your own servers will work.

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

The specific instance used for [label.deepcell.org](https://label.deepcell.org) is a MySQL db.m5.xlarge instance with 200 GiB of storage.

Before deploying, make sure to update the `.env` file with the correct `SQLALCHEMY_DATABASE_URI` to point to the remote database on RDS.
For example, for the `deepcell_label` database on RDS, change this line in `.env` to:

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

When updating the frontend, make sure to invalidate the cached `/` and `/index.html` URL in the CloudFront distribution. Other assets will have a different file name and do not need to be invalidated.
