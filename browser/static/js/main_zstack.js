class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.feature = 0;
    this._channel = 0;
    this.action = '';
    this.prompt = '';
  }

  get channel() {
    return this._channel;
  }

  set channel(num) {
    // don't try and change channel if no other channels exist
    if (channelMax > 1) {
      // save current display settings before changing
      adjuster.brightnessMap.set(this._channel, adjuster.brightness);
      adjuster.contrastMap.set(this._channel, adjuster.contrast);
      adjuster.invertMap.set(this._channel, adjuster.displayInvert);
      // change channel, wrap around if needed
      if (num === channelMax) {
        this._channel = 0;
      } else if (num < 0) {
        this._channel = channelMax - 1;
      } else {
        this._channel = num;
      }
      // get new channel image from server
      this.info = { channel: this._channel };
      action('change_channel', this.info);
      this.clear();
      // get brightness/contrast vals for new channel
      adjuster.brightness = adjuster.brightnessMap.get(this._channel);
      adjuster.contrast = adjuster.contrastMap.get(this._channel);
      adjuster.displayInvert = adjuster.invertMap.get(this._channel);
    }
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
    adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
  }

  // these keybinds apply regardless of
  // edit_mode, mode.action, or mode.kind
  handle_universal_keybind(key) {
    if (!rgb && (key === 'a' || key === 'ArrowLeft')) {
      // go backward one frame
      current_frame -= 1;
      if (current_frame < 0) {
        current_frame = max_frames - 1;
      }
      fetch_and_render_frame();
    } else if (!rgb && (key === 'd' || key === 'ArrowRight')) {
      // go forward one frame
      current_frame += 1;
      if (current_frame >= max_frames) {
        current_frame = 0;
      }
      fetch_and_render_frame();
    } else if (key === 'Escape') {
      // deselect/cancel action/reset highlight
      mode.clear();
      // may want some things here that trigger on ESC but not clear()
    } else if (!rgb && key === 'h') {
      // toggle highlight
      current_highlight = !current_highlight;
      adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
    } else if (key === 'z') {
      // toggle rendering_raw
      rendering_raw = !rendering_raw;
      render_image_display();
    } else if (key === '0') {
      // reset brightness adjustments
      adjuster.resetBrightnessContrast();
    } else if ((key === 'l' || key === 'L') && rgb && !edit_mode) {
      display_labels = !display_labels;
      render_image_display();
    } else if (key === '-') {
      changeZoom(1);
    } else if (key === '=') {
      changeZoom(-1);
    }
  }

  // keybinds that always apply in edit mode
  // (invert, change brush size)
  handle_universal_edit_keybind(key) {
    if (key === 'ArrowDown') {
      // decrease brush size, minimum size 1
      brush.size -= 1;
      // redraw the frame with the updated brush preview
      render_image_display();
    } else if (key === 'ArrowUp') {
      // increase brush size, diameter shouldn't be larger than the image
      brush.size += 1;
      // redraw the frame with the updated brush preview
      render_image_display();
    } else if (!rgb && key === 'i') {
      // toggle light/dark inversion of raw img
      adjuster.toggleInvert();
    } else if (!rgb && settings.pixel_only && (key === 'l' || key === 'L')) {
      display_labels = !display_labels;
      render_image_display();
    } else if (key === 'n') {
      // set edit value to something unused
      brush.value = maxLabelsMap.get(this.feature) + 1;
      if (this.kind === Modes.prompt && brush.conv) {
        this.prompt = `Now drawing over label ${brush.target} with label ${brush.value}. Use ESC to leave this mode.`;
        this.kind = Modes.drawing;
      }
      adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
    }
  }

  // keybinds that apply when in edit mode
  handle_edit_keybind(key) {
    if (key === 'e' && !settings.pixel_only) {
      // toggle edit mode
      edit_mode = !edit_mode;
      adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
    } else if (key === 'c') {
      // cycle forward one channel, if applicable
      this.channel += 1;
    } else if (key === 'C') {
      // cycle backward one channel, if applicable
      this.channel -= 1;
    } else if (key === 'f') {
      // cycle forward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.increment_value(this.feature, 0, feature_max - 1);
        this.info = { feature: this.feature };
        action('change_feature', this.info);
        this.clear();
      }
    } else if (key === 'F') {
      // cycle backward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.decrement_value(this.feature, 0, feature_max - 1);
        this.info = { feature: this.feature };
        action('change_feature', this.info);
        this.clear();
      }
    } else if (key === ']') {
      // increase edit_value up to max label + 1 (guaranteed unused)
      brush.value = Math.min(
        brush.value + 1,
        maxLabelsMap.get(this.feature) + 1
      );
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
      render_info_display();
    } else if (key === '[') {
      // decrease edit_value, minimum 1
      brush.value -= 1;
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
      render_info_display();
    } else if (key === 'x') {
      // turn eraser on and off
      brush.erase = !brush.erase;
      render_image_display();
    } else if (key === 'p') {
      // color picker
      this.kind = Modes.prompt;
      this.action = 'pick_color';
      this.prompt = 'Click on a label to change the brush value to that value.';
      render_info_display();
    } else if (key === 'r') {
      // conversion brush
      this.kind = Modes.prompt;
      this.action = 'pick_target';
      this.prompt = 'First, click on the label you want to overwrite.';
      brush.conv = true;
      render_image_display();
    } else if (key === 't' && !rgb) {
      // prompt thresholding with bounding box
      this.kind = Modes.question;
      this.action = 'start_threshold';
      this.prompt = 'Click and drag to create a bounding box around the area you want to threshold.';
      brush.show = false;
      brush.clearView();
      render_image_display();
    }
  }

  // keybinds that apply in bulk mode, nothing selected
  handle_mode_none_keybind(key) {
    if (key === 'e' && !settings.label_only) {
      // toggle edit mode
      edit_mode = !edit_mode;
      helper_brush_draw();
      adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
    } else if (key === 'c') {
      // cycle forward one channel, if applicable
      this.channel += 1;
    } else if (key === 'C') {
      // cycle backward one channel, if applicable
      this.channel -= 1;
    } else if (key === 'f') {
      // cycle forward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.increment_value(this.feature, 0, feature_max - 1);
        this.info = { feature: this.feature };
        action('change_feature', this.info);
        this.clear();
      }
    } else if (key === 'F') {
      // cycle backward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.decrement_value(this.feature, 0, feature_max - 1);
        this.info = { feature: this.feature };
        action('change_feature', this.info);
        this.clear();
      }
    } else if (key === 'p' && !rgb) {
      // iou cell identity prediction
      this.kind = Modes.question;
      this.action = 'predict';
      this.prompt = 'Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION';
      render_info_display();
    } else if (key === '[' && this.highlighted_cell_one !== -1) {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(
        this.highlighted_cell_one,
        1,
        maxLabelsMap.get(this.feature)
      );
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
    } else if (key === ']' && this.highlighted_cell_one !== -1) {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(
        this.highlighted_cell_one,
        1,
        maxLabelsMap.get(this.feature)
      );
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
    }
  }

  // keybinds that apply in bulk mode, one selected
  handle_mode_single_keybind(key) {
    if (key === 'f' && !rgb) {
      // hole fill
      this.info = {
        label: this.info.label,
        frame: current_frame
      };
      this.kind = Modes.prompt;
      this.action = 'fill_hole';
      this.prompt = `Select hole to fill in cell ${this.info.label}`;
      render_info_display();
    } else if (!rgb && key === 'c') {
      // create new
      this.kind = Modes.question;
      this.action = 'create_new';
      this.prompt = 'CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)';
      render_info_display();
    } else if (key === 'x') {
      // delete label from frame
      this.kind = Modes.question;
      this.action = 'delete_mask';
      this.prompt = `delete label ${this.info.label} in frame ${this.info.frame}? ${answer}`;
      render_info_display();
    } else if (key === '[') {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(
        this.highlighted_cell_one,
        1,
        maxLabelsMap.get(this.feature)
      );
      // clear info but show new highlighted cell
      const tempHighlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = tempHighlight;
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
    } else if (key === ']') {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(
        this.highlighted_cell_one,
        1,
        maxLabelsMap.get(this.feature)
      );
      // clear info but show new highlighted cell
      const tempHighlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = tempHighlight;
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      }
    }
  }

  // keybinds that apply in bulk mode, two selected
  handle_mode_multiple_keybind(key) {
    if (key === 'r') {
      // replace
      this.kind = Modes.question;
      this.action = 'replace';
      this.prompt = ('Replace ' + this.info.label_2 + ' with ' + this.info.label_1 +
        '? // SPACE = Replace in all frames / S = Replace in this frame only / ESC = Cancel replace');
      render_info_display();
    } else if (!rgb && key === 's') {
      // swap
      this.kind = Modes.question;
      this.action = 'swap_cells';
      this.prompt = 'SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP';
      render_info_display();
    } else if (key === 'w' && !rgb) {
      // watershed
      this.kind = Modes.question;
      this.action = 'watershed';
      this.prompt = `Perform watershed to split ${this.info.label_1}? ${answer}`;
      render_info_display();
    }
  }

  // keybinds that apply in bulk mode, answering question/prompt
  handle_mode_question_keybind(key) {
    if (key === ' ') {
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
    } else if (key === 's') {
      if (this.action === 'create_new') {
        action('new_single_cell', this.info);
      } else if (this.action === 'predict') {
        action('predict_single', { frame: current_frame });
      } else if (this.action === 'replace') {
        if (this.info.label_1 !== this.info.label_2 &&
            this.info.frame_1 === this.info.frame_2) {
          action('replace_single', {
            label_1: this.info.label_1,
            label_2: this.info.label_2,
            frame: this.info.frame_1
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
  }

  // handle all keypresses
  handle_key(key) {
    // universal keybinds always apply
    // keys a, d, left arrow, right arrow, ESC, h
    // are reserved for universal keybinds
    this.handle_universal_keybind(key);
    if (edit_mode) {
      this.handle_universal_edit_keybind(key);
    }
    if (edit_mode && this.kind === Modes.none) {
      this.handle_edit_keybind(key);
    } else if (!edit_mode && this.kind === Modes.none) {
      this.handle_mode_none_keybind(key);
    } else if (!edit_mode && this.kind === Modes.single) {
      this.handle_mode_single_keybind(key);
    } else if (!edit_mode && this.kind === Modes.multiple) {
      this.handle_mode_multiple_keybind(key);
    } else if (!edit_mode && this.kind === Modes.question) {
      this.handle_mode_question_keybind(key);
    }
  }

  handle_draw() {
    action('handle_draw', {
      trace: JSON.stringify(state.trace), // stringify array so it doesn't get messed up
      target_value: brush.target, // value that we're overwriting
      brush_value: brush.value, // we don't update caliban with edit_value, etc each time they change
      brush_size: brush.size, // so we need to pass them in as args
      erase: (brush.erase && !brush.conv),
      frame: current_frame
    });
    state.clearTrace();
    if (this.kind !== Modes.drawing) {
      this.clear();
    }
  }

  handle_threshold() {
    const thresholdStartY = brush.threshY;
    const thresholdStartX = brush.threshX;
    const thresholdEndX = state.imgX;
    const thresholdEndY = state.imgY;

    if (thresholdStartY !== thresholdEndY &&
        thresholdStartX !== thresholdEndX) {
      action('threshold', {
        y1: thresholdStartY,
        x1: thresholdStartX,
        y2: thresholdEndY,
        x2: thresholdEndX,
        frame: current_frame,
        label: maxLabelsMap.get(this.feature) + 1
      });
    }
    this.clear();
    render_image_display();
  }

  // helper function to increment value but cycle around if needed
  increment_value(currentValue, minValue, maxValue) {
    if (currentValue < maxValue) {
      currentValue += 1;
    } else {
      currentValue = minValue;
    }
    return currentValue;
  }

  // helper function to decrement value but cycle around if needed
  decrement_value(currentValue, minValue, maxValue) {
    if (currentValue > minValue) {
      currentValue -= 1;
    } else {
      currentValue = maxValue;
    }
    return currentValue;
  }

  // TODO: state.click(evt, mode) ?
  handle_mode_none_click(evt) {
    if (evt.altKey) {
      // alt+click
      this.kind = Modes.question;
      this.action = 'flood_contiguous';
      this.info = {
        label: state.label,
        frame: current_frame,
        x_location: state.imgX,
        y_location: state.imgY
      };
      this.prompt = 'SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL';
      this.highlighted_cell_one = state.label;
    } else if (evt.shiftKey) {
      // shift+click
      this.kind = Modes.question;
      this.action = 'trim_pixels';
      this.info = {
        label: state.label,
        frame: current_frame,
        x_location: state.imgX,
        y_location: state.imgY
      };
      this.prompt = 'SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL';
      this.highlighted_cell_one = state.label;
    } else {
      // normal click
      this.kind = Modes.single;
      this.info = {
        label: state.label,
        frame: current_frame
      };
      this.highlighted_cell_one = state.label;
      this.highlighted_cell_two = -1;
      state.storedClickX = state.imgX;
      state.storedClickY = state.imgY;
    }
  }

  handle_mode_prompt_click(evt) {
    if (this.action === 'fill_hole' && state.label === 0) {
      this.info = {
        label: this.info.label,
        frame: current_frame,
        x_location: state.imgX,
        y_location: state.imgY
      };
      action(this.action, this.info);
      this.clear();
    } else if (this.action === 'pick_color' && state.label !== 0 &&
               state.label !== brush.target) {
      brush.value = state.label;
      if (brush.target !== 0) {
        this.prompt = `Now drawing over label ${brush.target} with label ${brush.value}. Use ESC to leave this mode.`;
        this.kind = Modes.drawing;
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      } else {
        this.clear();
      }
    } else if (this.action === 'pick_target' && state.label !== 0) {
      brush.target = state.label;
      this.action = 'pick_color';
      this.prompt = 'Click on the label you want to draw with, or press "n" to draw with an unused label.';
      render_info_display();
    }
  }

  // TODO: storedClick1 and storedClick2? not a huge fan of the
  // current way click locations get stored in mode object
  handle_mode_single_click(evt) {
    this.kind = Modes.multiple;

    this.highlighted_cell_one = this.info.label;
    this.highlighted_cell_two = state.label;

    this.info = {
      label_1: this.info.label,
      label_2: state.label,
      frame_1: this.info.frame,
      frame_2: current_frame,
      x1_location: state.storedClickX,
      y1_location: state.storedClickY,
      x2_location: state.imgX,
      y2_location: state.imgY
    };
  }

  handle_mode_multiple_click(evt) {
    this.highlighted_cell_one = this.info.label_1;
    this.highlighted_cell_two = state.label;
    this.info = {
      label_1: this.info.label_1,
      label_2: state.label,
      frame_1: this.info.frame_1,
      frame_2: current_frame,
      x1_location: state.storedClickX,
      y1_location: state.storedClickY,
      x2_location: state.imgX,
      y2_location: state.imgY
    };
  }

  // TODO: lots of objects being used here, would be great to disentangle
  // or at least move out of Mode class--should act on mode object and others
  // but not sure this makes sense as a Mode method
  click(evt) {
    if (this.kind === Modes.prompt) {
      // hole fill or color picking options
      this.handle_mode_prompt_click(evt);
    } else if (state.label === 0) {
      // same as ESC
      this.clear();
    } else if (this.kind === Modes.none) {
      // if nothing selected: shift-, alt-, or normal click
      this.handle_mode_none_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    } else if (this.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    } else if (this.kind  === Modes.multiple) {
      // two labels already selected, reselect second label
      this.handle_mode_multiple_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    }
  }

  // shows up in info display as text for "state:"
  render() {
    if (this.kind === Modes.none) {
      return '';
    }
    if (this.kind === Modes.single) {
      return `SELECTED ${this.info.label}`;
    }
    if (this.kind === Modes.multiple) {
      return `SELECTED ${this.info.label_1}, ${this.info.label_2}`;
    }
    if (this.kind === Modes.question || this.kind === Modes.prompt || this.kind === Modes.drawing) {
      return this.prompt;
    }
  }
}

const Modes = Object.freeze({
  none: 1,
  single: 2,
  multiple: 3,
  question: 4,
  info: 5,
  prompt: 6,
  drawing: 7
});

const padding = 5;

const maxLabelsMap = new Map();

let rgb;

var rendering_raw = false;
var display_labels;

var current_frame = 0;
var current_highlight;
var max_frames;
var feature_max;
var channelMax;
var tracks;
var mode = new Mode(Modes.none, {});
var edit_mode;
var answer = '(SPACE=YES / ESC=NO)';
var project_id;

var tracks;

var brush;
var adjuster;
var cursor;
var state;

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

/**
 * Calculate the maximum width of the canvas display area.
 * The canvas only shares width with the table display on its left.
 */
const _calculateMaxWidth = () => {
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
const _calculateMaxHeight = () => {
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

function upload_file(cb) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/upload_file/${project_id}`,
    success: cb,
    async: true
  });
}

function changeZoom(dzoom) {
  state.changeZoom(dzoom, state.canvasPosX, state.canvasPosY);
  updateMousePos(state.rawX, state.rawY);
  render_image_display();
}

function render_highlight_info() {
  const highlightText = (current_highlight) ? 'ON' : 'OFF';
  let currentlyHighlighted = 'none';
  if (current_highlight) {
    if (edit_mode) {
      currentlyHighlighted = (brush.value > 0) ? brush.value : '-';
    } else {
      if (mode.highlighted_cell_one !== -1) {
        if (mode.highlighted_cell_two !== -1) {
          currentlyHighlighted = `${mode.highlighted_cell_one}, ${mode.highlighted_cell_two}`;
        } else {
          currentlyHighlighted = mode.highlighted_cell_one;
        }
      }
    }
  }
  document.getElementById('highlight').innerHTML = highlightText;
  document.getElementById('currently_highlighted').innerHTML = currentlyHighlighted;
}

function render_edit_info() {
  const editModeText = (edit_mode) ? 'pixels' : 'whole labels';
  document.getElementById('edit_mode').innerHTML = editModeText;

  const rowVisibility = (edit_mode) ? 'visible' : 'hidden';
  document.getElementById('edit_brush_row').style.visibility = rowVisibility;
  document.getElementById('edit_label_row').style.visibility = rowVisibility;
  document.getElementById('edit_erase_row').style.visibility = rowVisibility;

  if (edit_mode) {
    document.getElementById('edit_brush').innerHTML = brush.size;

    const editLabelText = (brush.value > 0) ? brush.value : '-';
    document.getElementById('edit_label').innerHTML = editLabelText;

    const editEraseText = (brush.erase && !brush.conv) ? 'ON' : 'OFF';
    document.getElementById('edit_erase').innerHTML = editEraseText;
  }
}

function render_cell_info() {
  if (state.label !== 0) {
    document.getElementById('label').innerHTML = state.label;
    const track = tracks[mode.feature][state.label.toString()];
    document.getElementById('slices').textContent = track.slices.toString();
  } else {
    document.getElementById('label').innerHTML = '';
    document.getElementById('slices').textContent = '';
  }
}

// updates html display of side info panel
function render_info_display() {
  // always show current frame, feature, channel
  document.getElementById('frame').innerHTML = current_frame;
  document.getElementById('feature').innerHTML = mode.feature;
  document.getElementById('channel').innerHTML = mode.channel;
  document.getElementById('zoom').innerHTML = `${state.zoom}%`;

  const displayedX = `${Math.floor(state.sx)}-${Math.ceil(state.sx + state.sWidth)}`;
  document.getElementById('displayedX').innerHTML = displayedX;

  const displayedY = `${Math.floor(state.sy)}-${Math.ceil(state.sy + state.sHeight)}`
  document.getElementById('displayedY').innerHTML = displayedY;

  render_highlight_info();

  render_edit_info();

  render_cell_info();

  // always show 'state'
  document.getElementById('mode').innerHTML = mode.render();
}

function render_edit_image(ctx) {
  if (rgb && rendering_raw) {
    render_raw_image(ctx);
  } else if (!rgb && !display_labels) {
    this.state.drawImage(ctx, adjuster.preCompRaw, padding);
  } else {
    this.state.drawImage(ctx, adjuster.postCompImg, padding);
  }
  ctx.save();
  const region = new Path2D();
  region.rect(padding, padding, state.scaledWidth, state.scaledHeight);
  ctx.clip(region);
  ctx.imageSmoothingEnabled = true;

  // draw brushview on top of cells/annotations
  brush.draw(ctx, state);

  ctx.restore();
}

function render_raw_image(ctx) {
  this.state.drawImage(ctx, adjuster.contrastedRaw, padding);
}

function render_annotation_image(ctx) {
  if (rgb && !display_labels) {
    this.state.drawImage(ctx, adjuster.postCompImg, padding);
  } else {
    this.state.drawImage(ctx, adjuster.preCompSeg, padding);
  }
}

function render_image_display() {
  const ctx = document.getElementById('canvas').getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // TODO: is there a corresponding ctx.restore to match this ctx.save?
  ctx.save();
  ctx.clearRect(
    0, 0,
    2 * padding + state.scaledWidth,
    2 * padding + state.scaledHeight
  );

  if (edit_mode) {
    // edit mode (annotations overlaid on raw + brush preview)
    render_edit_image(ctx);
  } else if (rendering_raw) {
    // draw raw image
    render_raw_image(ctx);
  } else {
    // draw annotations
    render_annotation_image(ctx);
  }
  state.drawBorders(ctx);
  render_info_display();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: `${document.location.origin}/frame/${current_frame}/${project_id}`,
    success: function(payload) {
      adjuster.rawLoaded = false;
      adjuster.segLoaded = false;

      // load new value of seg_array
      // array of arrays, contains annotation data for frame
      state.segArray = payload.seg_arr;
      adjuster.segImage.src = payload.segmented;
      adjuster.rawImage.src = payload.raw;
    },
    async: false
  });
}

function loadFile(file, rgb = false, cb) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/load/${file}?&rgb=${rgb}`,
    success: cb,
    async: true
  });
}

/**
 * Calculate available space and how much to scale x and y to fill it
 * @param {*} rawDims the raw dimensions of the input image.
 */
function setCanvasDimensions(rawDims) {
  const maxWidth = _calculateMaxWidth()
  const maxHeight = _calculateMaxHeight()

  const scaleX = maxWidth / rawDims[0];
  const scaleY = maxHeight / rawDims[1];

  // pick scale that accomodates both dimensions; can be less than 1
  const scale = Math.min(scaleX, scaleY);

  state.zoom = 100;
  state.scale = scale;
  state.setBorders(padding);

  // set canvases size according to scale
  document.getElementById('canvas').width = state.scaledWidth + 2 * padding;
  document.getElementById('canvas').height = state.scaledHeight + 2 * padding;
}

// adjust contrast, brightness, or zoom upon mouse scroll
function handleScroll(evt) {
  const canEdit = (rendering_raw || edit_mode || (rgb && !display_labels));
  if (evt.altKey) {
    changeZoom(Math.sign(evt.deltaY));
  } else if (canEdit && !evt.shiftKey) {
    adjuster.changeContrast(evt.deltaY);
  } else if (canEdit && evt.shiftKey) {
    adjuster.changeBrightness(evt.deltaY);
  }
}

// handle pressing mouse button (treats this as the beginning
// of click&drag, since clicks are handled by Mode.click)
function handleMousedown(evt) {
  state.isPressed = true;
  // TODO: refactor "mousedown + mousemove" into ondrag?
  if (!state.isSpacedown) {
    if (mode.kind !== Modes.prompt) {
      // begin drawing
      if (edit_mode) {
        if (!brush.show) {
          brush.threshX = state.imgX;
          brush.threshY = state.imgY;
        } else if (mode.kind !== Modes.prompt) {
          // not if turning on conv brush
          state.trace.push([state.imgY, state.imgX]);
        }
      }
    }
  }
}

function helper_brush_draw() {
  if (state.isCursorPressed() && !state.isSpacedown) {
    // update mouse_trace, but not if turning on conv brush
    if (mode.kind !== Modes.prompt) {
      state.trace.push([state.imgY, state.imgX]);
    }
  } else {
    brush.clearView();
  }
  brush.addToView();
}

// input will typically be evt.offsetX, evt.offsetY (mouse events)
function updateMousePos(x, y) {
  const oldImgX = state.imgX;
  const oldImgY = state.imgY;

  state.updateCursorPosition(x, y, padding);

  // if cursor has actually changed location in image
  if (oldImgX !== state.imgX || oldImgY !== state.imgY) {
    brush.x = state.imgX;
    brush.y = state.imgY;
    // update brush preview
    if (edit_mode) {
      // brush's canvas is keeping track of the brush
      if (brush.show) {
        helper_brush_draw();
      } else {
        brush.boxView();
      }
      render_image_display();
    }
  }
}

// handles mouse movement, whether or not mouse button is held down
function handleMousemove(evt) {
  if (state.isCursorPressed() && state.isSpacedown) {
    // get the old values to see if rendering is reqiured.
    const oldX = state.sx;
    const oldY = state.sy;

    const zoom = 100 / (state.zoom * state.scale)
    state.pan(evt.movementX * zoom, evt.movementY * zoom);

    if (state.sx !== oldX || state.sy !== oldY) {
      render_image_display();
    }
  }
  updateMousePos(evt.offsetX, evt.offsetY);
  render_info_display();
}

// handles end of click&drag (different from click())
function handleMouseup() {
  state.isPressed = false;
  if (!state.isSpacedown) {
    if (mode.kind !== Modes.prompt) {
      if (edit_mode) {
        if (!brush.show) {
          mode.handle_threshold();
        } else {
          // send click&drag coordinates to caliban.py to update annotations
          mode.handle_draw();
        }
        brush.refreshView();
      }
    }
  }
}

function action(action, info, frame = current_frame) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/action/${project_id}/${action}/${frame}`,
    data: info,
    success: function (payload) {
      if (payload.error) {
        alert(payload.error);
      }
      if (payload.imgs) {
        // load new value of seg_array
        // array of arrays, contains annotation data for frame
        if (Object.prototype.hasOwnProperty.call(payload.imgs, 'seg_arr')) {
          state.segArray = payload.imgs.seg_arr;
        }

        if (Object.prototype.hasOwnProperty.call(payload.imgs, 'segmented')) {
          adjuster.segLoaded = false;
          adjuster.segImage.src = payload.imgs.segmented;
        }

        if (Object.prototype.hasOwnProperty.call(payload.imgs, 'raw')) {
          adjuster.rawLoaded = false;
          adjuster.rawImage.src = payload.imgs.raw;
        }
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
        render_image_display();
      }
    },
    async: false
  });
}

function startCaliban(filename, settings) {
  rgb = settings.rgb;
  current_highlight = settings.rgb;
  display_labels = !settings.rgb;
  edit_mode = (settings.pixel_only && !settings.label_only);

  // disable scrolling from scrolling around on page (it should just control brightness)
  document.addEventListener('wheel', (event) => {
    event.preventDefault();
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

  loadFile(filename, settings.rgb, (payload) => {
    max_frames = payload.max_frames;
    feature_max = payload.feature_max;
    channelMax = payload.channel_max;
    project_id = payload.project_id;

    const rawWidth = payload.dimensions[0];
    const rawHeight = payload.dimensions[1];

    state = new CanvasState(rawWidth, rawHeight, 1, padding);

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        state.isSpacedown = true;
      }
    }, false);
    window.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        state.isSpacedown = false;
      }
    }, false);

    tracks = payload.tracks; // tracks payload is dict

    // for each feature, get list of cell labels that are in that feature
    // (each is a key in that dict), cast to numbers, then get the maximum
    // value from each array and store it in a map
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

    brush = new Brush(rawHeight, rawWidth, padding);

    // define image onload cascade behavior, need rawHeight and rawWidth first
    adjuster = new ImageAdjuster(rawWidth, rawHeight, rgb, channelMax);

    adjuster.rawImage.onload = () => adjuster.contrastRaw();
    adjuster.segImage.onload = () => adjuster.preCompAdjust(state.segArray, current_highlight, edit_mode, brush, mode);
    if (rgb) {
      adjuster.contrastedRaw.onload = () => adjuster.rawAdjust(state.segArray, current_highlight, edit_mode, brush, mode);
      adjuster.preCompSeg.onload = () => adjuster.segAdjust(state.segArray, current_highlight, edit_mode, brush, mode);
    } else {
      adjuster.contrastedRaw.onload = () => adjuster.preCompRawAdjust();
      adjuster.preCompRaw.onload = () => adjuster.rawAdjust(state.segArray, current_highlight, edit_mode, brush, mode);
      adjuster.preCompSeg.onload = () => adjuster.segAdjust(state.segArray, current_highlight, edit_mode, brush, mode);
      adjuster.compositedImg.onload = () => adjuster.postCompAdjust(state.segArray, edit_mode, brush, current_highlight);
    }

    adjuster.postCompImg.onload = render_image_display;

    document.addEventListener('mouseup', (e) => handleMouseup(e));

    setCanvasDimensions(payload.dimensions);

    // resize the canvas every time the window is resized
    window.addEventListener('resize', function() {
      waitForFinalEvent(() => {
        mode.clear();
        setCanvasDimensions(payload.dimensions);
        brush.refreshView();
      }, 500, 'canvasResize');
    });

    window.addEventListener('keydown', (evt) => {
      mode.handle_key(evt.key);
    }, false);

    const canvasElement = document.getElementById('canvas');
    // bind click on canvas
    canvasElement.addEventListener('click', (evt) => {
      if (!state.isSpacedown && (!edit_mode || mode.kind === Modes.prompt)) {
        mode.click(evt);
      }
    });

    // bind scroll wheel, change contrast of raw when scrolled
    canvasElement.addEventListener('wheel', (e) => handleScroll(e));

    // mousedown for click&drag/handle_draw DIFFERENT FROM CLICK
    canvasElement.addEventListener('mousedown', (e) => handleMousedown(e));

    // bind mouse movement
    canvasElement.addEventListener('mousemove', (e) => handleMousemove(e));

    fetch_and_render_frame();
  });
}
