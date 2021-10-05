# DeepCell Label: A Cloud-Based Tool for Single-Cell Labeling

[![Build Status](https://github.com/vanvalenlab/deepcell-label/workflows/tests/badge.svg)](https://github.com/vanvalenlab/deepcell-label/actions)
[![Coverage Status](https://coveralls.io/repos/github/vanvalenlab/deepcell-label/badge.svg?branch=master)](https://coveralls.io/github/vanvalenlab/deepcell-label?branch=master)

DeepCell Label is a web-based data labeling tool based on [React](https://reactjs.org/), [XState](https://xstate.js.org/docs/), and [Flask](https://flask.palletsprojects.com/en/2.0.x/) that can be deployed on the cloud (e.g. with [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)). Try out DeepCell Label on [label.deepcell.org](https://label.deepcell.org).

## Controls

_Instructions for controls are also available in the dropdown "Instructions" pane while using DeepCell Label._

![DeepCell Label User Interface](/screenshots/deepCellLabelUI.png)

DeepCell Label has three main sections:

1. [display controls](#display-controls) on the left
2. [editing controls](#editing-labels) in the center
3. an [interactive canvas](#canvas) on the right

## Display Controls

DeepCell Label can display a raw image and labels that segment the image into object. On the far left, you'll find controls to adjust how the images and labels are displayed. On top, you'll see [segmentation controls](#segmentations) to change how to show the labels, and on bottom, there are [channels controls](#channels) to change how to show the image.

### Segmentations

![Segmentation display controls](/screenshots/segmentationDisplayControls.png)

The outline toggle controls where to outline all labels or only the selected labels. Pressing the hotkey <kbd>O</kbd> toggles the outline.

The opacity slider controls the transparency of the segmentation over of the raw image. Pressing the hotkey <kbd>Z</kbd> cycles between raw image only, labels overlaid on the raw image, and labels only.

The highlight toggle controls whether the selected label is colored red in the labels overlay.

If a project has multiple segmentation features, like a whole-cell segmentation and a nuclear segmentation, you can select which feature to view in the feature drop-down. Press <kbd>F</kbd> to view the next feature and press <kbd>Shift</kbd> + <kbd>F</kbd> to view the previous feature.

### Channels

The multi-channel toggle controls whether to view a single channel in grayscale or multiple channels each with different colors.

#### Multi-channel mode

![Multi-channel display controls](/screenshots/multiChannelDisplayControls.png)

When the multi-channel toggle in on, you'll see a controller for each displayed channel.

These controllers let you change which channel is display, toggle it on and off, and adjust the channels dynamic range. At the bottom, there is a button to display more channels.

Each channel also has a pop-up options menu on its right side where you can remove the channel and change its color.

![Channel options](/screenshots/channelOptions.png)

#### Single-channel mode

![Multi-channel display controls](/screenshots/singleChannelDisplayControls.png)

When viewing a single channel, you can instead change which channel to display and adjust its dynamic range, brightness and contrast.

When in single-channel mode, press <kbd>C</kbd> to view the next channel and press <kbd>Shift</kbd> + <kbd>C</kbd> to view the previous channel.

Press <kbd>0</kbd> (zero) to reset the dynamic range, brightness, and contrast.

## Canvas

The canvas shows the raw image and the segmentation labels. You can navigate the canvas by zooming and panning.

Scroll up or press <kbd>+</kbd> to zoom in. Scroll down or press <kbd>-</kbd> or to zoom out.

While using most tools, you can pan around the canvas with a simple click and drag. For tools that use click and drag in their controls, like brush and threshold, hold <kbd>Space</kbd> and then click and drag to pan.

When the canvas is along the edge of an image, the border around the canvas will turn white on that side. When not on the edge, the canvas border is black.

Press <kbd>D</kbd> to view the next frame.

Press <kbd>A</kbd> to view the previous frame.

## Editing Labels

![Editing controls](/screenshots/segmentControls.png)

In the center editing controls, there is a [toolbar](#tools) on the upper left, an [actions palette](#actions) on the lower left, the [selected labels](#Selecting-Labels) on the right, and [undo and redo buttons](#undo-and-redo) at the top.

### Selecting Labels

We control which labels we're editing by selecting them as
the <strong>foreground</strong> or the <strong>background</strong>. When a label is the foreground, we can add more of that label,
while when a label is background, we can remove it.

Zero, which represents "no label", can be either the foreground,
letting us remove labels, or the background,
letting us create labels.

We can select the foreground label in two ways:

1. <strong>Click</strong> on a label while using the Select Tool

2. <strong><kbd>Shift</kbd> + Double Click</strong> on a label while using any Tool.

We can select the background label in two ways:

1. <strong>Double Click</strong> on a label while using the Select Tool.

2. <strong><kbd>Shift</kbd> + Click</strong> while using any Tool.

Double clicking also deselects any other labels to avoid selecting labels that you are no longer working on.

If you select an already selected label,
the foreground and background swap instead.

Here are some keyboard shortcuts to change the selected labels.

- Press <kbd>Esc</kbd> to reset the background to "no label".
- Press <kbd>N</kbd> to select a new, unused foreground label.
- Press <kbd>X</kbd> to swap the foreground and background.
- Press <kbd>[</kbd> or <kbd>]</kbd> to cycle the foreground label.
- Press <kbd>Shift</kbd> + <kbd>[</kbd> or <kbd>Shift</kbd> + <kbd>]</kbd> to cycle the background label.

### Tools

The tools control what happens when clicking on the canvas and let us edit the segmentation.

#### Select

Label uses Select by default to selects label by clicking on them.

Press <kbd>V</kbd> to use the Select tool.

Click on a label to select it as the foreground, and double click on a label to select it as the background.

You can also select labels while using any tool with
<kbd>Shift</kbd> + click to select the background and <kbd>Shift</kbd> + double click to select the foreground.

Double clicking to select also deselects other labels.

#### Brush and Eraser

Both the brush and eraser allow for pixel-level changes to labels. The brush adds a label, and the eraser removes a label. Click and drag to create a brush stroke, and release to paint or erase the label under the brush stroke.

Press <kbd>B</kbd> to use the Brush and press <kbd>E</kbd> to use the Eraser. Adjust the brush size with <kbd>&uarr;</kbd> to increase the size and <kbd>&darr;</kbd> to decrease the size.

When two labels are selected, you can use both the Brush and Eraser at the same time to replace one label with another. Pressing the Brush or Eraser buttons or hotkeys will unselect one of the labels so that you are only painting or erasing one label again.

#### Threshold

Threshold fills the brightest pixels within a bounding box with the foreground label. Thresholding only edits unlabeled area.

Press <kbd>T</kbd> to use Threshold.

Click and drag on the canvas to draw a bounding box for threshold.

#### Flood

Flood fills connected areas of label with another label. You can flood an unlabeled areas to fill holes in a label too.

Press <kbd>G</kbd> to use Flood.

<strong>Click</strong> on a label to flood it with the selected foreground label.

#### Trim

Trim removes disconnected areas of a label, leaving only the connected pixels behind.

Press <kbd>K</kbd> to use Trim.

<strong>Click</strong> on a label to trim it.

#### Watershed

Watershed splits a label into two. We can separate adjacent cells that mistakenly have the same label with Watershed. Watershed can only be used in single-channel mode because it uses the displayed channel to split the labels.

Press the <kbd>W</kbd> to use Watershed.

<strong>Click</strong> in the center of one cell, then <strong>Click</strong> in the center of another cell with the same label to split the cells into two labels.

### Actions

Actions edit the selected labels. Unlike tools, actions edit the labels immediately without clicking on the canvas.

#### Delete

Delete removes a label from the frame, replacing it with no label.

Press <kbd>Del</kbd> or <kbd>Backspace</kbd> to delete the selected label.

#### Autofit

Autofit adjusts a label to hug the nearest edges in the raw image, fixing an existing label's boundary. Autofit can only be used in single-channel mode because it uses the displayed channel to fit the label.

Press <kbd>M</kbd> to autofit the selected label.

#### Shrink and Grow

Shrink and grow contracts or expands a label's boundary by one pixel.

Press <kbd>Q</kbd> to shrink the selected label and press <kbd>Shift</kbd> + <kbd>Q</kbd> to grow the selected label.

#### Swap

Swap can switch two labels to make them consistent between frames.

Press <kbd>Shift</kbd> + <kbd>S</kbd> to swap the selected labels.

#### Replace

Replace combines two labels and can fix split labels that should be a single label.

Press <kbd>Shift</kbd> + <kbd>R</kbd> to combine selected labels.

### Undo and Redo

The undo and redo buttons can undo or redo the most recent edits to the labels. Undoing and redoing all restore the and UI and controls to their state when the edit happened. For example, when editing the labels while zoomed into a small area on the canvas, undoing will return the canvas to that spot.

Press <kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo and <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> to redo.
