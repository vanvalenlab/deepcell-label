"""Flask application entrypoint"""
from __future__ import absolute_import, division, print_function

import logging

from flask.logging import default_handler

from deepcell_label import create_app


def initialize_logger():
    """Set up logger format and level"""
    formatter = logging.Formatter(
        '[%(asctime)s]:[%(levelname)s]:[%(name)s]: %(message)s'
    )

    default_handler.setFormatter(formatter)
    default_handler.setLevel(logging.DEBUG)

    wsgi_handler = logging.StreamHandler(
        stream='ext://flask.logging.wsgi_errors_stream'
    )
    wsgi_handler.setFormatter(formatter)
    wsgi_handler.setLevel(logging.DEBUG)

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(default_handler)

    # 3rd party loggers
    logging.getLogger('sqlalchemy').addHandler(logging.DEBUG)
    logging.getLogger('botocore').setLevel(logging.INFO)
    logging.getLogger('urllib3').setLevel(logging.INFO)


application = create_app()  # pylint: disable=C0103


if __name__ == '__main__':
    initialize_logger()
    application.run(
        '0.0.0.0', port=application.config['PORT'], debug=application.config['DEBUG']
    )
