// TODO: remove Modes
const Modes = Object.freeze({
  none: 1,
  single: 2,
  multiple: 3,
  question: 4,
  info: 5,
  prompt: 6,
  drawing: 7
});

var answer = '(SPACE=YES / ESC=NO)';

class Model {
  constructor(project) {
    // Dynamic project attributes
    this.frame = project.frame;
    this.feature = project.feature;
    this.channel = project.channel;
    this.kind = Modes.none;  // TODO: remove Modes
    // arguments passed to edit functions on backend
    this.info = {};  // TODO: remove info?
    this.prompt = '';  // TODO: move prompt logic to view?
    this.action = '';
    // TODO: merge highlighting, selecting, and brush values
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    // Booleans
    this.highlight = true;
    this.rgb = false;
    // TODO: get rid of edit mode/whole label mode distinction
    this.edit_mode = true;
    // TODO: replace with sliding opacity
    this.rendering_raw = false;
    this.display_labels = true; // is true the right default value?

    // Static project attributes
    this.numFrames = project.numFrames;
    this.numFeatures = project.numFeatures;
    this.numChannels = project.numChannels;
    this.projectID = project.project_id;
    this.width = project.dimensions[0];
    this.height = project.dimensions[1];
    this.padding = 5;
    this.scale = 1;

    // Project data (images and label metadata)
    this._rawImage = new Image();
    this._segImage = new Image();
    // array of arrays, contains annotation data for frame
    this._segArray = null;
    this.tracks = project.tracks;
    this.maxLabelsMap = new Map();
    this.processMaxLabels();

    // Model objects
    let adjuster = new ImageAdjuster(this);
    adjuster.rawImage.onload = () => adjuster.contrastRaw();
    adjuster.segImage.onload = () => adjuster.preCompAdjust();
    if (this.rgb) {
      adjuster.contrastedRaw.onload = () => adjuster.rawAdjust();
      adjuster.preCompSeg.onload = () => adjuster.segAdjust();
    } else {
      adjuster.contrastedRaw.onload = () => adjuster.preCompRawAdjust();
      adjuster.preCompRaw.onload = () => adjuster.rawAdjust();
      adjuster.preCompSeg.onload = () => adjuster.segAdjust();
      adjuster.compositedImg.onload = () => adjuster.postCompAdjust();
    }
    adjuster.postCompImg.onload = () => this.notifyImageChange();
    adjuster.rawLoaded = false;
    adjuster.segLoaded = false;
    this.adjuster = adjuster;
    this.canvas = new CanvasState(this.width, this.height, this.scale, this.padding);
    this.brush = new Brush(this.height, this.width, this.padding);

    // TODO: use Observable interface instead and allow any Observer to register
    // only observer right now is the view
    this.view = new View(this);
  }

  get segArray() {
    return this._segArray;
  }

  set segArray(newSegArray) {
    this._segArray = newSegArray;
    this.canvas.segArray = newSegArray;
  }

  get segImage() {
    return this._segImage;
  }

  set segImage(newSegImage) {
    this._segImage = newSegImage;
    this.adjuster.segLoaded = false;
    this.adjuster.segImage.src = newSegImage;
  }

  get rawImage() {
    return this._rawImage;
  }

  set rawImage(newRawImage) {
    this._rawImage = newRawImage;
    this.adjuster.rawLoaded = false;
    this.adjuster.rawImage.src = newRawImage;
  }

  // TODO: use Observable interface instead of hard-coding the view as the only Observer
  notifyImageChange() {
    this.view.render_image_display();
  }

  notifyImageFormattingChange() {
    this.adjuster.preCompAdjust();
  }

  notifyInfoChange() {
    this.view.render_info_display();
  }

  /**
   * Updates maxLabelsMap to match the current tracks.
   */
  processMaxLabels() {
    const tracks = this.tracks;
    for (let i = 0; i < Object.keys(tracks).length; i++) {
      const key = Object.keys(tracks)[i]; // the keys are strings
      if (Object.keys(tracks[key]).length > 0) {
        // use i as key in this map because it is an int, feature is also int
        this.maxLabelsMap.set(i, Math.max(...Object.keys(tracks[key]).map(Number)));
      } else {
        // if no labels in feature, explicitly set max label to 0
        this.maxLabelsMap.set(i, 0);
      }
    }
  }

  // TODO: move to view?
  helper_brush_draw() {
    if (this.canvas.isCursorPressed() && !this.canvas.isSpacedown) {
      // update mouse_trace, but not if turning on conv brush
      if (this.kind !== Modes.prompt) {
        this.canvas.trace.push([this.canvas.imgY, this.canvas.imgX]);
      }
    } else {
      this.brush.clearView();
    }
    this.brush.addToView();
  }

