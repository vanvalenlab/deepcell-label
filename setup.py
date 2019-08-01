import logging

try:
    from setuptools import setup, find_packages
except ImportError:
    from distutils.core import setup, find_packages


def _parse_requirements(file_path):
    lineiter = (line.strip() for line in open(file_path))
    reqs = []
    for line in lineiter:
        reqs.append(line)
    return reqs

try:
    install_reqs = _parse_requirements('requirements.txt')
except Exception:
    logging.warning('Failed to load requirements file, using default ones.')
    install_reqs = []

setup(
    name='caliban',
    version='0.1',
    packages=find_packages(),
    install_requires=install_reqs,
    extras_require={
        'tests': ['pytest',
                  'pytest-pep8',
                  'pytest-cov'],
    },
    license='LICENSE',
    author='Van Valen Lab',
    author_email='vanvalen@caltech.edu',
    description='caliban tester',
)
