/* eslint-disable comma-dangle */
import { Action } from './history.js';

export class ToggleHighlight extends Action {

  do() {
    window.model.highlight = !window.model.highlight;
  }

  undo() {
    this.do()
  }

  redo() {
    this.do()
  }
}

/** Action to change the viewed frame. */
export class ChangeFrame extends Action {
  constructor(frame) {
    super();
    const model = window.model;
    this.oldValue = model.frame;
    this.newValue = frame.mod(model.numFrames);
  }

  do() {
    window.service.send({
      type: 'SETFRAME',
      dimension: 'frame',
      value: this.newValue,
      // frame: this.newValue,
    });
  }

  undo() {
    window.service.send({
      type: 'SETFRAME',
      dimension: 'frame',
      value: this.oldValue,
      // frame: this.oldValue,
    });
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed feature. */
export class ChangeFeature extends Action {
  constructor(feature) {
    super();
    const model = window.model;
    this.oldValue = model.feature;
    this.newValue = feature.mod(model.numFeatures);
  }

  do() {
    window.controller.service.send({
      type: 'SETFRAME',
      dimension: 'feature',
      value: this.newValue,
    });
  }

  undo() {
    window.controller.service.send({
      type: 'SETFRAME',
      dimension: 'feature',
      value: this.oldValue,
    });
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed channel. */
export class ChangeChannel extends Action {
  constructor(channel) {
    super();
    const model = window.model;
    this.oldValue = model.channel;
    this.newValue = channel.mod(model.numChannels);
  }

  do() {
    window.controller.service.send({
      type: 'SETFRAME',
      dimension: 'channel',
      value: this.newValue,
    });
  }

  undo() {
    window.controller.service.send({
      type: 'SETFRAME',
      dimension: 'channel',
      value: this.oldValue,
    });
  }

  redo() {
    this.do();
  }
}

export class BackendAction extends Action {
  constructor(action, args) {
    super();
    this.action = action;
    this.args = args;
  }

  do() {
    window.controller.service.send({
      type: 'EDIT',
      action: this.action,
      args: this.args,
    });
  }

  undo() {
    window.controller.service.send({
      type: 'UNDO',
    });
  }

  redo() {
    window.controller.service.send({
      type: 'REDO',
    });
  }
}

// actions on CanvasPosition

export class Pan extends Action {
  // Implements command pattern for an undoable pan
  constructor(dx, dy) {
    super();
    this.canvas = window.model.canvas;
    // previous canvas position
    this.oldSx = this.canvas.sx;
    this.oldSy = this.canvas.sy;
    // change in canvas position
    this.dx = -dx;
    this.dy = -dy;
    // new canvas position (undefined until do)
    this.newSx;
    this.newSy;
  }

  do() {
    this.canvas.sx = this.canvas.sx + this.dx;
    this.canvas.sy = this.canvas.sy + this.dy;
    this.newSx = this.canvas.sx;
    this.newSy = this.canvas.sy;
  }

  redo() {
    this.canvas.sx = this.newSx;
    this.canvas.sy = this.newSy;
  }

  undo() {
    this.canvas.sx = this.oldSx;
    this.canvas.sy = this.oldSy;
  }
}

export class Zoom extends Action {
  constructor(dZoom) {
    super();
    this.canvas = window.model.canvas;
    // point we zoom in around
    // need to store so undoing/redoing zooms around the same location
    this.x = this.canvas.canvasPosX;
    this.y = this.canvas.canvasPosY;
    this.oldZoom = this.canvas.zoom;
    this.newZoom = this.canvas.zoom - 10 * dZoom;
  }

  do() {
    this.canvas.setZoom(this.newZoom, this.x, this.y);
  }

  undo() {
    this.canvas.setZoom(this.oldZoom, this.x, this.y);
  }

  redo() {
    this.do();
  }
}

// actions on ImageAdjuster

export class ChangeContrast extends Action {
  constructor(change) {
    super();
    this.adjuster = window.model.adjuster;
    this.oldContrast = this.adjuster.contrast;
    this.change = -Math.sign(change) * 4;
    this.newContrast;
  }

  do() {
    this.adjuster.contrast += this.change;
    this.newContrast = this.adjuster.contrast;
  }

  undo() { this.adjuster.contrast = this.oldContrast; }

  redo() { this.adjuster.contrast = this.newContrast; }
}

export class ChangeBrightness extends Action {
  constructor(change) {
    super();
    this.adjuster = window.model.adjuster;
    this.oldBrightness = this.adjuster.brightness;
    this.change = -Math.sign(change);
    this.newBrightness;
  }

  do() {
    this.adjuster.brightness += this.change;
    this.newBrightness = this.adjuster.brightness;
  }

  undo() { this.adjuster.brightness = this.oldBrightness; }

  redo() { this.adjuster.brightness = this.newBrightness; }
}

export class ResetBrightnessContrast extends Action {
  constructor() {
    super();
    this.adjuster = window.model.adjuster;
    this.brightness = this.adjuster.brightness;
    this.contrast = this.adjuster.contrast;
  }

  do() {
    this.adjuster.brightness = 0;
    this.adjuster.contrast = 0;
  }

  undo() {
    this.adjuster.brightness = this.brightness;
    this.adjuster.contrast = this.contrast;
  }

  redo() { this.do(); }
}

export class ToggleInvert extends Action {
  constructor() {
    super();
    this.adjuster = window.model.adjuster;
  }

  do() {
    this.adjuster.displayInvert = !this.adjuster.displayInvert;
  }

  undo() { this.do(); }

  redo() { this.do(); }
}

export class SelectForeground extends Action {
  constructor() {
    super();
    const model = window.model;
    this.selected = model.selected;

    this.oldValue = model.selected.label;
    this.newValue;
  }

  do() {
    this.selected.pickLabel();
    this.newValue = this.selected.label;
  }

  // TODO: revert to old label instead of clearing?
  undo() { this.selected.clear(); }

  redo() { this.selected.clear(); }
}

export class SelectBackground extends Action {
  constructor() {
    super();
    const model = window.model;
    this.selected = model.selected;

    this.oldValue = model.selected.secondLabel;
    this.newValue;
  }

  do() {
    this.selected.pickSecondLabel();
    this.newValue = this.selected.secondLabel;
  }

  // TODO: revert to old label instead of clearing?
  undo() { this.selected.clear(); }

  redo() { this.selected.clear(); }
}

export class SwapForegroundBackground extends Action {
  constructor() {
    super();
    const model = window.model;
    this.selected = model.selected;

    this.foreground = model.selected.label;
    this.background = model.selected.secondLabel;
  }

  do() {
    this.model.selected.label = this.background;
    this.model.selected.secondLabel = this.foreground;
  }

  undo() {
    this.model.selected.label = this.foreground;
    this.model.selected.secondLabel = this.background;
  }

  redo() { this.do(); }
}

export class SetForeground extends Action {
  constructor(label) {
    super();
    const model = window.model;
    this.selected = model.selected;
    this.oldLabel = this.selected.label;
    // cycle highlight to next label
    const maxLabel = this.model.maxLabelsMap.get(this.model.feature);
    this.newLabel = (label).mod(maxLabel);
  }

  do() {
    this.selected.label = this.newLabel;
  }

  undo() {
    this.selected.label = this.oldLabel;
  }

  redo() {
    this.do();
  }
}

export class SetBackground extends Action {
  constructor(label) {
    super();
    const model = window.model;
    this.selected = model.selected;
    this.oldLabel = this.selected.secondLabel;
    // cycle highlight to next label
    const maxLabel = this.model.maxLabelsMap.get(this.model.feature);
    this.newLabel = (label).mod(maxLabel);
  }

  do() {
    this.selected.secondLabel = this.newLabel;
  }

  undo() {
    this.selected.secondLabel = this.oldLabel;
  }

  redo() {
    this.do();
  }
}

export class ResetLabels extends Action {
  constructor() {
    super();
    const model = window.model;

    this.oldForeground = model.selected.label;
    this.oldBackground = model.selected.secondLabel;
    this.newForeground = model.maxLabelsMap.get(model.feature) + 1;
    this.newBackground = 0;
  }

  do() {
    this.model.selected.label = this.newForeground;
    this.model.selected.secondLabel = this.newBackground;
  }

  undo() {
    this.model.selected.label = this.oldForeground;
    this.model.selected.secondLabel = this.oldBackground;
  }

  redo() {
    this.do();
  }
}
