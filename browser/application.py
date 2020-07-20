"""Flask application entrypoint"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging

from flask import Flask
from flask.logging import default_handler
from flask_cors import CORS

from flask_compress import Compress

import config
from blueprints import bp
from models import db


compress = Compress()  # pylint: disable=C0103


class ReverseProxied(object):
    """Enable TLS for internal requests.

    Found in: https://stackoverflow.com/questions/30743696
    """
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        scheme = environ.get('HTTP_X_FORWARDED_PROTO')
        if scheme:
            environ['wsgi.url_scheme'] = scheme
        return self.app(environ, start_response)


def initialize_logger():
    """Set up logger format and level"""
    formatter = logging.Formatter(
        '[%(asctime)s]:[%(levelname)s]:[%(name)s]: %(message)s')

    default_handler.setFormatter(formatter)
    default_handler.setLevel(logging.DEBUG)

    wsgi_handler = logging.StreamHandler(
        stream='ext://flask.logging.wsgi_errors_stream')
    wsgi_handler.setFormatter(formatter)
    wsgi_handler.setLevel(logging.DEBUG)

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(default_handler)

    # 3rd party loggers
    logging.getLogger('sqlalchemy').addHandler(logging.DEBUG)
    logging.getLogger('botocore').setLevel(logging.INFO)
    logging.getLogger('urllib3').setLevel(logging.INFO)


def create_app(**config_overrides):
    """Factory to create the Flask application"""
    app = Flask(__name__)

    CORS(app)

    app.config.from_object(config)
    # apply overrides
    app.config.update(config_overrides)

    app.wsgi_app = ReverseProxied(app.wsgi_app)

    app.jinja_env.auto_reload = True

    db.app = app  # setting context
    db.init_app(app)

    db.create_all()

    app.register_blueprint(bp)

    compress.init_app(app)

    return app


application = create_app()  # pylint: disable=C0103


if __name__ == '__main__':
    initialize_logger()
    application.run('0.0.0.0',
                    port=application.config['PORT'],
                    debug=application.config['DEBUG'])
