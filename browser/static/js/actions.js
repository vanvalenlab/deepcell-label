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

  constructor(model, action) {
    super();
    model.action = action;

    this.model = model;
    this.action = action;
    this.projectID = model.projectID;
    this.handler = model.handlePayload.bind(model);

    this.error;

    this._doInitialSideEffects();
  }

  get prompt() {
    let prompt;
    if (this.action === '') {
      prompt = '';
    } else if (this.action === 'pick_color') {
      prompt = 'Click on a label to change the brush label to that label.';
    } else if (this.action === 'pick_target') {
      prompt = 'First, click on the label you want to overwrite.';
    } else if (this.action === 'start_threshold') {
      prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
    } else if (this.action === 'start_threshold') {
      prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
    } else if (this.action === 'predict') {
      prompt = 'Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION';
    } else if (this.action === 'fill_hole') {
      prompt `Select hole to fill in cell ${this.selected.label}`;
    } else if (this.action === 'create_new') {
      prompt = 'CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)';
    } else if (this.action === 'delete_mask') {
      `delete label ${this.selected.label} in frame ${this.selected.frame}? (SPACE=YES / ESC=NO)`;
    } else if (this.action === 'replace') {
      prompt = `Replace ${this.selected.secondLabel} with ${this.selected.label}?` +
      '// SPACE = Replace in all frames / S = Replace in this frame only / ESC = Cancel replace';
    } else if (this.action === 'swap_cells') {
      prompt = 'SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP';
    } else if (this.action === 'watershed') {
      prompt = `Perform watershed to split ${this.selected.label}? (SPACE=YES / ESC=NO)`;
    } else if (this.action === 'flood_contiguous') {
      prompt = 'SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL';
    } else if (this.action === 'trim_pixels') {
      prompt = 'SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL';
    } return prompt;
  }

  get _info() {
    let info = {};
    const model = this.model;
      // following were set at start action (starting prompt/question)
    if (this.action === 'flood_contiguous') {
      info = {
        label: model.canvas.label,
        frame: model.frame,
        x_location: model.canvas.imgX,
        y_location: model.canvas.imgY
      };
    } else if (this.action === 'trim_pixels') {
      info = {
        label: model.canvas.label,
        frame: model.frame,
        x_location: model.canvas.imgX,
        y_location: model.canvas.imgY
      };
    } else if (this.action === 'fill_hole') {
      info = {
        label: model.selected.label,
        frame: model.frame
      };
    // following were set just before launching actions
    } else if (this.action === 'threshold') {
      info = {
        y1: model.brush.threshY,
        x1: model.brush.threshX,
        y2: model.canvas.imgY,
        x2: model.canvas.imgX,
        frame: model.frame,
        label: model.maxLabelsMap.get(model.feature) + 1
      };
    } else if (this.action === 'handle_draw') {
      info = {
        trace: model.canvas.trace,
        target_value: model.brush.target, // value that we're overwriting
        brush_value: model.brush.value, // we don't update with edit_value, etc each time they change
        brush_size: model.brush.size, // so we need to pass them in as args
        erase: model.brush.erase,
        frame: model.frame
      };
    } else if (this.action === 'fill_hole') {
      info = {
        label: model.selected.label,
        frame: model.frame,
        x_location: model.canvas.imgX,
        y_location: model.canvas.imgY
       };
    } else if (this.action === 'swap_single_frame') {
      info = {
        label_1: model.selected.label,
        label_2: model.selected.secondLabel,
        frame: model.frame
      };
    } else if (this.action === 'replace_single') {
      info = {
        label_1: model.selected.label,
        label_2: model.selected.secondLabel
      };
    } else if (this.action === 'predict_single') {
      info = {
        frame: model.frame
      };
    } else if (this.action === 'replace') {
      info = {
        label_1: model.selected.label,
        label_2: model.selected.secondLabel
      };
    } else if (this.action === 'swap_all_frame') {
      info = {
        label_1: model.selected.label,
        label_2: model.selected.secondLabel
      };
    } else if (this.action === 'watershed') {
      info = {
        frame: model.selected.frame,
        label: model.selected.label,
        x1_location: model.selected.x,
        y1_location: model.selected.y,
        x2_location: model.selected.secondX,
        y2_location: model.selected.secondY
      };
    }
    return info;
  }

  do() {
    this.model.pendingAction = new NoAction();
    this.error = this._checkInfo();
    if (this.error !== '') { return; }

    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/edit/${this.projectID}/${this.action}`,
      data: this._info,
      async: false
    });
    promise.done(() => this._doFinalSideEffects()).done(this.handler);
  }

  undo() {
    if (this.error !== '') { return; }

    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/undo/${this.projectID}`,
      async: false
    })
    promise.done(this.handler);
  }

  redo() {
    if (this.error !== '') { return; }

    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/redo/${this.projectID}`,
      async: false
    })
    promise.done(this.handler);
  }

  _checkInfo() {
    if (this.action === 'swap_single_frame') {
      if (this.selected.label === this.selected.secondLabel) {
        return 'Cannot swap a label with itself.';
      }
      if (this.selected.frame !== this.selected.secondLabel) {
        return 'Must swap cells on the same frame.';
      }
    } else if (this.action === 'replace_single') {
      if (this.selected.label === this.selected.secondLabel) {
        return 'Cannot replace a label with itself.';
      }
    } else if (this.action === 'replace') {
      if (this.selected.label === this.selected.secondLabel) {
        return 'Cannot replace a label with itself.';
      }
    } else if (this.action === 'swap_all_frame') {
      if (this.selected.label === this.selected.secondLabel) {
        return 'Cannot swap a label with itself.';
      }
    } else if (this.action === 'watershed') {
      if (this.selected.label !== this.selected.secondLabel) {
        return 'Must select same label twice to split with watershed.';
      }
      if (this.selected.frame !== this.selected.secondFrame) {
        return 'Must select seeds on same frame to split with watershed.';
      }
    }
    return '';
  }

  _doInitialSideEffects() {
    if (this.action === 'start_threshold') {
      this.model.brush.thresholding = true;
    } else if (this.action === 'pick_target') {
      this.model.brush.conv = true;
    }
  }

  _doFinalSideEffects() {
    if (this.action === 'threshold') {
      this.model.brush.thresholding = false;
      this.model.clear();
    } else if (this.action === 'handle_draw') {
      this.model.canvas.clearTrace();
    }
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
    this.info = this.model.info;
    this.selected = this.model.selected;
  }

  do() {
    if (this.model.kind === Modes.none) {
      this.selected.pickLabel();
      this.model.kind = Modes.single;
    } else if (this.model.kind === Modes.single) {
      this.selected.pickSecondLabel();
      this.model.kind = Modes.multiple;
    } else if (this.model.kind === Modes.multiple) {
      this.selected.pickSecondLabel();
    }
  }

  undo() { this.model.clear(); }

  redo() { this.model.clear(); }
}

class IncrementSelectedLabel extends Action {
  constructor(model) {
    super();
    this.model = model;
    this.selected = model.selected;
    this.oldLabel = this.selected.label;
    // cycle highlight to next label
    let maxLabel = this.model.maxLabelsMap.get(this.model.feature);
    this.newLabel = this.selected.label.mod(maxLabel) + 1;
  }

  do() {
    this.model.clear();
    this.selected.label = this.newLabel;
  }

  undo() {
    this.model.clear();
  }

  redo() {
    this.model.clear();
  }
}

class SetUnusedBrushLabel extends Action {
  constructor(model) {
    this.model = model;
    this.brush = model.brush;

    this.oldValue = brush.value;
    this.newValue = model.maxLabelsMap.get(this.model.feature) + 1;

  }

  do() {
    this.brush.value = this.newValue;
    if (this.model.kind === Modes.prompt && this.brush.conv) {
      this.prompt = `Now drawing over label ${this.brush.target} with label ${this.brush.value}. ` +
        `Use ESC to leave this mode.`;
      this.model.kind = Modes.drawing;
    }
  }

  // TODO: set brush values?
  undo() {
    this.model.clear();
  }

  redo() {
    this.model.clear();
  }
}

// pick_color,
class StartPrompt extends Action {
  constructor(model, action) {
    super();
    this.model = model;
    this.action = action;
  }

  do() {
    this.model.kind = Modes.prompt;
    this.model.pendingAction = new BackendAction(this.model, this.action);
  }

  undo() { this.model.clear(); }

  redo() { this.model.clear(); }
}

class StartQuestion extends Action {
  constructor(model, action) {
    super();
    this.model = model;
    this.action = action;
  }

  do() {
    this.model.kind = Modes.question;
    this.model.pendingAction = new BackendAction(this.model, this.action);
  }

  undo() { this.model.clear(); }

  redo() { this.model.clear(); }
}

/**
 * Dummy class to use model.pendingAction when no action is pending.
 * Will hide the prompt area.
 */
class NoAction {
  constructor() {
    this.showPrompt = false;
    this.showConfirm = false;
    this.showConfirmAll = false;
    this.prompt = '';
  }
}