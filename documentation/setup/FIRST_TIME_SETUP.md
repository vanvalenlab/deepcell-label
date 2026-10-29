# First Time Setup Guide

This instructions install Python and Node on your machine. If you've worked with Python or Javascript projects on your machine, skip this instructions and proceed with the README. DeepCell Label has been developed for Unix based systems, but it should work on Windows as well. You may need to install python-magic-bin in your Python environment if working on Windows.

## Set up Python

The DeepCell Label backend runs on Python. You can check if Python is installed by running:

```bash
python --version
```

If the command fails, install Python with Anaconda by following the installation instructions here: https://docs.anaconda.com/anaconda/install/index.html

### Create a Python virtual environment

We recommend installing Python dependencies in a virtual environment to isolate the project from the rest of your machine. Create a virtual environment named `deepcell-label-env` with this command: `python -m venv deepcell-label-env`.

Then activate the virtual environment with the activate script in the `deepcell-label/Scripts` or `deepcell-label/bin` folder.

Now when you run `pip install -r requirements.txt`, all the dependencies will be installed in the virtual environment.

You can deactivate the virtual environment with: `deactivate`.

Read more about virtual environments with `venv` here: https://docs.python.org/3/tutorial/venv.html.

## Setup Node.js (Javascript)

As DeepCell Label is a web application, the frontend is written in JavaScript. We'll install Node.js, a server-side Javascript platform, and Yarn, a Javascript package manager.

<!-- adapted from https://gist.github.com/Igormandello/57d57ee9a9f32a5414009cbe191db432 -->

### Node

- #### Node installation on macOS

  Go to [official Node.js website](https://nodejs.org/) and download the installer for the LTS version of Node.js that is recommended for most users.
  Be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm with apt install. Run the following commands.

      $ sudo apt install nodejs
      $ sudo apt install npm

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version
    v16.14.0

    $ npm --version
    8.5.0

You can update `npm` using `npm` itself. Run the following command, then reopen the command line.

    $ npm install npm -g

### Install Yarn

After installing node, we need to install yarn too with the following command.

      $ npm install -g yarn

With this setup, you are ready to install all dependencies and run the application. Return to the README and follow the instructions there.
