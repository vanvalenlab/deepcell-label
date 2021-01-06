class Controller {
  /**
   * Retrives a Project, and sets up bindings to control Label.
   * @param {string} projectID 12 character base64 ID for Project in DeepCell Label database
   */
  constructor(projectID) {
    // Get Project from database
    const getProject = $.ajax({
      type: 'GET',
      url: `${document.location.origin}/api/project/${projectID}`,
      async: true
    });

    // Create model and view for Project and setup bindings
    getProject.done((project) => {
      this.model = new Model(project);
      this.view = this.model.view;
      this.history = new History();
      // TODO: fix initializeHistory to work with new Actions
      // this.history.initializeHistory(project.actionFrames);

      this.overrideScroll();
      this.addWindowBindings();
      this.addCanvasBindings();

      this.setCanvasDimensions();

      // Load images and seg_array from payload
      this.model.segArray = project.imgs.seg_arr;
      this.model.segImage = project.imgs.segmented;
      this.model.rawImage = project.imgs.raw;

      this.addUndoBindings();
      this.view.displayUndoRedo();

    });
  }
  
  undo() {
    this.history.undo();
    this.model.clear();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
    this.model.notifyImageChange();
  }
  
  redo() {
    this.history.redo();
    this.model.clear();
    this.model.updateMousePos(this.model.canvas.rawX, this.model.canvas.rawY);
    this.model.notifyImageChange();
  }

  /**
   * Disable scrolling with the wheel (on the canvas) or with arrows (everywhere)
   */
  overrideScroll() {
    document.addEventListener('wheel', (event) => {
      if (this.model.canvas.onCanvas) event.preventDefault();
    }, { passive: false });

    // disable space and up/down keys from moving around on page
    document.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
      }
    });
  }

  /**
   * Adds bindings to the window
   */
  addWindowBindings() {
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        this.model.canvas.isSpacedown = true;
      }
    }, false);

    window.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        this.model.canvas.isSpacedown = false;
      }
    }, false);

    // TODO: why is this bound to the document instead of the window
    document.addEventListener('mouseup', (e) => this.handleMouseup(e));

    // resize the canvas every time the window is resized
    window.addEventListener('resize', () => {
      waitForFinalEvent(() => {
        this.model.clear();
        this.setCanvasDimensions();
        this.model.brush.refreshView();
        this.view.displayUndoRedo();
      }, 500, 'canvasResize');
    });

    window.addEventListener('keydown', (evt) => {
      this.handle_key(evt);
    }, false);
  }

  /**
   * Adds bindings to the interactive canvas
   */
  addCanvasBindings() {
    const canvasElement = document.getElementById('canvas');
    // bind click on canvas
    canvasElement.addEventListener('click', (evt) => {
      if (!this.model.canvas.isSpacedown && 
          (!this.model.edit_mode || this.model.kind === Modes.prompt)) {
        this.click(evt);
      }
    });
  
    // bind scroll wheel, change contrast of raw when scrolled
    canvasElement.addEventListener('wheel', (e) => this.handleScroll(e));
  
    // mousedown for click&drag/handle_draw DIFFERENT FROM CLICK
    canvasElement.addEventListener('mousedown', (e) => this.handleMousedown(e));
  
    // bind mouse movement
    canvasElement.addEventListener('mousemove', (e) => this.handleMousemove(e));
  
    // add flag for when cursor in on the canvas
    canvasElement.onmouseover = () => {
      this.model.canvas.onCanvas = true;
    }
    canvasElement.onmouseout = () => {
      this.model.canvas.onCanvas = false;
    }

  }

  addUndoBindings() {
    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');

    undoButton.onclick = () => this.undo();
    redoButton.onclick = () => this.redo();
  }

  /**
   * Calculate available space and how much to scale x and y to fill it
   */
  setCanvasDimensions() {
    const maxWidth = this._calculateMaxWidth();
    const maxHeight = this._calculateMaxHeight();

    const scaleX = maxWidth / this.model.width;
    const scaleY = maxHeight / this.model.height;

    // pick scale that accomodates both dimensions; can be less than 1
    const scale = Math.min(scaleX, scaleY);
    const padding = this.model.canvas.padding;

    this.model.canvas.zoom = 100;
    this.model.canvas.scale = scale;
    this.model.canvas.setBorders();

    // TODO: move to view?
    // set canvases size according to scale
    document.getElementById('canvas').width = this.model.canvas.scaledWidth + 2 * padding;
    document.getElementById('canvas').height = this.model.canvas.scaledHeight + 2 * padding;
  }

  /**
   * Calculate the maximum width of the canvas display area.
   * The canvas only shares width with the table display on its left.
   */
  _calculateMaxWidth() {
    const mainSection = window.getComputedStyle(
      document.getElementsByTagName('main')[0]
    );
    const tableColumn = window.getComputedStyle(
      document.getElementById('table-col')
    );
    const canvasColumn = window.getComputedStyle(
      document.getElementById('canvas-col')
    );
    const maxWidth = Math.floor(
      document.getElementsByTagName('main')[0].clientWidth -
      parseInt(mainSection.marginTop) -
      parseInt(mainSection.marginBottom) -
      document.getElementById('table-col').clientWidth -
      parseFloat(tableColumn.paddingLeft) -
      parseFloat(tableColumn.paddingRight) -
      parseFloat(tableColumn.marginLeft) -
      parseFloat(tableColumn.marginRight) -
      parseFloat(canvasColumn.paddingLeft) -
      parseFloat(canvasColumn.paddingRight) -
      parseFloat(canvasColumn.marginLeft) -
      parseFloat(canvasColumn.marginRight)
    );
    return maxWidth;
  }

  /**
   * Calculate the maximum height for the canvas display area,
   * leaving space for navbar, instructions pane, and footer.
   */
  _calculateMaxHeight() {
    const mainSection = window.getComputedStyle(
      document.getElementsByTagName('main')[0]
    );
    // leave space for navbar, instructions pane, and footer
    const maxHeight = Math.floor(
      (
        (
          window.innerHeight ||
          document.documentElement.clientHeight ||
          document.body.clientHeight
        ) -
        parseInt(mainSection.marginTop) -
        parseInt(mainSection.marginBottom) -
        document.getElementsByClassName('page-footer')[0].clientHeight -
        document.getElementsByClassName('collapsible')[0].clientHeight -
        document.getElementsByClassName('navbar-fixed')[0].clientHeight
      )
    );
    return maxHeight;
  }

  /**
   * Handle mouse scroll to adjust contrast, brightness, or zoom
   * @param {WheelEvent} evt
   */
  handleScroll(evt) {
    const rawVisible = (this.model.rendering_raw || this.model.edit_mode ||
      (this.model.rgb && !this.model.display_labels));
    if (evt.altKey) {
      this.history.addAction(new Zoom(this, this.model, Math.sign(evt.deltaY)));
      this.model.notifyImageChange();
    } else if (rawVisible && !evt.shiftKey) {
      this.history.addAction(new ChangeContrast(this.model, evt.deltaY));
    } else if (rawVisible && evt.shiftKey) {
      // shift + scroll causes horizontal scroll on mice wheels, but not trackpads
      const change = evt.deltaY === 0 ? evt.deltaX : evt.deltaY;
      this.history.addAction(new ChangeBrightness(this.model, change));
    }
  }

  /**
   * Handle beginning of click & drag. Simple clicks are handles by click.
   * @param {MouseEvent} evt mouse button press
   */
  handleMousedown(evt) {
    this.model.canvas.isPressed = true;
    // TODO: refactor "mousedown + mousemove" into ondrag?
    if (this.model.canvas.isSpacedown) return; // panning
    if (this.model.kind === Modes.prompt) return; // turning on conv mode
    if (!this.model.edit_mode) return; // only draw in edit mode
    if (!this.model.brush.show) { // draw thresholding box
      this.model.updateThresholdBox();
    } else {
      this.model.updateDrawTrace();
    }
  }

  /**
   * Handles mouse movement
   * @param {MouseEvent} evt 
   */
  handleMousemove(evt) {
    if (this.model.canvas.isCursorPressed() && this.model.canvas.isSpacedown) {
      // // get the old values to see if rendering is reqiured.
      // const oldX = this.canvas.sx;
      // const oldY = this.canvas.sy;
      const zoom = 100 / (this.canvas.zoom * this.canvas.scale)
      this.history.addAction(new Pan(this, evt.movementX * zoom, evt.movementY * zoom));
      this.model.notifyImageChange();
      // if (this.canvas.sx !== oldX || this.canvas.sy !== oldY) {
      //   this.model.notifyImageChange();
      // }
    }
    this.model.updateMousePos(evt.offsetX, evt.offsetY);
    this.model.notifyInfoChange();
  }

  /**
   * Handles end of click & drag.
   */
  handleMouseup() {
    this.model.canvas.isPressed = false;
    
    if (this.model.canvas.isSpacedown) return; // panning
    if (this.model.kind === Modes.prompt) return;
    if (!this.model.edit_mode) return;
    
    // threshold
    if (!this.model.brush.show) {
      const thresholdStartY = this.model.brush.threshY;
      const thresholdStartX = this.model.brush.threshX;
      const thresholdEndX = this.model.canvas.imgX;
      const thresholdEndY = this.model.canvas.imgY;
  
      if (thresholdStartY !== thresholdEndY &&
          thresholdStartX !== thresholdEndX) {
        this.model.action = 'threshold';
        this.model.info = {
          y1: thresholdStartY,
          x1: thresholdStartX,
          y2: thresholdEndY,
          x2: thresholdEndX,
          frame: this.model.frame,
          label: this.model.maxLabelsMap.get(this.model.feature) + 1
        };
        this.history.addFencedAction(new BackendAction(this.model));
      }
      this.model.clear();
      this.model.notifyImageChange();
    // paint
    } else if (this.model.canvas.inRange()) {
      if (this.model.canvas.trace.length !== 0) {
        this.model.action = 'handle_draw';
        this.model.info = {
          trace: JSON.stringify(this.model.canvas.trace), // stringify array so it doesn't get messed up
          target_value: this.model.brush.target, // value that we're overwriting
          brush_value: this.model.brush.value, // we don't update with edit_value, etc each time they change
          brush_size: this.model.brush.size, // so we need to pass them in as args
          erase: (this.model.brush.erase && !this.model.brush.conv),
          frame: this.model.frame
        };
        this.history.addFencedAction(new BackendAction(this.model));
      }
      this.model.canvas.clearTrace();
      if (this.model.kind !== Modes.drawing) {
        this.model.clear();
      }
    }
    this.model.brush.refreshView();
  }

  /**
   * Handles mouse clicks.
   * @param {MouseEvent} evt 
   */
  click(evt) {
    if (this.model.kind === Modes.prompt) {
      // hole fill or color picking options
      this.handle_mode_prompt_click(evt);
    } else if (this.model.canvas.label === 0) {
      // same as ESC
      this.model.clear();
    } else if (this.model.kind === Modes.none) {
      // if nothing selected: shift-, alt-, or normal click
      this.handle_mode_none_click(evt);
    } else if (this.model.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
    } else if (this.model.kind  === Modes.multiple) {
      // two labels already selected, reselect second label
      this.handle_mode_multiple_click(evt);
    }
  }


  // TODO: canvas.click(evt, mode) ?
  /**
   * Handles click when no labels are selected.
   * @param {MouseEvent} evt 
   */
  handle_mode_none_click(evt) {
    if (evt.altKey) {
      this.model.startFlood();
    } else if (evt.shiftKey) {
      this.model.startTrim();
    } else {
      this.model.selectLabel();
    }
  }

  /**
   * Handles clicks when awaiting a response to a prompt.
   * @param {MouseEvent} evt 
   */
  handle_mode_prompt_click(evt) {
    if (this.model.action === 'fill_hole' && this.model.canvas.label === 0) {
      this.model.info = {
        label: this.model.info.label,
        frame: this.model.frame,
        x_location: this.model.canvas.imgX,
        y_location: this.model.canvas.imgY
      };
      this.history.addFencedAction(new BackendAction(this.model));
      this.model.clear();
    } else if (this.model.action === 'pick_color' && this.model.canvas.label !== 0 &&
               this.model.canvas.label !== this.model.brush.target) {
      this.model.pickConversionLabel();
    } else if (this.model.action === 'pick_target' && this.model.canvas.label !== 0) {
      this.model.pickConversionTarget();
    }
  }

  // TODO: storedClick1 and storedClick2? not a huge fan of the
  // current way click locations get stored in mode object
  /**
   * Handles mouse clicks when one label is selected.
   * @param {MouseEvent} evt 
   */
  handle_mode_single_click(evt) {
    this.model.selectSecondLabel();
  }

  /**
   * Handles mouse clicks when two labels are selected.
   * @param {MouseEvent} evt 
   */
  handle_mode_multiple_click(evt) {
    this.model.reselectSecondLabel();
  }

  /**
   * Handle all keybinds
   * @param {KeyboardEvent} evt
   */
  handle_key(evt) {
    // universal keybinds always apply
    // keys a, d, left arrow, right arrow, ESC, h
    // are reserved for universal keybinds
    this.handle_universal_keybind(evt);
    if (this.model.edit_mode) {
      this.handle_universal_edit_keybind(evt);
    }
    if (this.model.edit_mode && this.model.kind === Modes.none) {
      this.handle_edit_keybind(evt);
    } else if (!this.model.edit_mode && this.model.kind === Modes.none) {
      this.handle_mode_none_keybind(evt);
    } else if (!this.model.edit_mode && this.model.kind === Modes.single) {
      this.handle_mode_single_keybind(evt);
    } else if (!this.model.edit_mode && this.model.kind === Modes.multiple) {
      this.handle_mode_multiple_keybind(evt);
    } else if (!this.model.edit_mode && this.model.kind === Modes.question) {
      this.handle_mode_question_keybind(evt);
    }
  }

  /**
   * Handle keybinds that always apply regardless of edit_mode, model.action, or model.kind
   * @param {KeyboardEvent} evt 
   */
  handle_universal_keybind(evt) {
    if ((evt.ctrlKey || evt.metaKey) && evt.shiftKey && (evt.key === 'Z' || evt.key === 'z')) {
      this.redo();
    } else if ((evt.ctrlKey || evt.metaKey) && (evt.key === 'Z' || evt.key === 'z')) {
      this.undo();
    } else if (this.model.numFrames > 1 && (evt.key === 'a' || evt.key === 'ArrowLeft')) {
      this.history.addFencedAction(new ChangeFrame(this.model, this.model.frame - 1));
    } else if (this.model.numFrames > 1 && (evt.key === 'd' || evt.key === 'ArrowRight')) {
      this.history.addFencedAction(new ChangeFrame(this.model, this.model.frame + 1));
    } else if (evt.key === 'Escape') {
      this.model.clear();
      // may want some things here that trigger on ESC but not clear()
    } else if (!this.model.rgb && evt.key === 'h') {
      this.history.addFencedAction(new ToggleHighlight(this.model));
    } else if (evt.key === 'z') {
      this.model.rendering_raw = !this.model.rendering_raw;
    } else if (evt.key === '0') {
      this.history.addFencedAction(new ResetBrightnessContrast(this.model));
    } else if ((evt.key === 'l' || evt.key === 'L') && this.model.rgb && !this.model.edit_mode) {
      this.model.display_labels = !this.model.display_labels;
    } else if (evt.key === '-') {
      this.history.addAction(new Zoom(this, this.model, 1));
      this.model.notifyImageChange();
    } else if (evt.key === '=') {
      this.history.addAction(new Zoom(this, this.model, -1));
      this.model.notifyImageChange();
    }
  }

  /**
   * Handle keybinds that always apply in edit mode.
   * @param {KeyboardEvent} evt 
   */
  handle_universal_edit_keybind(evt) {
    if (evt.key === 'ArrowDown') {
      this.model.brush.size -= 1;
    } else if (evt.key === 'ArrowUp') {
      this.model.brush.size += 1;
    } else if (!this.model.rgb && evt.key === 'i') {
      this.history.addAction(new ToggleInvert(this.model));
    } else if (!this.model.rgb && settings.pixel_only && (evt.key === 'l' || evt.key === 'L')) {
      this.model.display_labels = !this.model.display_labels;
    } else if (evt.key === 'n') {
      this.model.setUnusedBrushLabel();
    }
  }

  /**
   * Handle keybinds that apply when in edit mode.
   * @param {KeyboardEvent} evt 
   */
  handle_edit_keybind(evt) {
    if (evt.key === 'e' && !settings.pixel_only) {
      this.history.addFencedAction(new ToggleEdit(this.model));
    } else if (this.model.numChannels > 1 && evt.key === 'c') {
      this.history.addFencedAction(new ChangeChannel(this.model, this.model.channel + 1));
    } else if (this.model.numChannels > 1 && evt.key === 'C') {
      this.history.addFencedAction(new ChangeChannel(this.model, this.model.channel - 1));
    } else if (this.model.numFeatures > 1 && evt.key === 'f') {
      this.history.addFencedAction(new ChangeFeature(this.model, this.model.feature + 1));
    } else if (this.model.numFeatures > 1 && evt.key === 'F') {
      this.history.addFencedAction(new ChangeFeature(this.model, this.model.feature - 1));
    } else if (evt.key === ']') {
      this.model.brush.value += 1;
    } else if (evt.key === '[') {
      this.model.brush.value -= 1;
    } else if (evt.key === 'x') {
      this.model.brush.erase = !this.model.brush.erase;
    } else if (evt.key === 'p') {
      this.model.startColorPicker();
    } else if (evt.key === 'r') {
      this.model.startConversionBrush();
    } else if (evt.key === 't' && !this.model.rgb) {
      this.model.startThreshold();
    }
  }

  /**
   * Handle keybinds that apply in bulk mode with nothing selected.
   * @param {KeyboardEvent} evt 
   */
  handle_mode_none_keybind(evt) {
    if (evt.key === 'e' && !settings.label_only) {
      this.history.addFencedAction(new ToggleEdit(this.model));
    } else if (this.model.numChannels > 1 && evt.key === 'c') {
      this.history.addFencedAction(new ChangeChannel(this.model, this.model.channel + 1));
    } else if (this.model.numChannels > 1 && evt.key === 'C') {
      this.history.addFencedAction(new ChangeChannel(this.model, this.model.channel - 1));
    } else if (this.model.numFeatures > 1 && evt.key === 'f') {
      this.history.addFencedAction(new ChangeFeature(this.model, this.model.feature + 1));
    } else if (this.model.numFeatures > 1 && evt.key === 'F') {
      this.history.addFencedAction(new ChangeFeature(this.model, this.model.feature - 1));
    } else if (this.model.numFrames > 1 && evt.key === 'p') {
      this.model.startPredict();
    } else if (evt.key === '[' && this.model.highlighted_cell_one !== -1) {
      // cycle highlight to prev label, skipping 0
      const maxLabel = this.model.maxLabelsMap.get(this.model.feature);
      this.model.highlighted_cell_one = (this.model.highlighted_cell_one + maxLabel - 2).mod(maxLabel) + 1;
    } else if (evt.key === ']' && this.model.highlighted_cell_one !== -1) {
      // cycle highlight to next label (skipping 0)
      const maxLabel = this.model.maxLabelsMap.get(this.model.feature);
      this.model.highlighted_cell_one = this.model.highlighted_cell_one.mod(maxLabel) + 1;
    }
  }

  /**
   * Handle keybinds that apply in bulk mode with one selected
   * @param {KeyboardEvent} evt 
   */
  handle_mode_single_keybind(evt) {
    if (evt.key === 'f') {
      this.model.startFill();
    } else if (evt.key === 'c') {
      this.model.startCreate();
    } else if (evt.key === 'x') {
      this.model.startDelete();
    } else if (evt.key === '[') {
      this.model.decrementSelectedLabel();
    } else if (evt.key === ']') {
      this.model.incrementSelectedLabel();
    }
  }

  /**
   * Handle keybinds that apply in bulk mode with two selected
   * @param {KeyboardEvent} evt 
   */
  handle_mode_multiple_keybind(evt) {
    if (evt.key === 'r') {
      this.model.startReplace();
    } else if (evt.key === 's') {
      this.model.startSwap();
    } else if (evt.key === 'w' && !this.model.rgb) {
      this.model.startWatershed();
    }
  }

  /**
   * Handle keybinds that apply in bulk mode when answering question/prompt
   * @param {KeyboardEvent} evt 
   */
  handle_mode_question_keybind(evt) {
    if (evt.key === ' ') {
      this.confirmAction();
      this.model.clear();
    } else if (evt.key === 's') {
      this.confirmActionSingleFrame();
      this.model.clear();
    }
  }

  /**
   * Validates action name and arguments,
   * then sends action to the Label backend.
   */
  confirmAction() {
    const action = this.model.action;
    const info = this.model.info;
    if (action === 'flood_contiguous') {
    } else if (action === 'trim_pixels') {
    } else if (action === 'create_new') {
      this.model.action = 'new_cell_stack';
    } else if (action === 'delete_mask') {
    } else if (action === 'predict') {
      this.model.action = 'predict_zstack';
    } else if (action === 'replace') {
      if (info.label_1 === info.label_2) {
        alert('Cannot replace a label with itself.')
        return;
      }
      this.model.info = {label_1: info.label_1,
                         label_2: info.label_2};
    } else if (action === 'swap_cells') {
      if (info.label_1 === info.label_2) {
        alert('Cannot swap a label with itself.')
        return;
      }
      this.model.action = 'swap_all_frame';
      this.model.info = {label_1: info.label_1,
                         label_2: info.label_2};
    } else if (action === 'watershed') {
      if (info.label_1 !== info.label_2) {
        alert('Must select same label twice to split with watershed.')
        return;
      }
      if (info.frame_1 !== info.frame_2) {
        alert('Must select seeds on same frame to split with watershed.')
        return;
      }
      let info = this.model.info;
      info.frame = info.frame_1;
      info.label = info.label_1;
      delete info.frame_1;
      delete info.frame_2;
      delete info.label_1;
      delete info.label_2;
      this.model.info = info;
    // Do nothing when action not listed above
    } else {
      alert(`Unrecognized action ${this.model.action}`);
      return;
    }
    this.history.addFencedAction(new BackendAction(this.model));
  }

  /**
   * Validates single-frame action name and arguments,
   * then sends action to the Label backend.
   */
  confirmActionSingleFrame() {
    const action = this.model.action;
    const info = this.model.info;
    if (action === 'create_new') {
      this.model.action = 'new_single_cell';
    } else if (action === 'predict') {
      this.model.action = 'predict_single';
      this.model.info = {frame: this.model.frame};
    } else if (action === 'replace') {
      if (info.label_1 === info.label_2) {
        alert('Cannot replace a label with itself.');
        return;
      }
      this.model.action = 'replace_single';
      this.model.info = {label_1: info.label_1,
                         label_2: info.label_2};
    } else if (action === 'swap_cells') {
      if (info.label_1 === info.label_2) {
        alert('Cannot swap a label with itself.');
        return;
      }
      if (info.frame_1 !== info.frame_2) {
        alert('Must swap cells on the same frame.');
        return;
      }
      this.model.action = 'swap_single_frame';
      this.model.info = {label_1: info.label_1,
                         label_2: info.label_2,
                         frame: info.frame_1};
    } else {
      // Do nothing if action not listed above
      alert(`Unrecognized single-frame action ${this.model.action}`);
      return;
    }
    this.history.addFencedAction(new BackendAction(this.model));
  }
}

/**
 * Delays an event callback to prevent calling the callback too frequently.
 */
const waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout(timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();