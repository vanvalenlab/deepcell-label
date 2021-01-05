class Controller {

  constructor(projectID) {
    const getProject = $.ajax({
      type: 'GET',
      url: `${document.location.origin}/api/project/${projectID}`,
      async: true
    });

    getProject.done((project) => {
      // ??? make a new model? attribute of the controller? register controller with model?
      this.model = new Model(project);
      this.view = this.model.view;
      this.overrideScroll();
      this.addWindowBindings();
      this.addCanvasBindings();
      // this.addBrowsingBindings(project);

      this.setCanvasDimensions(project.dimensions);

      // Load images and seg_array from payload
      this.model.segArray = project.imgs.seg_arr;
      this.model.segImage = project.imgs.segmented;
      this.model.rawImage = project.imgs.raw;

      this.addUndoBindings();
      this.view.displayUndoRedo();

    });
  }

  overrideScroll() {
    // disable scrolling from scrolling around on page (it should just control brightness)
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

    document.addEventListener('mouseup', (e) => this.handleMouseup(e));

    // resize the canvas every time the window is resized
    window.addEventListener('resize', function() {
      waitForFinalEvent(() => {
        this.model.clear();
        this.model.setCanvasDimensions(payload.dimensions);
        this.model.brush.refreshView();
        displayUndoRedo();
      }, 500, 'canvasResize');
    });

    window.addEventListener('keydown', (evt) => {
      this.handle_key(evt);
    }, false);
  }

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
   * @param {*} rawDims the raw dimensions of the input image.
   */
  setCanvasDimensions(rawDims) {
    const maxWidth = this._calculateMaxWidth();
    const maxHeight = this._calculateMaxHeight();

    const scaleX = maxWidth / rawDims[0];
    const scaleY = maxHeight / rawDims[1];

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

  // MOUSETRAP BINDINGS BELOW

  // // add universal keybinds
  // addInitialKeybinds() {
  //   Mousetrap.bind('ctrl+z', () => this.model.undo() );
  //   Mousetrap.bind('ctrl+Z', () => this.model.redo() );
  //   Mousetrap.bind('esc', () => this.model.clear() );
  //   Mousetrap.bind('0', () => this.model.resetBrightnessContrast() );
  //   Mousetrap.bind('-', () => this.model.zoomOut() );
  //   Mousetrap.bind('=', () => this.model.zoomIn() );
  //   Mousetrap.bind('z', () => this.model.toggleRaw() );
  //   Mousetrap.bind('h', () => this.model.toggleHighlight() );
  //   Mousetrap.bind('l', () => this.model.toggleLabels() );
  //   // TODO: check that these keybinds should be always available
  //   Mousetrap.bind('e', () => this.model.toggleEditMode() );  // TODO: remove edit_mode
  // }

  // // add keybinds based on project shape
  // addBrowsingBindings(project) {
  //   if (project.numFrames > 1) {
  //     Mousetrap.bind(['a', 'left'], () => this.model.decrementFrame() );
  //     Mousetrap.bind(['d', 'right'], () => this.model.incrementFrame() );
  //   }
  //   if (project.numChannels > 1) {
  //     Mousetrap.bind('c', () => this.model.incrementChannel() );
  //     Mousetrap.bind('C', () => this.model.decrementChannel() );
  //   }
  //   if (project.numFeatures > 1) {
  //     Mousetrap.bind('f', () => this.model.incrementFeature() );
  //     Mousetrap.bind('F', () => this.model.decrementFeature() );
  //   }
  // }

  // addEditModeBindings() {
  //   // TODO: combine picking brush label & selecting label
  //   Mousetrap.bind('p'), () => this.model.pickColor() );

  //   Mousetrap.bind('up', () => this.model.incrementBrushSize() );
  //   Mousetrap.bind('down', () => this.model.decrementBrushSize() );
  //   Mousetrap.bind('i', () => this.model.toggleInvert() );
  //   Moustrap.bind('n', () => this.model.setUnusedBrushLabel() );

  //   Mousetrap.bind(']', () => this.model.incrementBrushLabel() );
  //   Mousetrap.bind('[', () => this.model.decrementBrushLabel() );
  //   Mousetrap.bind('x', () => this.model.toggleEraser() );
  // }

  // addNoneModeBindings() {
  //   Mousetrap.bind(']', () => this.model.incrementHighlightedLabel() );
  //   Mousetrap.bind('[', () => this.model.decrementHighlightedLabel() );
  // }

  // adjust contrast, brightness, or zoom upon mouse scroll
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

  // handle pressing mouse button (treats this as the beginning
  // of click&drag, since clicks are handled by Mode.click)
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

  // handles mouse movement, whether or not mouse button is held down
  handleMousemove(evt) {
    if (this.model.canvas.isCursorPressed() && this.model.canvas.isSpacedown) {
      this.model.pan(evt.movementX, evt.movementY);
    }
    this.model.updateMousePos(evt.offsetX, evt.offsetY);
    this.model.notifyInfoChange();
  }

  // handles end of click&drag (different from click())
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

// start click handling

  // TODO: lots of objects being used here, would be great to disentangle
  // or at least move out of Mode class--should act on mode object and others
  // but not sure this makes sense as a Mode method
  click(evt) {
    if (this.model.kind === Modes.prompt) {
      // hole fill or color picking options
      this.handle_mode_prompt_click(evt);
    } else if (this.model.canvas.label === 0) {
      // same as ESC
      this.model.clear();
    // TODO: why are we updating adjusted/info after each handler?
    } else if (this.model.kind === Modes.none) {
      // if nothing selected: shift-, alt-, or normal click
      this.handle_mode_none_click(evt);
      if (this.model.highlight) {
        this.model.notifyImageFormattingChange();
      } else {
        this.model.notifyInfoChange();
      }
    } else if (this.model.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
      if (this.model.highlight) {
        this.model.notifyImageFormattingChange();
      } else {
        this.model.notifyInfoChange();
      }
    } else if (this.model.kind  === Modes.multiple) {
      // two labels already selected, reselect second label
      this.handle_mode_multiple_click(evt);
      if (this.model.highlight) {
        this.model.notifyImageFormattingChange();
      } else {
        this.model.notifyInfoChange();
      }
    }
  }


  // TODO: canvas.click(evt, mode) ?
  handle_mode_none_click(evt) {
    if (evt.altKey) {
      this.model.startFlood();
    } else if (evt.shiftKey) {
      this.model.startTrim();
    } else {
      this.model.selectLabel();
    }
  }

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
  handle_mode_single_click(evt) {
    this.model.selectSecondLabel();
  }

  handle_mode_multiple_click(evt) {
    this.model.reselectSecondLabel();
  }




// start action handling



// TODO: convert commented handlers to mousetrap bindings
// deleted sections have already been converted


//   // handle all keypresses
//   handle_key(evt) {
//     // universal keybinds always apply
//     // keys a, d, left arrow, right arrow, ESC, h
//     // are reserved for universal keybinds
//     this.handle_universal_keybind(evt);
//     if (edit_mode) {
//       this.handle_universal_edit_keybind(evt);
//     }
//     if (edit_mode && this.kind === Modes.none) {
//       this.handle_edit_keybind(evt);
//     } else if (!edit_mode && this.kind === Modes.none) {
//       this.handle_mode_none_keybind(evt);
//     } else if (!edit_mode && this.kind === Modes.single) {
//       this.handle_mode_single_keybind(evt);
//     } else if (!edit_mode && this.kind === Modes.multiple) {
//       this.handle_mode_multiple_keybind(evt);
//     } else if (!edit_mode && this.kind === Modes.question) {
//       this.handle_mode_question_keybind(evt);
//     }
//   }
// }


// // keybinds that apply when in edit mode
// handle_edit_keybind(evt) {


//   } else if (evt.key === 'p') {
//     // color picker
//     this.kind = Modes.prompt;
//     this.action = 'pick_color';
//     this.prompt = 'Click on a label to change the brush label to that label.';
//     render_info_display();
//   } else if (evt.key === 'r') {
//     // conversion brush
//     this.kind = Modes.prompt;
//     this.action = 'pick_target';
//     this.prompt = 'First, click on the label you want to overwrite.';
//     brush.conv = true;
//     render_image_display();
//   } else if (evt.key === 't' && !rgb) {
//     // prompt thresholding with bounding box
//     this.kind = Modes.question;
//     this.action = 'start_threshold';
//     this.prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
//     brush.show = false;
//     brush.clearView();
//     render_image_display();
//   }
// }

// // keybinds that apply in bulk mode, nothing selected
// handle_mode_none_keybind(evt) {
//   } else if (numFrames > 1 && evt.key === 'p') {
//     // iou cell identity prediction
//     this.kind = Modes.question;
//     this.action = 'predict';
//     this.prompt = 'Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION';
//     render_info_display();
//   }
// }

// // keybinds that apply in bulk mode, one selected
// handle_mode_single_keybind(evt) {
//   if (evt.key === 'f') {
//     // hole fill
//     this.info = {
//       label: this.info.label,
//       frame: current_frame
//     };
//     this.kind = Modes.prompt;
//     this.action = 'fill_hole';
//     this.prompt = `Select hole to fill in cell ${this.info.label}`;
//     render_info_display();
//   } else if (evt.key === 'c') {
//     // create new
//     this.kind = Modes.question;
//     this.action = 'create_new';
//     this.prompt = 'CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)';
//     render_info_display();
//   } else if (evt.key === 'x') {
//     // delete label from frame
//     this.kind = Modes.question;
//     this.action = 'delete_mask';
//     this.prompt = `delete label ${this.info.label} in frame ${this.info.frame}? ${answer}`;
//     render_info_display();
//   } else if (evt.key === '[') {
//     // cycle highlight to prev label, skipping 0
//     let numLabels = maxLabelsMap.get(this.feature);
//     this.highlighted_cell_one = (this.highlighted_cell_one + numLabels - 2).mod(numLabels) + 1;
//     // clear info but show new highlighted cell
//     const tempHighlight = this.highlighted_cell_one;
//     this.clear();
//     this.highlighted_cell_one = tempHighlight;
//     if (current_highlight) {
//       adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
//     }
//   } else if (evt.key === ']') {
//     // cycle highlight to next label
//     let maxLabel = maxLabelsMap.get(this.feature);
//     this.highlighted_cell_one = this.highlighted_cell_one.mod(maxLabel) + 1;
//     // clear info but show new highlighted cell
//     const tempHighlight = this.highlighted_cell_one;
//     this.clear();
//     this.highlighted_cell_one = tempHighlight;
//     if (current_highlight) {
//       adjuster.preCompAdjust(canvas.segArray, current_highlight, edit_mode, brush, this);
//     }
//   }
// }

// // keybinds that apply in bulk mode, two selected
// handle_mode_multiple_keybind(evt) {
//   if (evt.key === 'r') {
//     // replace
//     this.kind = Modes.question;
//     this.action = 'replace';
//     this.prompt = ('Replace ' + this.info.label_2 + ' with ' + this.info.label_1 +
//       '? // SPACE = Replace in all frames / S = Replace in this frame only / ESC = Cancel replace');
//     render_info_display();
//   } else if (evt.key === 's') {
//     // swap
//     this.kind = Modes.question;
//     this.action = 'swap_cells';
//     this.prompt = 'SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP';
//     render_info_display();
//   } else if (evt.key === 'w' && !rgb) {
//     // watershed
//     this.kind = Modes.question;
//     this.action = 'watershed';
//     this.prompt = `Perform watershed to split ${this.info.label_1}? ${answer}`;
//     render_info_display();
//   }
// }

// // keybinds that apply in bulk mode, answering question/prompt
// handle_mode_question_keybind(evt) {
//   if (evt.key === ' ') {
//     if (this.action === 'flood_contiguous') {
//       action(this.action, this.info);
//     } else if (this.action === 'trim_pixels') {
//       action(this.action, this.info);
//     } else if (this.action === 'create_new') {
//       action('new_cell_stack', this.info);
//     } else if (this.action === 'delete_mask') {
//       action(this.action, this.info);
//     } else if (this.action === 'predict') {
//       action('predict_zstack', this.info);
//     } else if (this.action === 'replace') {
//       if (this.info.label_1 !== this.info.label_2) {
//         action(this.action, {
//           label_1: this.info.label_1,
//           label_2: this.info.label_2
//         });
//       }
//     } else if (this.action === 'swap_cells') {
//       if (this.info.label_1 !== this.info.label_2) {
//         action('swap_all_frame', {
//           label_1: this.info.label_1,
//           label_2: this.info.label_2
//         });
//       }
//     } else if (this.action === 'watershed') {
//       if (this.info.label_1 === this.info.label_2 &&
//           this.info.frame_1 === this.info.frame_2) {
//         this.info.frame = this.info.frame_1;
//         this.info.label = this.info.label_1;
//         delete this.info.frame_1;
//         delete this.info.frame_2;
//         delete this.info.label_1;
//         delete this.info.label_2;
//         action(this.action, this.info);
//       }   
//     }
//     this.clear();
//   } else if (evt.key === 's') {
//     if (this.action === 'create_new') {
//       action('new_single_cell', this.info);
//     } else if (this.action === 'predict') {
//       action('predict_single', { frame: current_frame });
//     } else if (this.action === 'replace') {
//       if (this.info.label_1 !== this.info.label_2) {
//         action('replace_single', {
//           label_1: this.info.label_1,
//           label_2: this.info.label_2
//         });
//       }
//     } else if (this.action === 'swap_cells') {
//       if (this.info.label_1 !== this.info.label_2 &&
//           this.info.frame_1 === this.info.frame_2) {
//         action('swap_single_frame', {
//           label_1: this.info.label_1,
//           label_2: this.info.label_2,
//           frame: this.info.frame_1
//         });
//       }
//     }
//     this.clear();
//   }




  // NO MOUSETRAP BELOW

  // these keybinds apply regardless of
  // edit_mode, mode.action, or mode.kind
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
      // deselect/cancel action/reset highlight
      this.model.clear();
      // may want some things here that trigger on ESC but not clear()
    } else if (!this.model.rgb && evt.key === 'h') {
      // toggle highlight
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

  // keybinds that always apply in edit mode
  // (invert, change brush size)
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

  // keybinds that apply when in edit mode
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

  // keybinds that apply in bulk mode, nothing selected
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

  // keybinds that apply in bulk mode, one selected
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

  // keybinds that apply in bulk mode, two selected
  handle_mode_multiple_keybind(evt) {
    if (evt.key === 'r') {
      this.model.startReplace();
    } else if (evt.key === 's') {
      this.model.startSwap();
    } else if (evt.key === 'w' && !this.model.rgb) {
      this.model.startWatershed();
    }
  }

  // keybinds that apply in bulk mode, answering question/prompt
  handle_mode_question_keybind(evt) {
    if (evt.key === ' ') {
      this.model.confirmAction();
    } else if (evt.key === 's') {
      this.model.confirmActionSingleFrame();
    }
  }

  // handle all keypresses
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