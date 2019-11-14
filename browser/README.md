# Browser-Based Application of Caliban for Data Curation

This is an version of Caliban that runs on a browser.

The key operations are identical to the desktop version.
Please refer to the repository README.md for editing instructions and guide.


# Caliban for Developers

## Install Dependencies
```bash
cd browser
pip install -r requirements.txt
```

## Run browser application in development mode
```bash
python3 application.py
```

## Structure of Browser Version

Flask is used as an HTTP server that serves the frames as pngs and metadata as JSON. The .js files in the `browser/template` folder are what makes the requests to the Flask server.

​Python Flask was used as a web application framework for constructing Caliban. The Flask framework helps serves as the router that maps the specific URL with the associated function that is intended to perform some task. Specifically, the application.route decorator binds the URL rule to the function below it. Thus, if user makes an operation or clicks a button, the side-serving .js file will request to visits a specific URL, and the output of the function below the decorator will be rendered in the browser.

Functions depend on Python libraries -- including NumPy, Matplotlib, and scikit-learn – to change the metadata for the files. After the desired change has been made to the lineage information or mask annotation, the Flask app routing will update the interface to reflect the alterations with support from side-serving JavaScript scripts.

The final Flask application has been deployed to an AWS Elastic Beanstalk environment as a RESTful web service.

An SQLite database has been added to make Caliban stateless and scalable. SQLite is embedded into the end program, so whenever the tool is started, a unique id is created for the user and the TrackReview/ZStackReview object is stored locally in caliban.db. Whenever the user makes a change to the object, the application will update the state of the object. After the user submits the final datafile to the S3 bucket, the corresponding id and object will be deleted from the database file. When the application is packaged as an Elastic Beanstalk app, the .db file will also be packaged in the zip file. Note: there must be a caliban.db file in the browser directory before deploying an Elastic Beanstalk app, otherwise files cannot be loaded. The caliban.db file can be created simply by running application.py.

