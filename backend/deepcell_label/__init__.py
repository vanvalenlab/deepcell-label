"""Flask application entrypoint"""
from __future__ import absolute_import, division, print_function

import flask_monitoringdashboard as dashboard
from flask import Flask
from flask_compress import Compress
from flask_cors import CORS
from flask_dropzone import Dropzone

from deepcell_label import config
from deepcell_label.blueprints import bp
from deepcell_label.models import db

compress = Compress()  # pylint: disable=C0103
dropzone = Dropzone()  # pylint: disable=C0103


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
    dropzone.init_app(app)

    # For flask monitoring dashboard
    if config.DASHBOARD_CONFIG:
        dashboard.config.init_from(config.DASHBOARD_CONFIG)

        def group_action():
            """Apply custom grouping for action endpoint"""
            from flask import request

            if request.endpoint == 'label.action':
                return request.view_args['action_type']

        dashboard.config.group_by = group_action
        dashboard.bind(app)

    return app
