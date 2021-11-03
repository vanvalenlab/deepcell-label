FROM python:3.7-slim-bullseye as base

FROM base as builder

RUN mkdir /build
WORKDIR /build

COPY requirements.txt requirements-test.txt ./

# Install deps for mysqlclient and matplotlib
# Installation on Python3.8+ may require
# pkg-config libfreetype6-dev libxft-dev libpng-dev
RUN apt-get update && apt-get install -y \
    build-essential default-libmysqlclient-dev && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM base

WORKDIR /usr/src/app

COPY --from=builder /install /usr/local

COPY deepcell_label ./deepcell_label

ENV PORT "5000"

CMD gunicorn --bind 0.0.0.0:$PORT deepcell_label.wsgi:application
