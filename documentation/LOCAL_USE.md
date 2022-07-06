# Local use

To run DeepCell Label locally, you will set up the client and the server from your computer. If you haven't worked with Python or Javascript projects before, follow the [first time setup instructions](FIRST_TIME_SETUP.md) to install Python and Node.js.

To start, clone the repository with:

```bash
git clone https://github.com/vanvalenlab/deepcell-label.git
```

and open the repository with:

```bash
cd deepcell-label
```

## Set up Flask server

Set up a virtual environment with [conda](https://conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html) or [venv](https://docs.python.org/3/library/venv.html).
After setting up and activating the virtual environment, install the Python dependencies with:

```bash
pip install -r requirements.txt
pip install -r requirements-test.txt
```

Flask requires some environment variables to be set, like [FLASK_APP](https://flask.palletsprojects.com/en/2.0.x/cli/). We need to set `export FLASK_APP=application` in the terminal or in an `.env` file. There is an example `.env.example` with FLASK_APP already set. Make a copy and rename the file `.env`. Then, start the server with:

```bash
flask run
```

By default, DeepCell Label creates a temporary database in `/tmp`. Change `SQLALCHEMY_DATABASE_URI` in your `.env`, for example `SQLALCHEMY_DATABASE_URI=sqlite:///~/Documents/deepcell_label.db`, to make a persistent database in another location.

### Run with Docker

The backend can also be containerized with [Docker](https://www.docker.com). To build a production-ready Docker image, run:

```bash
docker build -t vanvalenlab/deepcell-label:$USER
```

The built image can run the backend on port 5000 with:

```bash
docker run -p 5000:5000 -it vanvalenlab/deepcell-label:$USER
```

Envrionment variables like `SQLALCHEMY_DATABASE_URI` can be passed to the run command using the [environment variable flags](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file): `-e` and `--env`.

## Set up React client

Once the server is running, we need to set up the frontend. Install the dependencies for the frontend with:

```bash
cd frontend
yarn
```

Then, start the frontend with:

```bash
yarn start
```

Visit [localhost:3000](http://localhost:3000) to see the DeepCell Label homepage.
