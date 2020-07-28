class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.feature = 0;
    this._channel = 0;
    this.action = "";
    this.prompt = "";

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
      this.info = {"channel": this._channel};
      action("change_channel", this.info);
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

    this.action = "";
    this.prompt = "";
    adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
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
    } else if (key === "Escape") {
      // deselect/cancel action/reset highlight
      mode.clear();
      // may want some things here that trigger on ESC but not clear()
    } else if (!rgb && key === 'h') {
      // toggle highlight
      current_highlight = !current_highlight;
      adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
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
    if (key === "ArrowDown") {
      // decrease brush size, minimum size 1
      brush.size -= 1;
      // redraw the frame with the updated brush preview
      render_image_display();
    } else if (key === "ArrowUp") {
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
        this.prompt = "Now drawing over label " + brush.target + " with label " + brush.value
            + ". Use ESC to leave this mode.";
        this.kind = Modes.drawing;
      }
      adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
    }
  }

  // keybinds that apply when in edit mode
  handle_edit_keybind(key) {
    if (key === "e" && !settings.pixel_only) {
      // toggle edit mode
      edit_mode = !edit_mode;
      adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
    } else if (key === "c") {
      // cycle forward one channel, if applicable
      this.channel += 1;
    } else if (key === "C") {
      // cycle backward one channel, if applicable
      this.channel -= 1;
    } else if (key === "f") {
      // cycle forward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.increment_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "F") {
      // cycle backward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.decrement_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "]") {
      // increase edit_value up to max label + 1 (guaranteed unused)
      brush.value = Math.min(brush.value + 1,
                             maxLabelsMap.get(this.feature) + 1);
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
      render_info_display();
    } else if (key === "[") {
      // decrease edit_value, minimum 1
      brush.value -= 1;
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
      render_info_display();
    } else if (key === "x") {
      // turn eraser on and off
      brush.erase = !brush.erase;
      render_image_display();
    } else if (key === 'p') {
      // color picker
      this.kind = Modes.prompt;
      this.action = "pick_color";
      this.prompt = "Click on a label to change the brush value to that value.";
      render_info_display();
    } else if (key === 'r') {
      // conversion brush
      this.kind = Modes.prompt;
      this.action = "pick_target";
      this.prompt = "First, click on the label you want to overwrite.";
      brush.conv = true;
      render_image_display();
    } else if (key === 't' && !rgb) {
      // prompt thresholding with bounding box
      this.kind = Modes.question;
      this.action = "start_threshold";
      this.prompt = "Click and drag to create a bounding box around the area you want to threshold";
      brush.show = false;
      brush.clearView();
      render_image_display();
    }
  }

  // keybinds that apply in bulk mode, nothing selected
  handle_mode_none_keybind(key) {
    if (key === "e" && !settings.label_only) {
      // toggle edit mode
      edit_mode = !edit_mode;
      helper_brush_draw();
      adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
    } else if (key === "c") {
      // cycle forward one channel, if applicable
      this.channel += 1;
    } else if (key === "C") {
      // cycle backward one channel, if applicable
      this.channel -= 1;
    } else if (key === "f") {
      // cycle forward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.increment_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "F") {
      // cycle backward one feature, if applicable
      if (feature_max > 1) {
        this.feature = this.decrement_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "p" && !rgb) {
      //iou cell identity prediction
      this.kind = Modes.question;
      this.action = "predict";
      this.prompt = "Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION";
      render_info_display();
    } else if (key === "[" && this.highlighted_cell_one !== -1) {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
    } else if (key === "]" && this.highlighted_cell_one !== -1) {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
    }
  }

  // keybinds that apply in bulk mode, one selected
  handle_mode_single_keybind(key) {
    if (key === "f" && !rgb) {
      //hole fill
      this.info = {
        "label": this.info.label,
        "frame": current_frame
      };
      this.kind = Modes.prompt;
      this.action = "fill_hole";
      this.prompt = "Select hole to fill in cell " + this.info.label;
      render_info_display();
    } else if (!rgb && key === "c") {
      // create new
      this.kind = Modes.question;
      this.action = "create_new";
      this.prompt = "CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)";
      render_info_display();
    } else if (key === "x") {
      // delete label from frame
      this.kind = Modes.question;
      this.action = "delete";
      this.prompt = "delete label " + this.info.label + " in frame " + this.info.frame + "? " + answer;
      render_info_display();
    } else if (key === "[") {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
    } else if (key === "]") {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      }
    }
  }

  // keybinds that apply in bulk mode, two selected
  handle_mode_multiple_keybind(key) {
    if (key === "r") {
      // replace
      this.kind = Modes.question;
      this.action = "replace";
      this.prompt = ("Replace " + this.info.label_2 + " with " + this.info.label_1 +
        "? // SPACE = Replace in all frames / S = Replace in this frame only / ESC = Cancel replace");
      render_info_display();
    } else if (!rgb && key === "s") {
      // swap
      this.kind = Modes.question;
      this.action = "swap_cells";
      this.prompt = "SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP";
      render_info_display();
    } else if (key === "w" && !rgb) {
      // watershed
      this.kind = Modes.question;
      this.action = "watershed";
      this.prompt = "Perform watershed to split " + this.info.label_1 + "? " + answer;
      render_info_display();
    }
  }

  // keybinds that apply in bulk mode, answering question/prompt
  handle_mode_question_keybind(key) {
    if (key === " ") {
      if (this.action === "flood_cell") {
        action("flood_cell", this.info);
      } else if (this.action === "trim_pixels") {
        action("trim_pixels", this.info);
      } else if (this.action === "create_new") {
        action("new_cell_stack", this.info);
      } else if (this.action === "delete") {
        action("delete", this.info);
      } else if (this.action === "predict") {
        action("predict_zstack", this.info);
      } else if (this.action === "replace") {
        if (this.info.label_1 !== this.info.label_2) {
          let send_info = {"label_1": this.info.label_1,
                          "label_2": this.info.label_2};
          action("replace", send_info);
        }
      } else if (this.action === "swap_cells") {
        if (this.info.label_1 !== this.info.label_2) {
          let send_info = {"label_1": this.info.label_1,
                          "label_2": this.info.label_2};
          action("swap_all_frame", send_info);
        }
      } else if (this.action === "watershed") {
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
    } else if (key === "s") {
      if(this.action === "create_new") {
        action("new_single_cell", this.info);
      } else if (this.action === "predict") {
        action("predict_single", {"frame": current_frame});
      } else if (this.action === "replace") {
        if (this.info.label_1 !== this.info.label_2 &&
            this.info.frame_1 === this.info.frame_2) {
          let send_info = {"label_1": this.info.label_1,
                            "label_2": this.info.label_2,
                            "frame": this.info.frame_1};
          action("replace_single", send_info);
        }
      } else if (this.action === "swap_cells") {
        if (this.info.label_1 !== this.info.label_2 &&
            this.info.frame_1 === this.info.frame_2) {
          let send_info = {"label_1": this.info.label_1,
                            "label_2": this.info.label_2,
                            "frame": this.info.frame_1};
          action("swap_single_frame", send_info);
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
    action("handle_draw", {
      "trace": JSON.stringify(mouse_trace), // stringify array so it doesn't get messed up
      "target_value": brush.target, // value that we're overwriting
      "brush_value": brush.value, // we don't update caliban with edit_value, etc each time they change
      "brush_size": brush.size, // so we need to pass them in as args
      "erase": (brush.erase && !brush.conv),
      "frame": current_frame
    });
    mouse_trace = [];
    if (this.kind !== Modes.drawing) {
      this.clear();
    }
  }

  handle_threshold() {
    let threshold_start_y = brush.threshY;
    let threshold_start_x = brush.threshX;
    let threshold_end_x = imgX;
    let threshold_end_y = imgY;

    if (threshold_start_y !== threshold_end_y &&
        threshold_start_x !== threshold_end_x) {

      action("threshold", {
        "y1": threshold_start_y,
        "x1": threshold_start_x,
        "y2": threshold_end_y,
        "x2": threshold_end_x,
        "frame": current_frame,
        "label": maxLabelsMap.get(this.feature) + 1
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

  handle_mode_none_click(evt) {
    if (evt.altKey) {
      // alt+click
      this.kind = Modes.question;
      this.action = "flood_cell";
      this.info = {
        "label": current_label,
        "frame": current_frame,
        "x_location": imgX,
        "y_location": imgY
      };
      this.prompt = "SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL";
      this.highlighted_cell_one = current_label;
    } else if (evt.shiftKey) {
      // shift+click
      this.kind = Modes.question;
      this.action = "trim_pixels";
      this.info = {
        "label": current_label,
        "frame": current_frame,
        "x_location": imgX,
        "y_location": imgY
      };
      this.prompt = "SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL";
      this.highlighted_cell_one = current_label;
    } else {
      // normal click
      this.kind = Modes.single;
      this.info = {
        "label": current_label,
        "frame": current_frame
      };
      this.highlighted_cell_one = current_label;
      this.highlighted_cell_two = -1;
      storedClickX = imgX;
      storedClickY = imgY;
    }
  }

  handle_mode_prompt_click(evt) {
    if (this.action === "fill_hole" && current_label === 0) {
      this.info = {
        "label": this.info.label,
        "frame": current_frame,
        "x_location": imgX,
        "y_location": imgY
      };
      action(this.action, this.info);
      this.clear();
    } else if (this.action === "pick_color"
          && current_label !== 0
          && current_label !== brush.target) {
      brush.value = current_label;
      if (brush.target !== 0) {
        this.prompt = "Now drawing over label " + brush.target + " with label " + brush.value
            + ". Use ESC to leave this mode.";
        this.kind = Modes.drawing;
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      } else {
        this.clear();
      }
    } else if (this.action === "pick_target" && current_label !== 0) {
      brush.target = current_label;
      this.action = "pick_color";
      this.prompt = "Click on the label you want to draw with, or press 'n' to draw with an unused label.";
      render_info_display();
    }
  }

  handle_mode_single_click(evt) {
    this.kind = Modes.multiple;

    this.highlighted_cell_one = this.info.label;
    this.highlighted_cell_two = current_label;

    this.info = {
      "label_1": this.info.label,
      "label_2": current_label,
      "frame_1": this.info.frame,
      "frame_2": current_frame,
      "x1_location": storedClickX,
      "y1_location": storedClickY,
      "x2_location": imgX,
      "y2_location": imgY
    };
  }

  handle_mode_multiple_click(evt) {
    this.highlighted_cell_one = this.info.label_1;
    this.highlighted_cell_two = current_label;
    this.info = {
      "label_1": this.info.label_1,
      "label_2": current_label,
      "frame_1": this.info.frame_1,
      "frame_2": current_frame,
      "x1_location": storedClickX,
      "y1_location": storedClickY,
      "x2_location": imgX,
      "y2_location": imgY
    };
  }

  click(evt) {
    if (this.kind === Modes.prompt) {
      // hole fill or color picking options
      this.handle_mode_prompt_click(evt);
    } else if (current_label === 0) {
      // same as ESC
      this.clear();
      return; //not sure why we return here
    } else if (this.kind === Modes.none) {
      //if nothing selected: shift-, alt-, or normal click
      this.handle_mode_none_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    } else if (this.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    } else if (this.kind  === Modes.multiple) {
      // two labels already selected, reselect second label
      this.handle_mode_multiple_click(evt);
      if (current_highlight) {
        adjuster.preCompAdjust(seg_array, current_highlight, edit_mode, brush, this);
      } else {
        render_info_display();
      }
    }
  }

  //shows up in info display as text for "state:"
  render() {
    if (this.kind === Modes.none) {
      return "";
    }
    if (this.kind === Modes.single) {
      return "SELECTED " + this.info.label;
    }
    if (this.kind === Modes.multiple) {
      return "SELECTED " + this.info.label_1 + ", " + this.info.label_2;
    }
    if (this.kind === Modes.question || this.kind === Modes.prompt || this.kind === Modes.drawing) {
      return this.prompt;
    }
  }
}

var Modes = Object.freeze({
  "none": 1,
  "single": 2,
  "multiple": 3,
  "question": 4,
  "info": 5,
  "prompt": 6,
  "drawing": 7
});

let rgb;

// dimensions of raw arrays
let rawWidth;
let rawHeight;

var scale;
const padding = 5;

// mouse position variables
// mouse position on canvas, no adjustment for padding
let _rawMouseX;
let _rawMouseY;
// adjusted for padding
let canvasPosX;
let canvasPosY;
// coordinates in original image (used for actions, labels, etc)
let imgX;
let imgY;
// in original image coords
let storedClickX;
let storedClickY;

// zoom, starts at 100 percent (value set in ___)
let zoom;
// farthest amount to zoom out
let zoomLimit;

// starting indices (original coords) for displaying image
// (starts at 0, values set in ______)
let sx;
let sy;
// how far past starting indices to display
let swidth;
let sheight;

var seg_array; // declare here so it is global var

let topBorder = new Path2D();
let bottomBorder = new Path2D();
let rightBorder = new Path2D();
let leftBorder = new Path2D();

var rendering_raw = false;
let display_labels;

var current_frame = 0;
var current_label = 0;
var current_highlight;
var max_frames;
var feature_max;
var channelMax;
var dimensions;
var tracks;
let maxLabelsMap = new Map();
var mode = new Mode(Modes.none, {});
let edit_mode;
var answer = "(SPACE=YES / ESC=NO)";
let mousedown = false;
let spacedown = false;
var tooltype = 'draw';
var project_id;
let mouse_trace = [];

var brush;
var adjust;

var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();

function upload_file(cb) {
  $.ajax({
    type: 'POST',
    url: `upload_file/${project_id}`,
    success: cb,
    async: true
  });
}

// based on dx and dy, update sx and sy
function panCanvas(dx, dy) {
  let tempPanX = sx - dx;
  let tempPanY = sy - dy;
  let oldY = sy;
  let oldX = sx;
  if (tempPanX >= 0 && tempPanX + swidth < rawWidth) {
    sx = tempPanX;
  } else {
    tempPanX = Math.max(0, tempPanX);
    sx = Math.min(rawWidth - swidth, tempPanX);
  }
  if (tempPanY >= 0 && tempPanY + sheight < rawHeight) {
    sy = tempPanY;
  } else {
    tempPanY = Math.max(0, tempPanY);
    sy = Math.min(rawHeight - sheight, tempPanY);
  }
  if (sx !== oldX || sy !== oldY) {
    render_image_display();
  }
}

function changeZoom(dzoom) {
  let newZoom = zoom - 10*dzoom;
  let oldZoom = zoom;
  let newHeight = rawHeight*100/newZoom;
  let newWidth = rawWidth*100/newZoom;
  let oldHeight = sheight;
  let oldWidth = swidth;
  if (newZoom >= zoomLimit) {
    zoom = newZoom;
    sheight = newHeight;
    swidth = newWidth;
  }
  if (oldZoom !== newZoom) {
    let propX = canvasPosX/dimensions[0];
    let propY = canvasPosY/dimensions[1];
    let dx = propX*(newWidth - oldWidth);
    let dy = propY*(newHeight - oldHeight);
    panCanvas(dx, dy);
  }
  updateMousePos(_rawMouseX, _rawMouseY);
  render_image_display();
}

// check if the mouse position in canvas matches to a displayed part of image
function inRange(x, y) {
  if (x >= 0 && x < dimensions[0] &&
      y >= 0 && y < dimensions[1]) {
    return true;
  } else {
    return false;
  }
}

function label_under_mouse() {
  let new_label;
  if (inRange(canvasPosX, canvasPosY)) {
    new_label = Math.abs(seg_array[imgY][imgX]); //check array value at mouse location
  } else {
    new_label = 0;
  }
  return new_label;
}

function render_highlight_info() {
  if (current_highlight) {
    $('#highlight').html("ON");
    if (edit_mode) {
      if (brush.value > 0) {
        $('#currently_highlighted').html(brush.value)
      } else {
        $('#currently_highlighted').html('-')
      }
    } else {
      if (mode.highlighted_cell_one !== -1) {
        if (mode.highlighted_cell_two !== -1) {
          $('#currently_highlighted').html(mode.highlighted_cell_one + " , " + mode.highlighted_cell_two);
        } else {
          $('#currently_highlighted').html(mode.highlighted_cell_one);
        }
      } else {
        $('#currently_highlighted').html("none");
      }
    }
  } else {
    $('#highlight').html("OFF");
    $('#currently_highlighted').html("none");
  }
}

function render_edit_info() {
  if (edit_mode) {
    $('#edit_mode').html('pixels');
    $('#edit_brush_row').css('visibility', 'visible');
    $('#edit_label_row').css('visibility', 'visible');
    $('#edit_erase_row').css('visibility', 'visible');

    $('#edit_brush').html(brush.size);
    if (brush.value > 0) {
      $('#edit_label').html(brush.value);
    } else {
      $('#edit_label').html('-');
    }

    if (brush.erase && !brush.conv) {
      $('#edit_erase').html("ON");
    } else {
      $('#edit_erase').html("OFF");
    }

  } else {
    $('#edit_mode').html('whole labels');
    $('#edit_brush_row').css('visibility', 'hidden');
    $('#edit_label_row').css('visibility', 'hidden');
    $('#edit_erase_row').css('visibility', 'hidden');
  }
}

function render_cell_info() {
  current_label = label_under_mouse();
  if (current_label !== 0) {
    $('#label').html(current_label);
    let track = tracks[mode.feature][current_label.toString()];
    $('#slices').text(track.slices.toString());
  } else {
    $('#label').html("");
    $('#slices').text("");
  }
}

// updates html display of side info panel
function render_info_display() {
  // always show current frame, feature, channel
  $('#frame').html(current_frame);
  $('#feature').html(mode.feature);
  $('#channel').html(mode.channel);
  $('#zoom').html(`${zoom}%`);
  $('#displayedX').html(`${Math.floor(sx)}-${Math.ceil(sx+swidth)}`);
  $('#displayedY').html(`${Math.floor(sy)}-${Math.ceil(sy+sheight)}`);

  render_highlight_info();

  render_edit_info();

  render_cell_info();

  // always show 'state'
  $('#mode').html(mode.render());
}

function render_edit_image(ctx) {
  if (rgb && rendering_raw) {
    render_raw_image(ctx);
  } else if (!rgb && !display_labels) {
    ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
    ctx.drawImage(adjuster.preCompRaw, sx, sy, swidth, sheight, padding, padding, dimensions[0], dimensions[1]);
  } else {
    ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
    ctx.drawImage(adjuster.postCompImg, sx, sy, swidth, sheight, padding, padding, dimensions[0], dimensions[1]);
  }
  ctx.save();
  let region = new Path2D();
  region.rect(padding, padding, dimensions[0], dimensions[1]);
  ctx.clip(region);
  ctx.imageSmoothingEnabled = true;

  // draw brushview on top of cells/annotations
  brush.draw(ctx, sx, sy, swidth, sheight, scale*zoom/100);

  ctx.restore();
}

function render_raw_image(ctx) {
  ctx.clearRect(padding, padding, dimensions, dimensions[1]);
  ctx.drawImage(adjuster.contrastedRaw, sx, sy, swidth, sheight, padding, padding, dimensions[0], dimensions[1]);
}

function render_annotation_image(ctx) {
  ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
  if (rgb && !display_labels) {
    ctx.drawImage(adjuster.postCompImg, sx, sy, swidth, sheight, padding, padding, dimensions[0], dimensions[1]);
  } else {
    ctx.drawImage(adjuster.preCompSeg, sx, sy, swidth, sheight, padding, padding, dimensions[0], dimensions[1]);
  }
}

function drawBorders(ctx) {
  ctx.save();
  // left border
  if (Math.floor(sx) === 0) {
    ctx.fillStyle = 'white';
  } else {
    ctx.fillStyle = 'black';
  }
  ctx.fill(leftBorder);

  // right border
  if (Math.ceil(sx + swidth) === rawWidth) {
    ctx.fillStyle = 'white';
  } else {
    ctx.fillStyle = 'black';
  }
  ctx.fill(rightBorder);

  // top border
  if (Math.floor(sy) === 0) {
    ctx.fillStyle = 'white';
  } else {
    ctx.fillStyle = 'black';
  }
  ctx.fill(topBorder);

  // bottom border
  if (Math.ceil(sy + sheight) === rawHeight) {
    ctx.fillStyle = 'white';
  } else {
    ctx.fillStyle = 'black';
  }
  ctx.fill(bottomBorder);

  ctx.restore();
}

function render_image_display() {
  let ctx = $('#canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.clearRect(0, 0, 2 * padding + dimensions[0], 2 * padding + dimensions[1]);

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
  drawBorders(ctx);
  render_info_display();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: "frame/" + current_frame + "/" + project_id,
    success: function(payload) {
      adjuster.rawLoaded = false;
      adjuster.segLoaded = false;

      // load new value of seg_array
      // array of arrays, contains annotation data for frame
      seg_array = payload.seg_arr;
      adjuster.segImage.src = payload.segmented;
      adjuster.rawImage.src = payload.raw;
    },
    async: false
  });
}

function load_file(file) {
  $.ajax({
    type: 'POST',
    url: `load/${file}?&rgb=${settings.rgb}`,
    success: function (payload) {
      max_frames = payload.max_frames;
      feature_max = payload.feature_max;
      channelMax = payload.channel_max;
      rawDimensions = payload.dimensions;

      sx = 0;
      sy = 0;
      swidth = rawWidth = rawDimensions[0];
      sheight = rawHeight = rawDimensions[1];

      setCanvasDimensions(rawDimensions);

      tracks = payload.tracks; // tracks payload is dict

      // for each feature, get list of cell labels that are in that feature
      // (each is a key in that dict), cast to numbers, then get the maximum
      // value from each array and store it in a map
      for (let i = 0; i < Object.keys(tracks).length; i++){
        let key = Object.keys(tracks)[i]; // the keys are strings
        if (Object.keys(tracks[key]).length > 0) {
          // use i as key in this map because it is an int, mode.feature is also int
          maxLabelsMap.set(i, Math.max(... Object.keys(tracks[key]).map(Number)));
        } else {
          // if no labels in feature, explicitly set max label to 0
          maxLabelsMap.set(i, 0);
        }
      }
      project_id = payload.project_id;
    },
    async: false
  });
}

function setCanvasDimensions(rawDims) {
  // calculate available space and how much to scale x and y to fill it
  // only thing that shares width is the info display on left

  let maxWidth = Math.floor(
    document.getElementsByTagName('main')[0].clientWidth -
    parseInt($('main').css('marginTop')) -
    parseInt($('main').css('marginBottom')) -
    document.getElementById('table-col').clientWidth -
    parseFloat($('#table-col').css('padding-left')) -
    parseFloat($('#table-col').css('padding-right')) -
    parseFloat($('#table-col').css('margin-left')) -
    parseFloat($('#table-col').css('margin-right')) -
    parseFloat($('#canvas-col').css('padding-left')) -
    parseFloat($('#canvas-col').css('padding-right')) -
    parseFloat($('#canvas-col').css('margin-left')) -
    parseFloat($('#canvas-col').css('margin-right'))
  );

  // leave space for navbar, instructions pane, and footer
  let maxHeight = Math.floor(
    (
      (
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight
      ) -
      parseInt($('main').css('marginTop')) -
      parseInt($('main').css('marginBottom')) -
      document.getElementsByClassName('page-footer')[0].clientHeight -
      document.getElementsByClassName('collapsible')[0].clientHeight -
      document.getElementsByClassName('navbar-fixed')[0].clientHeight
    )
  );

  let scaleX = maxWidth / rawDims[0];
  let scaleY = maxHeight / rawDims[1];

  // pick scale that accomodates both dimensions; can be less than 1
  scale = Math.min(scaleX, scaleY);
  // dimensions need to maintain aspect ratio for drawing purposes
  dimensions = [scale * rawDims[0], scale * rawDims[1]];

  zoom = 100;
  zoomLimit = 100;

  // set canvases size according to scale
  $('#canvas').get(0).width = dimensions[0] + 2 * padding;
  $('#canvas').get(0).height = dimensions[1] + 2 * padding;

  // create paths for recoloring borders
  topBorder = new Path2D();
  topBorder.moveTo(0, 0);
  topBorder.lineTo(padding, padding);
  topBorder.lineTo(dimensions[0] + padding, padding);
  topBorder.lineTo(dimensions[0] + 2 * padding, 0);
  topBorder.closePath();

  bottomBorder = new Path2D();
  bottomBorder.moveTo(0, dimensions[1] + 2 * padding);
  bottomBorder.lineTo(padding, dimensions[1] + padding);
  bottomBorder.lineTo(dimensions[0] + padding, dimensions[1] + padding);
  bottomBorder.lineTo(dimensions[0] + 2 * padding, dimensions[1] + 2 * padding);
  bottomBorder.closePath();

  leftBorder = new Path2D();
  leftBorder.moveTo(0, 0);
  leftBorder.lineTo(0, dimensions[1] + 2 * padding);
  leftBorder.lineTo(padding, dimensions[1] + padding);
  leftBorder.lineTo(padding, padding);
  leftBorder.closePath();

  rightBorder = new Path2D();
  rightBorder.moveTo(dimensions[0] + 2 * padding, 0);
  rightBorder.lineTo(dimensions[0] + padding, padding);
  rightBorder.lineTo(dimensions[0] + padding, dimensions[1] + padding);
  rightBorder.lineTo(dimensions[0] + 2 * padding, dimensions[1] + 2 * padding);
  rightBorder.closePath();
}

// adjust contrast, brightness, or zoom upon mouse scroll
function handle_scroll(evt) {
  if (evt.altKey) {
    changeZoom(Math.sign(evt.originalEvent.deltaY));
  } else if ((rendering_raw || edit_mode || (rgb && !display_labels))
    && !evt.originalEvent.shiftKey) {
    adjuster.changeContrast(evt.originalEvent.deltaY);
  } else if ((rendering_raw || edit_mode || (rgb && !display_labels))
    && evt.originalEvent.shiftKey) {
    adjuster.changeBrightness(evt.originalEvent.deltaY);
  }
}

// handle pressing mouse button (treats this as the beginning
// of click&drag, since clicks are handled by Mode.click)
function handle_mousedown(evt) {
  // TODO: refactor "mousedown + mousemove" into ondrag?
  mousedown = true;
  if (!spacedown) {
    if (mode.kind !== Modes.prompt) {
      // begin drawing
      if (edit_mode) {
        if (!brush.show) {
          brush.threshX = imgX;
          brush.threshY = imgY;
        } else if (mode.kind !== Modes.prompt) {
          // not if turning on conv brush
          mouse_trace.push([imgY, imgX]);
        }
      }
    }
  }
}

function helper_brush_draw() {
  if (mousedown && !spacedown) {
    // update mouse_trace, but not if turning on conv brush
    if (mode.kind !== Modes.prompt) {
      mouse_trace.push([imgY, imgX]);
    }
  } else {
    brush.clearView();
  }
  brush.addToView();
}

// input will typically be evt.offsetX, evt.offsetY (mouse events)
function updateMousePos(x, y) {
  // store raw mouse position, in case of pan without mouse movement
  _rawMouseX = x;
  _rawMouseY = y;

  // convert to viewing pane position, to check whether to access label underneath
  canvasPosX = x - padding;
  canvasPosY = y - padding;

  // convert to image indices, to use for actions and getting label
  if (inRange(canvasPosX, canvasPosY)) {
    imgX = Math.floor((canvasPosX * 100 / (scale * zoom) + sx));
    imgY = Math.floor((canvasPosY * 100 / (scale * zoom) + sy));
    brush.x = imgX;
    brush.y = imgY;
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
function handle_mousemove(evt) {
  if (spacedown && mousedown) {
    panCanvas(
      evt.originalEvent.movementX * 100 / (zoom * scale),
      evt.originalEvent.movementY * 100 / (zoom * scale)
    );
  }

  updateMousePos(evt.offsetX, evt.offsetY);

  render_info_display();
}

// handles end of click&drag (different from click())
function handle_mouseup() {
  mousedown = false;
  if (!spacedown) {
    if (mode.kind !== Modes.prompt) {
      if (edit_mode) {
        if (!brush.show) {
          mode.handle_threshold();
        } else {
          //send click&drag coordinates to caliban.py to update annotations
          mode.handle_draw();
        }
        brush.refreshView();
      }
    }
  }
}

function prepare_canvas() {
  // bind click on canvas
  $('#canvas').click(function(evt) {
    if (!spacedown && (!edit_mode || mode.kind === Modes.prompt)) {
      mode.click(evt);
    }
  });
  // bind scroll wheel
  $('#canvas').on('wheel', function(evt) {
    // adjusts contrast of raw when scrolled
    handle_scroll(evt);
  });
  // mousedown for click&drag/handle_draw DIFFERENT FROM CLICK
  $('#canvas').mousedown(function(evt) {
    handle_mousedown(evt);
  });
  // bind mouse movement
  $('#canvas').mousemove(function(evt) {
    // handle brush preview
    handle_mousemove(evt);
  });
  // mouse button release (end of click&drag) bound to document, not just canvas
  // bind keypress
  window.addEventListener('keydown', function(evt) {
    mode.handle_key(evt.key);
  }, false);
  window.addEventListener('keydown', function(evt) {
    if (evt.key === ' ') {
      spacedown = true;
    }
  }, false);
  window.addEventListener('keyup', function(evt) {
    if (evt.key === ' ') {
      spacedown = false;
    }
  }, false);
}

function action(action, info, frame = current_frame) {
  $.ajax({
    type: 'POST',
    url: `action/${project_id}/${action}/${frame}`,
    data: info,
    success: function (payload) {
      if (payload.error) {
        alert(payload.error);
      }
      if (payload.imgs) {
        // load new value of seg_array
        // array of arrays, contains annotation data for frame
        if (payload.imgs.hasOwnProperty('seg_arr')) {
          seg_array = payload.imgs.seg_arr;
        }

        if (payload.imgs.hasOwnProperty('segmented')) {
          adjuster.segLoaded = false;
          adjuster.segImage.src = payload.imgs.segmented;
        }

        if (payload.imgs.hasOwnProperty('raw')) {
          adjuster.rawLoaded = false;
          adjuster.rawImage.src = payload.imgs.raw;
        }
      }
      if (payload.tracks) {
        tracks = payload.tracks;
        // update maxLabelsMap when we get new track info
        for (let i = 0; i < Object.keys(tracks).length; i++){
          let key = Object.keys(tracks)[i]; // the keys are strings
          if (Object.keys(tracks[key]).length > 0) {
            // use i as key in this map because it is an int, mode.feature is also int
            maxLabelsMap.set(i, Math.max(... Object.keys(tracks[key]).map(Number)));
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

function start_caliban(filename) {
  if (settings.pixel_only && !settings.label_only) {
    edit_mode = true;
  } else {
    edit_mode = false;
  }
  rgb = settings.rgb;
  if (rgb) {
    current_highlight = true;
    display_labels = false;
  } else {
    current_highlight = false;
    display_labels = true;
  }
  // disable scrolling from scrolling around on page (it should just control brightness)
  document.addEventListener('wheel', function(event) {
    event.preventDefault();
  }, {passive: false});
  // disable space and up/down keys from moving around on page
  $(document).on('keydown', function(event) {
    if (event.key === ' ') {
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
    }
  });

  // resize the canvas every time the window is resized
  $(window).resize(function () {
    waitForFinalEvent(function() {
      mode.clear();
      setCanvasDimensions(rawDimensions);
      brush.refreshView();
    }, 500, 'canvasResize');
  });

  document.addEventListener('mouseup', function() {
    handle_mouseup();
   });

  load_file(filename);

  // define image onload cascade behavior, need rawHeight and rawWidth first
  adjuster = new ImageAdjuster(width=rawWidth, height=rawHeight,
                               rgb=rgb, channelMax=channelMax);
  brush = new Brush(scale=scale, height=rawHeight, width=rawWidth, pad=padding);

  adjuster.postCompImg.onload = render_image_display;

  prepare_canvas();
  fetch_and_render_frame();

}
