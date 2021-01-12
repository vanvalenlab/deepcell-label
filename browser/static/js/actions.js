class ToggleEdit extends Action {
  constructor(model) {
    super();
    this.model = model;
  }

  do() {
    this.model.edit_mode = !this.model.edit_mode;
  }

  undo() {
    this.do()
  }

  redo() {
    this.do()
  }
}

class ToggleHighlight extends Action {
  constructor(model) {
    super();
    this.model = model;
  }

  do() {
    this.model.highlight = !this.model.highlight;
  }

  undo() {
    this.do()
  }

  redo() {
    this.do()
  }
}

/** Action to change the viewed frame. */
class ChangeFrame extends Action {
  constructor(model, frame) {
    super();
    this.model = model;
    this.oldValue = model.frame;
    this.newValue = frame.mod(model.numFrames);
  }

  do() {
    this.model.frame = this.newValue;
    if (this.model.action !== '') { this.model.clear() };
    this.model.setDisplay('frame', this.newValue);
  }


  undo() {
    this.model.frame = this.oldValue;
    if (this.model.action !== '') { this.model.clear() };
    this.model.setDisplay('frame', this.oldValue);
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed feature. */
class ChangeFeature extends Action {
  constructor(model, feature) {
    super();
    this.model = model;
    this.oldValue = model.feature;
    this.newValue = feature.mod(model.numFeatures);
  }

  do() {
    this.model.feature = this.newValue;
    this.model.clear();
    this.model.setDisplay('feature', this.newValue);
  }

  undo() {
    this.model.feature = this.oldValue;
    this.model.clear();
    this.model.setDisplay('feature', this.oldValue);
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed channel. */
class ChangeChannel extends Action {
  constructor(model, channel) {
    super();
    this.model = model;
    this.oldValue = model.channel;
    this.newValue = channel.mod(model.numChannels);
  }

  do() {
    const promise = this.model.setDisplay('channel', this.newValue);
    promise.done( () => {
      this.model.channel = this.newValue;
    });
  }

  undo() {
    const promise = this.model.setDisplay('channel', this.oldValue);
    promise.done( () => {
      this.model.channel = this.oldValue;
    });
  }

  redo() {
    this.do();
  }
}

class BackendAction extends Action {

  constructor(model) {
    super();
    this.model = model;
    this.action = model.action;
    this.info = model.info;
    this.projectID = model.projectID;
  }

  do() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/edit/${this.projectID}/${this.action}`,
      data: this.info,
      async: false
    });
    promise.done(this.model.handlePayload.bind(this.model));
  }

  undo() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/undo/${this.projectID}`,
      async: false
    })
    promise.done(this.model.handlePayload.bind(this.model));
  }

  redo() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/redo/${this.projectID}`,
      async: false
    })
    promise.done(this.model.handlePayload.bind(this.model));
  }
}

// actions on CanvasPosition

class Pan extends Action {
  // Implements command pattern for an undoable pan
  constructor(model, dx, dy) {
    super();
    this.canvas = model.canvas;
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

class Zoom extends Action {
  constructor(model, dZoom) {
    super();
    this.canvas = model.canvas;
    // point we zoom in around
    // need to store so undoing/redoing zooms around the same location
    this.x = model.canvas.canvasPosX;
    this.y = model.canvas.canvasPosY;
    this.oldZoom = model.canvas.zoom;
    this.newZoom = model.canvas.zoom - 10 * dZoom;
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

class ChangeContrast extends Action {
  constructor(model, change) {
    super();
    this.adjuster = model.adjuster;
    this.oldContrast = model.adjuster.contrast;
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

class ChangeBrightness extends Action {
  constructor(model, change) {
    super();
    this.adjuster = model.adjuster;
    this.oldBrightness = model.adjuster.brightness;
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

class ResetBrightnessContrast extends Action {
  constructor(model) {
    super();
    this.adjuster = model.adjuster;
    this.brightness = model.adjuster.brightness;
    this.contrast = model.adjuster.contrast;
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

class ToggleInvert extends Action {
  constructor(model) {
    super();
    this.adjuster = model.adjuster;
  }

  do() {
    this.adjuster.displayInvert = !this.adjuster.displayInvert;
  }

  undo() { this.do(); }

  redo() { this.do(); }
}

class SelectLabel extends Action {
  constructor(model) {
    super();
    this.model = model;
    this.canvas = model.canvas;
  }

  do() {
    this.model.kind = Modes.single;
    this.model.info = {
      label: this.canvas.label,
      frame: this.model.frame
    };
    this.model.highlighted_cell_one = this.canvas.label;
    this.model.highlighted_cell_two = -1;
    this.canvas.storedClickX = this.canvas.imgX;
    this.canvas.storedClickY = this.canvas.imgY;
  }

  undo() { this.model.clear(); }

  redo() { this.model.clear(); }
}

