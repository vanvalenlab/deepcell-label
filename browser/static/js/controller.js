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
      canvas.onCanvas = true;
    }
    canvasElement.onmouseout = () => {
      canvas.onCanvas = false;
    }

  }

  addUndoBindings() {
    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');

    undoButton.onclick = () => this.model.undo();
    redoButton.onclick = () => this.model.redo();
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
      this.model.changeZoom(Math.sign(evt.deltaY));
    } else if (rawVisible && !evt.shiftKey) {
      this.model.changeContrast(evt.deltaY);
    } else if (rawVisible && evt.shiftKey) {
      // shift + scroll causes horizontal scroll on mice wheels, but not trackpads
      const change = evt.deltaY === 0 ? evt.deltaX : evt.deltaY;
      this.model.changeBrightness(change);
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
      this.model.pan(evt.movementX, evt.movementY);
    }
    this.model.updateMousePos(evt.offsetX, evt.offsetY);
    this.model.notifyInfoChange();
  }

  /**
   * Handles end of click & drag.
   */
  handleMouseup() {
    this.model.canvas.isPressed = false;
    if (!this.model.canvas.isSpacedown
        && this.model.kind !== Modes.prompt
        && this.model.edit_mode) {
      if (!this.model.brush.show) {
        this.model.threshold();
      } else if (this.model.canvas.inRange()) {
        // send click&drag coordinates to label.py to update annotations
        this.model.draw();
      }
      this.model.brush.refreshView();
    }
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
    if (this.action === 'fill_hole' && canvas.label === 0) {
      this.model.finishFill();
    } else if (this.action === 'pick_color' && canvas.label !== 0 &&
               canvas.label !== brush.target) {
      this.model.pickConversionLabel();
    } else if (this.action === 'pick_target' && canvas.label !== 0) {
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
      this.model.redo();
    } else if ((evt.ctrlKey || evt.metaKey) && (evt.key === 'Z' || evt.key === 'z')) {
      this.model.undo();
    } else if (this.model.numFrames > 1 && (evt.key === 'a' || evt.key === 'ArrowLeft')) {
      this.model.decrementFrame();
    } else if (this.model.numFrames > 1 && (evt.key === 'd' || evt.key === 'ArrowRight')) {
      this.model.incrementFrame();
    } else if (evt.key === 'Escape') {
      this.model.clear();
      // may want some things here that trigger on ESC but not clear()
    } else if (!this.model.rgb && evt.key === 'h') {
      this.model.toggleHighlight();
    } else if (evt.key === 'z') {
      this.model.toggleRaw();
    } else if (evt.key === '0') {
      this.model.resetBrightnessContrast();
    } else if ((evt.key === 'l' || evt.key === 'L') && this.model.rgb && !this.model.edit_mode) {
      this.model.toggleLabels();
    } else if (evt.key === '-') {
      this.model.changeZoom(1);
    } else if (evt.key === '=') {
      this.model.changeZoom(-1);
    }
  }

  /**
   * Handle keybinds that always apply in edit mode.
   * @param {KeyboardEvent} evt 
   */
  handle_universal_edit_keybind(evt) {
    if (evt.key === 'ArrowDown') {
      this.model.decrementBrushSize();
    } else if (evt.key === 'ArrowUp') {
      this.model.incrementBrushSize();
    } else if (!this.model.rgb && evt.key === 'i') {
      this.model.toggleInvert();
    } else if (!this.model.rgb && settings.pixel_only && (evt.key === 'l' || evt.key === 'L')) {
      this.model.toggleLabels();
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
      this.model.toggleEdit();
    } else if (this.model.numChannels > 1 && evt.key === 'c') {
      this.model.incrementChannel();
    } else if (this.model.numChannels > 1 && evt.key === 'C') {
      this.model.decrementChannel();
    } else if (this.model.numFeatures > 1 && evt.key === 'f') {
      this.model.incrementFeature();
    } else if (this.model.numFeatures > 1 && evt.key === 'F') {
      this.model.incrementFeature();
    } else if (evt.key === ']') {
      this.model.incrementBrushLabel();
    } else if (evt.key === '[') {
      this.model.decrementBrushLabel();
    } else if (evt.key === 'x') {
      this.model.toggleEraser();
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
      this.model.toggleEdit();
    } else if (this.model.numChannels > 1 && evt.key === 'c') {
      this.model.incrementChannel();
    } else if (this.model.numChannels > 1 && evt.key === 'C') {
      this.model.decrementChannel();
    } else if (this.model.numFeatures > 1 && evt.key === 'f') {
      this.model.incrementFeature();
    } else if (this.model.numFeatures > 1 && evt.key === 'F') {
      this.model.decrementFeature();
    } else if (this.model.numFrames > 1 && evt.key === 'p') {
      this.model.startPredict();
    } else if (evt.key === '[' && this.model.highlighted_cell_one !== -1) {
      this.model.decrementHighlightedLabel();
    } else if (evt.key === ']' && this.model.highlighted_cell_one !== -1) {
      this.model.incrementHighlightedLabel();
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
      this.model.confirmAction();
    } else if (evt.key === 's') {
      this.model.confirmActionSingleFrame();
    }
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