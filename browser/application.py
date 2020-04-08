"""Flask application entrypoint"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from flask import Flask

import config
from blueprints import bp
from models import db


def create_app():
    """Factory to create the Flask application"""
    app = Flask(__name__)

    app.config.from_object('config')

    app.jinja_env.auto_reload = True

    db.app = app  # setting context
    db.init_app(app)

    db.create_all()

    app.register_blueprint(bp)

    return app


application = create_app()  # pylint: disable=C0103

if __name__ == '__main__':
    application.run('0.0.0.0', port=config.PORT, debug=config.DEBUG)
