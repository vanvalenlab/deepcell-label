FROM python:3.7-slim-buster as base

FROM base as builder

RUN mkdir /build
WORKDIR /build

COPY requirements.txt requirements-test.txt ./

RUN apt-get update && apt-get install -y \
    build-essential default-libmysqlclient-dev && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM base

WORKDIR /usr/src/app

COPY --from=builder /install /usr/local

COPY deepcell_label ./deepcell_label

EXPOSE 5000

CMD ["gunicorn", "-b 0.0.0.0:5000", "deepcell_label.wsgi:application"]
