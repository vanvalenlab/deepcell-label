# DeepCell Label: Cloud-Based Labeling for Single-Cell Analysis

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=main)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=main)
[![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/vanvalenlab/deepcell-label/blob/main/LICENSE)

DeepCell Label is a web-based tool to visualize and label biological images. It can segment an image, assign cells across a timelapse, and track divisions in multiplexed images, 3D image stacks, and time-lapse movies.

As it's available through a browser, DeepCell Label can crowdsource data labeling or review, correct, and curate labels as a domain expert.

The site is built with [React](https://reactjs.org/), [XState](https://xstate.js.org/docs/), and [Flask](https://flask.palletsprojects.com/en/2.0.x/) and [runs locally](/documentation/LOCAL_USE.md) or [on the cloud](/documentation/DEPLOYMENT.md).

Visit [label.deepcell.org](https://label.deepcell.org) to create a project from an example file or your own .tiff, .png, or .npz. Dropdown instructions are available while working on a project in DeepCell Label.