  /**
   * Sends a POST request to change the current frame, feature, or channel.
   * Handles the image data in the response.
   *
   * @param {string} displayAttr which attribute to change (e.g. frame, feature, or channel)
   * @param {int} value value to set to attribute
   */
  setDisplay(displayAttr, value) {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/changedisplay/${this.projectID}/${displayAttr}/${value}`,
      async: true
    })
    return promise.done((payload) => this.handlePayload(payload));
  }

  handlePayload(payload) {
    if (payload.error) {
      alert(payload.error);
    }

    if (payload.imgs) {
      if (Object.prototype.hasOwnProperty.call(payload.imgs, 'seg_arr')) {
        this.segArray = payload.imgs.seg_arr;
      }
      if (Object.prototype.hasOwnProperty.call(payload.imgs, 'segmented')) {
        this.segImage = payload.imgs.segmented;
      }
      if (Object.prototype.hasOwnProperty.call(payload.imgs, 'raw')) {
        this.rawImage = payload.imgs.raw;
      }
    }
  
    if (payload.tracks) {
      this.tracks = payload.tracks;
      this.processMaxLabels();
    }

    if (payload.tracks || payload.imgs) {
      this.notifyImageChange();
      this.notifyInfoChange();
    }
  }

  // deselect/cancel action/reset highlight
  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;

    this.brush.conv = false;
    this.brush.clearThresh();

    this.action = '';
    this.prompt = '';
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }

  toggleRaw() {
    this.rendering_raw = !this.rendering_raw;
    this.notifyImageChange();
  }

  toggleLabels() {
    this.display_labels = !this.display_labels;
    this.notifyImageChange();
  }

  updateMousePos(x, y) {
    const oldImgX = this.canvas.imgX;
    const oldImgY = this.canvas.imgY;
  
    this.canvas.updateCursorPosition(x, y);
  
    // if cursor has actually changed location in image
    if (oldImgX !== this.canvas.imgX || oldImgY !== this.canvas.imgY) {
      this.brush.x = this.canvas.imgX;
      this.brush.y = this.canvas.imgY;
      // update brush preview
      if (this.edit_mode) {
        // brush's canvas is keeping track of the brush
        if (this.brush.show) {
          this.helper_brush_draw();
        } else {
          this.brush.boxView();
        }
        this.notifyImageChange();
      }
    }
  }

  decrementBrushSize() {
    // decrease brush size, minimum size 1
    this.brush.size -= 1;
    // redraw the frame with the updated brush preview
    this.notifyImageChange();
  }

  incrementBrushSize() {
    // increase brush size, diameter shouldn't be larger than the image
    this.brush.size += 1;
    // redraw the frame with the updated brush preview
    this.notifyImageChange();
  }

  setUnusedBrushLabel() {
    // set edit value to something unused
    this.brush.value = this.maxLabelsMap.get(this.feature) + 1;
    if (this.kind === Modes.prompt && brush.conv) {
      this.prompt = `Now drawing over label ${this.brush.target} with label ${this.brush.value}. ` +
        `Use ESC to leave this mode.`;
      this.kind = Modes.drawing;
    }
    this.notifyImageFormattingChange();
  }

  incrementBrushLabel() {
    // increase edit_value up to max label + 1 (guaranteed unused)
    this.brush.value = Math.min(
      this.brush.value + 1,
      this.maxLabelsMap.get(this.feature) + 1
    );
    if (highlight) {
      this.notifyImageFormattingChange();
    }
    this.notifyInfoChange();
  }

  decrementBrushLabel() {
    // decrease edit_value, minimum 1
    this.brush.value -= 1;
    if (this.highlight) {
      this.notifyImageFormattingChange();
    }
    this.notifyInfoChange();
  }

  toggleEraser() {
    // turn eraser on and off
    this.brush.erase = !this.brush.erase;
    this.notifyImageChange();
  }

  decrementHighlightedLabel() {
    // cycle highlight to prev label, skipping 0
    let numLabels = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = (this.highlighted_cell_one + numLabels - 2).mod(numLabels) + 1;
    if (this.highlight) {
      this.notifyImageFormattingChange();
    }
  }

  incrementHighlightedLabel() {
    // cycle highlight to next label (skipping 0)
    let maxLabel = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = this.highlighted_cell_one.mod(maxLabel) + 1;
    if (this.highlight) {
      this.notifyImageFormattingChange();
    }
  }

  decrementSelectedLabel() {
    // cycle highlight to prev label, skipping 0
    let numLabels = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = (this.highlighted_cell_one + numLabels - 2).mod(numLabels) + 1;
    // clear info but show new highlighted cell
    const tempHighlight = this.highlighted_cell_one;
    this.clear();
    this.highlighted_cell_one = tempHighlight;
    if (this.highlight) {
      this.notifyImageFormattingChange();
    }
  }

  incrementSelectedLabel() {
    // cycle highlight to next label
    let maxLabel = this.maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = this.highlighted_cell_one.mod(maxLabel) + 1;
    // clear info but show new highlighted cell
    const tempHighlight = this.highlighted_cell_one;
    this.clear();
    this.highlighted_cell_one = tempHighlight;
    if (this.highlight) {
      this.notifyImageFormattingChange();
    }
  }

  // actions
  startColorPicker() {
    // color picker
    this.kind = Modes.prompt;
    this.action = 'pick_color';
    this.prompt = 'Click on a label to change the brush label to that label.';
    this.notifyInfoChange();
  }

  startConversionBrush() {
    // conversion brush
    this.kind = Modes.prompt;
    this.action = 'pick_target';
    this.prompt = 'First, click on the label you want to overwrite.';
    this.brush.conv = true;
    this.notifyImageChange();
  }

  startThreshold() {
    // prompt thresholding with bounding box
    this.kind = Modes.question;
    this.action = 'start_threshold';
    this.prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
    this.brush.show = false;
    this.brush.clearView();
    this.notifyImageChange();
  }

  startPredict() {
    // iou cell identity prediction
    this.kind = Modes.question;
    this.action = 'predict';
    this.prompt = 'Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION';
    this.notifyInfoChange();
  }

  startFill() {
    // hole fill
    this.info = {
      label: this.info.label,
      frame: this.frame
    };
    this.kind = Modes.prompt;
    this.action = 'fill_hole';
    this.prompt = `Select hole to fill in cell ${this.info.label}`;
    this.notifyInfoChange();
  }

  startCreate() {
    // create new
    this.kind = Modes.question;
    this.action = 'create_new';
    this.prompt = 'CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)';
    this.notifyInfoChange();
  }

  startDelete() {
    // delete label from frame
    this.kind = Modes.question;
    this.action = 'delete_mask';
    this.prompt = `delete label ${this.info.label} in frame ${this.info.frame}? ${answer}`;
    this.notifyInfoChange();
  }

  startReplace() {
    // replace
    this.kind = Modes.question;
    this.action = 'replace';
    this.prompt = ('Replace ' + this.info.label_2 + ' with ' + this.info.label_1 +
      '? // SPACE = Replace in all frames / S = Replace in this frame only / ESC = Cancel replace');
    this.notifyInfoChange();
  }

  startSwap() {
    // swap
    this.kind = Modes.question;
    this.action = 'swap_cells';
    this.prompt = 'SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP';
    this.notifyInfoChange();
  }

  startWatershed() {
    // watershed
    this.kind = Modes.question;
    this.action = 'watershed';
    this.prompt = `Perform watershed to split ${this.info.label_1}? ${answer}`;
    this.notifyInfoChange();
  }

  startFlood() {
    // alt+click
    this.kind = Modes.question;
    this.action = 'flood_contiguous';
    this.info = {
      label: this.canvas.label,
      frame: this.frame,
      x_location: this.canvas.imgX,
      y_location: this.canvas.imgY
    };
    this.prompt = 'SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL';
    this.highlighted_cell_one = this.canvas.label;
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }

  startTrim() {
    // shift+click
    this.kind = Modes.question;
    this.action = 'trim_pixels';
    this.info = {
      label: this.canvas.label,
      frame: this.frame,
      x_location: this.canvas.imgX,
      y_location: this.canvas.imgY
    };
    this.prompt = 'SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL';
    this.highlighted_cell_one = this.canvas.label;
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }

  selectLabel() {
    // normal click
    this.kind = Modes.single;
    this.info = {
      label: this.canvas.label,
      frame: this.frame
    };
    this.highlighted_cell_one = this.canvas.label;
    this.highlighted_cell_two = -1;
    this.canvas.storedClickX = this.canvas.imgX;
    this.canvas.storedClickY = this.canvas.imgY;
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }



  pickConversionLabel() {
    this.brush.value = this.canvas.label;
    if (this.brush.target !== 0) {
      this.prompt = `Now drawing over label ${this.brush.target} with label ${this.brush.value}.` +
        `Use ESC to leave this mode.`;
      this.kind = Modes.drawing;
      this.notifyImageFormattingChange();
    } else {
      this.clear();
    }
  }

  pickConversionTarget() {
    this.brush.target = this.canvas.label;
    this.action = 'pick_color';
    this.prompt = 'Click on the label you want to draw with, or press "n" to draw with an unused label.';
    this.notifyInfoChange();
  }

  selectSecondLabel() {
    this.kind = Modes.multiple;

    this.highlighted_cell_one = this.info.label;
    this.highlighted_cell_two = this.canvas.label;

    this.info = {
      label_1: this.info.label,
      label_2: this.canvas.label,
      frame_1: this.info.frame,
      frame_2: this.frame,
      x1_location: this.canvas.storedClickX,
      y1_location: this.canvas.storedClickY,
      x2_location: this.canvas.imgX,
      y2_location: this.canvas.imgY
    };
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }

  reselectSecondLabel() {
    this.highlighted_cell_one = this.info.label_1;
    this.highlighted_cell_two = this.canvas.label;
    this.info = {
      label_1: this.info.label_1,
      label_2: this.canvas.label,
      frame_1: this.info.frame_1,
      frame_2: this.frame,
      x1_location: this.canvas.storedClickX,
      y1_location: this.canvas.storedClickY,
      x2_location: this.canvas.imgX,
      y2_location: this.canvas.imgY
    };
    this.notifyImageFormattingChange();
    this.notifyInfoChange();
  }

  updateThresholdBox() {
    this.brush.threshX = this.canvas.imgX;
    this.brush.threshY = this.canvas.imgY;
  }

  updateDrawTrace() {
    this.canvas.trace.push([this.canvas.imgY, this.canvas.imgX]);
  }
}
