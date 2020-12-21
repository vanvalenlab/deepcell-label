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
    this.frame = 0;
    this.feature = 0;
    this.channel = 0;

    // TODO: remove Modes
    this.kind = Modes.none;
    // TODO: remove info?
    // arguments passed to edit functions on backend
    this.info = {};
    // TODO: move prompt logic to view
    this.prompt = '';
    this.action = '';
    // TODO: merge highlighted cells and selected cells
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;

    this.numFrames = project.num_frames;
    this.numFeatures = project.num_features;
    this.numChannels = project.num_channels;
    this.projectID = project.token;

    this.tracks = project.tracks;
    this.maxLabelsMap = new Map();
    this.processMaxLabels(project.tracks);

    this.label = -1;
    this.secondLabel = -1;
    
    const padding = 5;
    const rawWidth = project.dimensions[0];
    const rawHeight = project.dimensions[1];
    const scale = 1;
    this.canvas = new CanvasState(rawWidth, rawHeight, scale, padding);
    this.brush = new Brush(rawHeight, rawWidth, padding);

    this.highlight = true;
    this.rgb = false;
    
    this.labelOpacity = 0.3;

    this.rawImage = new Image();
    this.segImage = new Image();
    this.segArray = null;

    this.actionID = project.action_id;
    this.actions = new History();
    this.actions.initializeHistory(project.actionFrames);

    // TODO: get rid of edit mode/whole label mode distinction
    this.edit_mode = true;
    // TODO: replace with sliding opacity
    this.rendering_raw = false;
    this.display_labels = true; // (default?)

    // only observer right now is the view
    // TODO: use Observable interface instead and allow any Observer to register
    this.view = new View(this);
  }

  // TODO: use Observable interface instead of hard-coding a single Observer
  notifyImageChange() {
    this.view.render_image_display();
  }

  notifyInfoChange() {
    this.view.render_info_display();
  }

  // update maxLabelsMap with track info
  processMaxLabels(tracks) {
    for (let i = 0; i < Object.keys(tracks).length; i++) {
      const key = Object.keys(tracks)[i]; // the keys are strings
      if (Object.keys(tracks[key]).length > 0) {
        // use i as key in this map because it is an int, mode.feature is also int
        this.maxLabelsMap.set(i, Math.max(...Object.keys(tracks[key]).map(Number)));
      } else {
        // if no labels in feature, explicitly set max label to 0
        this.maxLabelsMap.set(i, 0);
      }
    }
  }

  // getImages() {
  //   const raw = $.ajax({
  //     type: 'GET',
  //     url: `${document.location.origin}/rawimage/${this.projectID}/${this.frame}/${this.channel}`,
  //     async: true});
  //   const segImage = $.ajax({
  //     type: 'GET',
  //     url: `${document.location.origin}/labelimage/${this.projectID}/${this.frame}/${this.feature}`,
  //     async: true});
  //   const segArray = $.ajax({
  //     type: 'GET',
  //     url: `${document.location.origin}/labelarray/${this.projectID}/${this.frame}/${this.feature}`,
  //     async: true});
  //   // promise that checks when all data receives and passes it to the controller (? adjuster?)
  // }


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

  handlePayload(payload) {
    if (payload.error) {
      alert(payload.error);
    }
  
    if (payload.raw) {
      adjuster.rawLoaded = false;
      // adjuster.rawImage.src = payload.imgs.raw;
      adjuster.rawImage.src = `/rawpng/${project_id}/${current_frame}`;
      console.log(current_frame);
    }
  
    if (payload.labels) {
      adjuster.segLoaded = false;
      // adjuster.segImage.src = payload.imgs.segmented;
      adjuster.segImage.src = `/labelpng/${project_id}/${current_frame}`
      loadSegArray();
    }
  
    if (payload.tracks) {
      tracks = payload.tracks;
      // update maxLabelsMap when we get new track info
      for (let i = 0; i < Object.keys(tracks).length; i++) {
        const key = Object.keys(tracks)[i]; // the keys are strings
        if (Object.keys(tracks[key]).length > 0) {
          // use i as key in this map because it is an int, mode.feature is also int
          maxLabelsMap.set(i, Math.max(...Object.keys(tracks[key]).map(Number)));
        } else {
          // if no labels in feature, explicitly set max label to 0
          maxLabelsMap.set(i, 0);
        }
      }
    }
    if (payload.tracks || payload.imgs) {
      this.notifyImageChange();
    }
  }

  loadSegArray() {
    let numpyLoader = new npyjs();
    let segArray = [];
    numpyLoader.load(`/seg_array/${this.projectID}/${this.frame}`, 
      (array) => {
      // need to convert 1d data to 2d array
      const reshape = (arr, width) => 
        arr.reduce((rows, key, index) => (index % width == 0 ? rows.push([key]) 
          : rows[rows.length-1].push(key)) && rows, []);
      canvas.segArray = reshape(array.data, array.shape[1]);
    });
  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;

    brush.conv = false;
    brush.clearThresh();

    this.action = '';
    this.prompt = '';
    adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
  }

  action(action, info) {
    const backendAction = new BackendAction(this, action, info);
    actions.addFencedAction(backendAction);
  }
  
  undo() {
    this.actions.undo();
    this.clear();
    updateMousePos(this.canvas.rawX, this.canvas.rawY);
    this.notifyImageChange();
  }
  
  redo() {
    this.actions.redo();
    this.clear();
    updateMousePos(canvas.rawX, canvas.rawY);
    this.notifyImageChange();
  }

  changeFrame(newFrame) {
    const action = new ChangeFrame(this, newFrame);
    actions.addFencedAction(action);
  }
  
  toggleHighlight() {
    const action = new ToggleHighlight();
    actions.addFencedAction(action);
    adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
  }

  toggleRaw() {
    rendering_raw = !rendering_raw;
    this.notifyImageChange();
  }

  toggleLabels() {
    display_labels = !display_labels;
    this.notifyImageChange();
  }

  resetBrightnessContrast() {
    const action = new ResetBrightnessContrast(adjuster);
    actions.addFencedAction(action);
  }

  changeZoom(dzoom) {
    const action = new Zoom(canvas, dzoom);
    updateMousePos(canvas.rawX, canvas.rawY);
    actions.addAction(zoom);
    this.notifyImageChange();
  }

  zoomIn() {
    this.changeZoom(1);
  }

  zoomOut() {
    this.changeZoom(-1);
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
          helper_brush_draw();
        } else {
          this.brush.boxView();
        }
        this.notifyImageChange();
      }
    }
  }

  toggleEdit() {
    const toggleEdit = new ToggleEdit(this);
    actions.addFencedAction(toggleEdit);
    helper_brush_draw();
    adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
  }

  decrementFrame() {
    let changeFrame = new ChangeFrame(this, this.frame - 1);
    actions.addFencedAction(changeFrame);
  }

  incrementFrame() {
    let changeFrame = new ChangeFrame(this, this.frame + 1);
    actions.addFencedAction(changeFrame);
  }

  decrementBrushSize() {
    // decrease brush size, minimum size 1
    brush.size -= 1;
    // redraw the frame with the updated brush preview
    this.notifyImageChange();
  }

  incrementBrushSize() {
    // increase brush size, diameter shouldn't be larger than the image
    brush.size += 1;
    // redraw the frame with the updated brush preview
    this.notifyImageChange();
  }

  toggleInvert() {
    // toggle light/dark inversion of raw img
    let toggleInvert = new ToggleInvert(adjuster);
    actions.addAction(toggleInvert);
  }

  setUnusedBrushLabel() {
    // set edit value to something unused
    brush.value = maxLabelsMap.get(this.feature) + 1;
    if (this.kind === Modes.prompt && brush.conv) {
      this.prompt = `Now drawing over label ${brush.target} with label ${brush.value}. ` +
        `Use ESC to leave this mode.`;
      this.kind = Modes.drawing;
    }
    adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
  }

  incrementBrushLabel() {
    // increase edit_value up to max label + 1 (guaranteed unused)
    brush.value = Math.min(
      brush.value + 1,
      maxLabelsMap.get(this.feature) + 1
    );
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
    }
    this.notifyInfoChange();
  }

  decrementBrushLabel() {
    // decrease edit_value, minimum 1
    brush.value -= 1;
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
    }
    this.notifyInfoChange();
  }

  toggleEraser() {
    // turn eraser on and off
    brush.erase = !brush.erase;
    this.notifyImageChange();
  }

  decrementHighlightedLabel() {
    // cycle highlight to prev label, skipping 0
    let numLabels = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = (this.highlighted_cell_one + numLabels - 2).mod(numLabels) + 1;
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
    }
  }

  incrementHighlightedLabel() {
    // cycle highlight to next label (skipping 0)
    let maxLabel = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = this.highlighted_cell_one.mod(maxLabel) + 1;
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
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
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
    }
  }

  incrementSelectedLabel() {
    // cycle highlight to next label
    let maxLabel = maxLabelsMap.get(this.feature);
    this.highlighted_cell_one = this.highlighted_cell_one.mod(maxLabel) + 1;
    // clear info but show new highlighted cell
    const tempHighlight = this.highlighted_cell_one;
    this.clear();
    this.highlighted_cell_one = tempHighlight;
    if (current_highlight) {
      adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
    }
  }
  
  changeContrast(change) {
    const action = new ChangeContrast(adjuster, change);
    actions.addAction(action);
  }

  changeBrightness(change) {
    const action = new ChangeBrightness(adjuster, change);
    actions.addAction(action);
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
    brush.conv = true;
    this.notifyImageChange();
  }

  startThreshold() {
    // prompt thresholding with bounding box
    this.kind = Modes.question;
    this.action = 'start_threshold';
    this.prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
    brush.show = false;
    brush.clearView();
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
      frame: current_frame
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

  confirmActionSingleFrame() {
    if (this.action === 'create_new') {
      action('new_single_cell', this.info);
    } else if (this.action === 'predict') {
      action('predict_single', { frame: current_frame });
    } else if (this.action === 'replace') {
      if (this.info.label_1 !== this.info.label_2) {
        action('replace_single', {
          label_1: this.info.label_1,
          label_2: this.info.label_2
        });
      }
    } else if (this.action === 'swap_cells') {
      if (this.info.label_1 !== this.info.label_2 &&
          this.info.frame_1 === this.info.frame_2) {
        action('swap_single_frame', {
          label_1: this.info.label_1,
          label_2: this.info.label_2,
          frame: this.info.frame_1
        });
      }
    }
    this.clear();
  }

  confirmAction() {
    if (this.action === 'flood_contiguous') {
      action(this.action, this.info);
    } else if (this.action === 'trim_pixels') {
      action(this.action, this.info);
    } else if (this.action === 'create_new') {
      action('new_cell_stack', this.info);
    } else if (this.action === 'delete_mask') {
      action(this.action, this.info);
    } else if (this.action === 'predict') {
      action('predict_zstack', this.info);
    } else if (this.action === 'replace') {
      if (this.info.label_1 !== this.info.label_2) {
        action(this.action, {
          label_1: this.info.label_1,
          label_2: this.info.label_2
        });
      }
    } else if (this.action === 'swap_cells') {
      if (this.info.label_1 !== this.info.label_2) {
        action('swap_all_frame', {
          label_1: this.info.label_1,
          label_2: this.info.label_2
        });
      }
    } else if (this.action === 'watershed') {
      if (this.info.label_1 === this.info.label_2 &&
          this.info.frame_1 === this.info.frame_2) {
        this.info.frame = this.info.frame_1;
        this.info.label = this.info.label_1;
        delete this.info.frame_1;
        delete this.info.frame_2;
        delete this.info.label_1;
        delete this.info.label_2;
        action(this.action, this.info);
      }
    }
    this.clear();
  }






}


// var tracks;
// var mode = new Mode(Modes.none, {});
// var edit_mode;
// var project_id;

// var tracks;

// var adjuster;
// var canvas; 
// var actions;
