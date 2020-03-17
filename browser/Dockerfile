FROM python:3.7

WORKDIR /usr/src/app

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["/bin/sh", "-c", "python eb_application.py"]
