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

## Configuring project size

There is a configurable upper bound to the size of project deepcell-label
supports.
This value is stored in `backend/.platform/nginx/conf.d/proxy.conf` and
can be modified to support larger projects.
Bear in mind however that projects are uploaded/downloaded from s3 buckets,
so beware of increasing this value too much lest the size of the bucket
grows too rapidly!

## Set up Flask backend

Open the subfolder for the backend:

```bash
cd backend
```

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

### Running the backend tests

Make sure to be in the `/deepcell_label` folder inside of the backend:

```bash
cd deepcell-label/backend/deepcell_label
```

Then run the tests using the `-m` flag with pytest:

```bash
python -m pytest .
```

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

## Set up Javascript frontend

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

### Running the frontend tests

Run the Jest tests with:

```bash
yarn test
```

And open the Cypress UI with:

```bash
npx cypress open
```

They can also be run from command line with:

```bash
npx cypress run
```

## Common Issues (Especially on Windows)

- If SQLAlchemy is giving Operational Errors, it could be because the `/tmp` folder does not exist, which will need to be created (e.g. on C: for Windows)
- On Windows, after installing Python requirements, you probably have to run
  ```bash
  pip uninstall python-magic
  pip install python-magic-bin==0.4.14
  ```
