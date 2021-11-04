# DeepCell Label: Cloud-Based Labeling for Single-Cell Analysis

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=master)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=master)
[![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/vanvalenlab/deepcell-label/blob/master/LICENSE)

DeepCell Label is a web-based tool to visualize and label cells in biological images, and is tailored for cell segmentation. Label works with multiplexed images, 3D image stacks, and time-lapse movies. The tool can label images from scratch, or correct labels from model predictions or existing datasets.

DeepCell Label distributes images and labeling tools through a browser, providing easy access to crowdsource data labeling and to review, correct, and curate labels as a domain expert.

DeepCell Label is built with [React](https://reactjs.org/), [XState](https://xstate.js.org/docs/), and [Flask](https://flask.palletsprojects.com/en/2.0.x/) and [runs locally](#local-use) or [on the cloud](#cloud-deployment) (e.g. with [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)).

Visit [label.deepcell.org](https://label.deepcell.org) and create a project from an example file or upload a .tiff, .png, or .npz. Detailed instructions on how to use the app are in the dropdown instructions tab when working in DeepCell Label.

## Local use

To run DeepCell Label locally, you will set up the client and the server from your computer.

To begin, clone the repository with the following command:

```bash
git clone https://github.com/vanvalenlab/deepcell-label.git
cd deepcell-label
```

### Set up Flask server

The backend is a Flask HTTP API that will store and update project data.

#### Run Python locally

It's recommended to set up a virtual environment with [conda](https://conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html) or [venv](https://docs.python.org/3/library/venv.html).
Install the Python dependencies with:

```bash
pip install -r requirements.txt
```

Then, start the server with:

```bash
flask run
```

When starting the application, Flask will create the database and tables if they do not exist. By default, the app makes a database in `/tmp` and erases on restart. To make a persistent database, change `SQLALCHEMY_DATABASE_URI` in `.env` to create the database in another folder like `SQLALCHEMY_DATABASE_URI=sqlite:///~/Documents/deepcell_label.db`.

#### Run with Docker

The backend can also be containerized with [Docker](https://www.docker.com). To build a production-ready Docker image:

```bash
docker build -t vanvalenlab/deepcell-label:$USER
```

The built image can be used to run the backend on port 5000 with:

```bash
docker run -p 5000:5000 -it vanvalenlab/deepcell-label:$USER
```

The `SQLALCHEMY_DATABASE_URI` can be passed to the run command using the [environment variable flags](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file): `-e` and `--env`.

### Set up React client

Once the server is running, we need to set up the frontend to interact with it. Install the dependencies for the frontend with:

```bash
cd visualizer
yarn
```

Then, start the frontend with:

```bash
yarn start
```

Visit [localhost:3000](http://localhost:3000) to see the DeepCell Label homepage.
