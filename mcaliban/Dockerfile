FROM ubuntu:16.04

# System maintenance
RUN apt-get update && apt-get install -y \
    python3-dev \
    python3-pip \
    x11vnc \
    xvfb \
    fluxbox \
    wmctrl \
    libsm6 && \
  rm -rf /var/lib/apt/lists/* && \
  pip3 install --upgrade pip

WORKDIR /usr/src/app

# Copy the requirements.txt and install the dependencies
COPY setup.py requirements.txt ./
RUN pip3 install -r requirements.txt

# Copy the rest of the package code and its scripts
COPY . .

# Install via setup.py
RUN pip3 install .

#RUN python3 caliban.py

CMD "bin/entrypoint.sh"
