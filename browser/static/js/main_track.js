class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.action = "";
    this.prompt = "";
  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    //reset highlighting in image if this is being shown
    if (current_highlight) {
      render_image_display();
    }
    this.action = "";
    this.prompt = "";
    render_info_display();
  }

  // these keybinds apply regardless of
  // edit_mode, mode.action, or mode.kind
  handle_universal_keybind(key) {
    if (key === 'a' || key === 'ArrowLeft') {
      // go backward one frame
      current_frame -= 1;
      if (current_frame < 0) {
        current_frame = max_frames - 1;
      }
      fetch_and_render_frame();
    } else if (key === 'd' || key === 'ArrowRight') {
      // go forward one frame
      current_frame += 1;
      if (current_frame >= max_frames) {
        current_frame = 0;
      }
      fetch_and_render_frame();
    } else if (key === "Escape") {
      // deselect/cancel action/reset highlight
      mode.clear();
    } else if (key === 'h') {
      // toggle highlight
      current_highlight = !current_highlight;
      render_image_display();
    } else if (key === 'z') {
      // toggle rendering_raw
      rendering_raw = !rendering_raw;
      render_image_display();
    } else if (key === '0') {
      // reset brightness adjustments
      brightness = 0;
      current_contrast = 0;
      render_image_display();
    }
  }

  // keybinds that apply when in edit mode
  handle_edit_keybind(key) {
    if (key === "e") {
      // toggle edit mode
      edit_mode = !edit_mode;
      render_image_display();
    } else if (key === "=") {
      // increase edit_value up to max label + 1 (guaranteed unused)
      brush.value = Math.min(brush.value + 1, maxTrack + 1);
      render_info_display();
    } else if (key === "-") {
      // decrease edit_value, minimum 1
      brush.value -= 1;
      render_info_display();
    } else if (key === "x") {
      // turn eraser on and off
      brush.erase = !brush.erase;
      render_image_display();
    } else if (key === "ArrowDown") {
      // decrease brush size, minimum size 1
      brush.size -= 1;
      // redraw the frame with the updated brush preview
      render_image_display();
    } else if (key === "ArrowUp") {
      // increase brush size, diameter shouldn't be larger than the image
      brush.size += 1;
      // redraw the frame with the updated brush preview
      render_image_display();
    } else if (key === 'n') {
      // set edit value to something unused
      brush.value = maxTrack + 1;
      render_info_display();
      // when value of brush determines color of brush, render_image instead
    } else if (key === 'i') {
      // toggle light/dark inversion of raw img
      display_invert = !display_invert;
      render_image_display();
    }
  }

  // keybinds that apply in bulk mode, nothing selected
  handle_mode_none_keybind(key) {
    if (key === "e") {
      // toggle edit mode
      edit_mode = !edit_mode;
      render_image_display();
    } else if (key === "-" && this.highlighted_cell_one !== -1) {
      // cycle highlight to prev label
      if (this.highlighted_cell_one === 1) {
        this.highlighted_cell_one = maxTrack;
      } else {
        this.highlighted_cell_one -= 1;
      }
      render_image_display();
    } else if (key === "=" && this.highlighted_cell_one !== -1) {
      // cycle highlight to next label
      if (this.highlighted_cell_one === maxTrack) {
        this.highlighted_cell_one = 1;
      } else {
        this.highlighted_cell_one += 1;
      }
      render_image_display();
    }
  }

  // keybinds that apply in bulk mode, one selected
  handle_mode_single_keybind(key) {
    if (key === "f") {
      // hole fill
      this.info = {
        "label": this.info['label'],
        "frame": current_frame
      };
      this.kind = Modes.question;
      this.action = "fill_hole";
      this.prompt = "Select hole to fill in cell " + this.info['label'];
      render_info_display();
    } else if (key === "c") {
      // create new
      this.kind = Modes.question;
      this.action = "new_track";
      this.prompt = "CREATE NEW (SPACE=ALL SUBSEQUENT FRAMES / S=ONLY THIS FRAME / ESC=CANCEL)";
      render_info_display();
    } else if (key === "x") {
      // delete label from frame
      this.kind = Modes.question;
      this.action = "delete_mask";
      this.prompt = "delete label " + this.info.label + " in frame " + this.info.frame + "? " + answer;
      render_info_display();
    } else if (key === "-") {
      // cycle highlight to prev label
      if (this.highlighted_cell_one === 1) {
        this.highlighted_cell_one = maxTrack;
      } else {
        this.highlighted_cell_one -= 1;
      }
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      render_image_display();
    } else if (key === "=") {
      // cycle highlight to next label
      if (this.highlighted_cell_one === maxTrack) {
        this.highlighted_cell_one = 1;
      } else {
        this.highlighted_cell_one += 1;
      }
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      render_image_display();
    }
  }

  // keybinds that apply in bulk mode, two selected
  handle_mode_multiple_keybind(key) {
    if (key === "p") {
      // set parent
      this.kind = Modes.question;
      this.action = "set_parent";
      this.prompt = "Set " + this.info.label_1 + " as parent of " + this.info.label_2 + "? " + answer;
      render_info_display();
    } else if (key === "r") {
      // replace
      this.kind = Modes.question;
      this.action = "replace";
      this.prompt = "Replace " + this.info.label_2 + " with " + this.info.label_1 + "? " + answer;
      render_info_display();
    } else if (key === "s") {
      // swap
      this.kind = Modes.question;
      this.action = "swap_cells";
      this.prompt = "SPACE = SWAP IN ALL FRAMES / S = SWAP IN ONLY ONE FRAME / ESC = CANCEL SWAP";
      render_info_display();
    } else if (key === "w") {
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
      if (this.action === "flood_contiguous") {
        action("flood_contiguous", this.info);
      } else if (this.action === "trim_pixels") {
        action("trim_pixels", this.info);
      } if (this.action === "new_track") {
        action("new_track", this.info);
      } else if (this.action === "delete_mask") {
        action(this.action, this.info);
      } else if (this.action === "set_parent") {
        if (this.info.label_1 !== this.info.label_2 &&
          this.info.frame_1 < this.info.frame_2) {
          let send_info = {
            "label_1": this.info.label_1,
            "label_2": this.info.label_2
          };
          action(this.action, send_info);
        }
      } else if (this.action === "replace") {
        if (this.info.label_1 !== this.info.label_2) {
          let send_info = {
            "label_1": this.info.label_1,
            "label_2": this.info.label_2
          };
          action(this.action, send_info);
        }
      } else if (this.action === "swap_cells") {
        if (this.info.label_1 !== this.info.label_2) {
          let send_info = {
            "label_1": this.info.label_1,
            "label_2": this.info.label_2
          };
          action("swap_tracks", send_info);
        }
      } else if (this.action === "watershed") {
        if (this.info.frame_1 === this.info.frame_2 &&
          this.info.label_1 === this.info.label_2) {
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
      if (this.action === "new_track") {
        action("new_single_cell", this.info);
      } else if (this.action === "swap_cells") {
        if (this.info.label_1 !== this.info.label_2 &&
          this.info.frame_1 === this.info.frame_2) {
          let send_info = {
            "label_1": this.info.label_1,
            "label_2": this.info.label_2,
            "frame": this.info.frame_1
          };
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
    this.clear()
  }

  handle_mode_none_click(evt) {
    if (evt.altKey) {
      // alt+click
      this.kind = Modes.question;
      this.action = "flood_contiguous";
      this.info = {
        "label": current_label,
        "frame": current_frame,
        "x_location": mouse_x,
        "y_location": mouse_y
      }
      this.prompt = "SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL";
      this.highlighted_cell_one = current_label;
    } else if (evt.shiftKey) {
      // shift+click
      this.kind = Modes.question;
      this.action = "trim_pixels";
      this.info = {
        "label": current_label,
        "frame": current_frame,
        "x_location": mouse_x,
        "y_location": mouse_y
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
      temp_x = mouse_x;
      temp_y = mouse_y;
    }
  }

  handle_mode_question_click(evt) {
    if (this.action === "fill_hole" && current_label === 0) {
      this.info = {
        "label": this.info['label'],
        "frame": current_frame,
        "x_location": mouse_x,
        "y_location": mouse_y
      };
      action(this.action, this.info);
      this.clear();
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
      "x1_location": temp_x,
      "y1_location": temp_y,
      "x2_location": mouse_x,
      "y2_location": mouse_y
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
      "x1_location": temp_x,
      "y1_location": temp_y,
      "x2_location": mouse_x,
      "y2_location": mouse_y
    };
  }

  click(evt) {
    if (this.kind === Modes.question) {
      // just hole fill
      this.handle_mode_question_click(evt);
    } else if (current_label === 0) {
      // same as ESC
      this.clear();
      return;
    } else if (this.kind === Modes.none) {
      // if nothing selected, shift-, alt-, or normal click:
      this.handle_mode_none_click(evt);
    } else if (this.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
    } else if (this.kind  === Modes.multiple) {
      this.handle_mode_multiple_click(evt);
    }
    render_image_display();
  }

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
    if (this.kind === Modes.question) {
      return this.prompt;
    }
  }
}

var Modes = Object.freeze({
  "none": 1,
  "single": 2,
  "multiple": 3,
  "question": 4,
  "info": 5
});

var temp_x = 0;
var temp_y = 0;
var rendering_raw = false;
let display_invert = true;
var current_contrast = 0;
let brightness = 0;
var current_frame = 0;
var current_label = 0;
var current_highlight = false;
var max_frames = undefined;
var dimensions = undefined;
var tracks = undefined;
var maxTrack;
var mode = new Mode(Modes.none, {});
var raw_image = new Image();
var seg_image = new Image();
var seg_array;
var scale;
var mouse_x = 0;
var mouse_y = 0;
const padding = 5;
var edit_mode = false;
let mousedown = false;
var answer = "(SPACE=YES / ESC=NO)";
var project_id = undefined;
var brush;
let mouse_trace = [];

function upload_file(cb) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/upload_file/${project_id}`,
    success: cb,
    async: true
  });
}

// image adjustment functions: take img as input and manipulate data attribute
// pixel data is 1D array of 8bit RGBA values
function contrast_image(img, contrast) {
  let d = img.data;
  contrast = (contrast / 100) + 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i]*contrast + brightness;
    d[i + 1] = d[i+1]*contrast + brightness;
    d[i + 2] = d[i+2]*contrast + brightness;
  }
  return img;
}

function highlight(img, label) {
  let ann = img.data;

  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;

      if (Math.abs(seg_array[j][i]) === label){
        // fill in all pixels affected by scale
        // k and l get the pixels that are part of the original pixel that has been scaled up
        for (var k = 0; k < scale; k +=1) {
          for (var l = 0; l < scale; l +=1) {
            // location in 1D array based on i,j, and scale
            pixel_num = (scale*(jlen*(scale*j + l) + i)) + k;

            // set to red by changing RGB values
            ann[(pixel_num*4)] = 255;
            ann[(pixel_num*4) + 1] = 0;
            ann[(pixel_num*4) + 2] = 0;
          }
        }
      }
    }
  }
}

function grayscale(img) {
  let data = img.data;
  for (var i = 0; i < data.length; i += 4) {
      var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i]     = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
  return img
}

function invert(img) {
  let data = img.data;
  for (var i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];     // red
    data[i + 1] = 255 - data[i + 1]; // green
    data[i + 2] = 255 - data[i + 2]; // blue
    }
  return img
}

function label_under_mouse() {
  let img_y = Math.floor(mouse_y/scale);
  let img_x = Math.floor(mouse_x/scale);
  let new_label;
  if (img_y >= 0 && img_y < seg_array.length &&
      img_x >= 0 && img_x < seg_array[0].length) {
    new_label = Math.abs(seg_array[img_y][img_x]); //check array value at mouse location
  } else {
    new_label = 0;
  }
  return new_label;
}

function render_highlight_info() {
  if (current_highlight) {
    $('#highlight').html("ON");
    if (mode.highlighted_cell_one !== -1) {
      if (mode.highlighted_cell_two !== -1) {
        $('#currently_highlighted').html(mode.highlighted_cell_one + " , " + mode.highlighted_cell_two);
      } else {
        $('#currently_highlighted').html(mode.highlighted_cell_one);
      }
    } else {
      $('#currently_highlighted').html("none");
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
    $('#edit_label').html(brush.value);

    if (brush.erase) {
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
    let track = tracks[current_label.toString()];
    $('#parent').text(track.parent || "None");
    $('#daughters').text("[" + track.daughters.toString() + "]");
    $('#frame_div').text(track.frame_div || "None");
    let capped = track.capped.toString();
    $('#capped').text(capped[0].toUpperCase() + capped.substring(1));
    $('#frames').text(track.slices.toString());
  } else {
    $('#label').html("");
    $('#capped').text("");
    $('#parent').text("");
    $('#daughters').text("");
    $('#frame_div').text("");
    $('#frames').text("");
  }
}

// updates html display of side info panel
function render_info_display() {
  // always show current frame
  $('#frame').html(current_frame);

  render_highlight_info();

  render_edit_info();

  render_cell_info();

  // always show 'state'
  $('#mode').html(mode.render());
}

function render_edit_image(ctx) {
  ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
  ctx.drawImage(raw_image, padding, padding, dimensions[0], dimensions[1]);
  let image_data = ctx.getImageData(padding, padding, dimensions[0], dimensions[1]);

  // adjust underlying raw image
  contrast_image(image_data, current_contrast);
  grayscale(image_data);
  if (display_invert) {
    invert(image_data);
  }
  ctx.putImageData(image_data, padding, padding);

  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.drawImage(seg_image, padding, padding, dimensions[0], dimensions[1]);
  ctx.restore();

  ctx.save();
  const region = new Path2D();
  region.rect(padding, padding, dimensions[0], dimensions[1]);
  ctx.clip(region);
  ctx.imageSmoothingEnabled = true;

  // draw brushview on top of cells/annotations
  brush.draw(ctx, 0, 0, dimensions[0], dimensions[1], 1);
  ctx.restore();
}

function render_raw_image(ctx) {
  ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
  ctx.drawImage(raw_image, padding, padding, dimensions[0], dimensions[1]);

  // contrast image
  image_data = ctx.getImageData(padding, padding, dimensions[0], dimensions[1]);
  contrast_image(image_data, current_contrast);
  // draw contrasted image over the original
  ctx.putImageData(image_data, padding, padding);
}

function render_annotation_image(ctx) {
  ctx.clearRect(padding, padding, dimensions[0], dimensions[1]);
  ctx.drawImage(seg_image, padding, padding, dimensions[0], dimensions[1]);
  if (current_highlight) {
    let img_data = ctx.getImageData(padding, padding, dimensions[0], dimensions[1]);
    highlight(img_data, mode.highlighted_cell_one);
    highlight(img_data, mode.highlighted_cell_two);
    ctx.putImageData(img_data, padding, padding);
  }
}

function render_image_display() {
  let ctx = $('#canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;

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
  render_info_display();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: `${document.location.origin}/frame/${current_frame}/${project_id}`,
    success: function(payload) {
      // load new value of seg_array
      // array of arrays, contains annotation data for frame
      seg_array = payload.seg_arr;
      seg_image.src = payload.segmented;
      seg_image.onload = render_image_display;
      raw_image.src = payload.raw;
      raw_image.onload = render_image_display;
    },
    async: false
  });
}

function load_file(file) {
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/load/${file}`,
    success: function (payload) {
      max_frames = payload.max_frames;
      scale = payload.screen_scale;
      dimensions = [scale * payload.dimensions[0], scale * payload.dimensions[1]];
      tracks = payload.tracks[0];

      maxTrack = Math.max(... Object.keys(tracks).map(Number));

      project_id = payload.project_id;
      $('#canvas').get(0).width = dimensions[0] + 2*padding;
      $('#canvas').get(0).height = dimensions[1] + 2*padding;
    },
    async: false
  });
}

// adjust current_contrast upon mouse scroll
function handle_scroll(evt) {
  // adjust contrast whenever we can see raw
  if ((rendering_raw || edit_mode) && !evt.originalEvent.shiftKey) {
    // don't use magnitude of scroll
    let mod_contrast = -Math.sign(evt.originalEvent.deltaY) * 4;
    // stop if fully desaturated
    current_contrast = Math.max(current_contrast + mod_contrast, -100);
    // stop at 5x contrast
    current_contrast = Math.min(current_contrast + mod_contrast, 400);
    render_image_display();
  } else if ((rendering_raw || edit_mode) && evt.originalEvent.shiftKey) {
    let mod = -Math.sign(evt.originalEvent.deltaY);
    brightness = Math.min(brightness + mod, 255);
    brightness = Math.max(brightness + mod, -512);
    render_image_display();
  }
}

// handle pressing mouse button (treats this as the beginning
// of click&drag, since clicks are handled by Mode.click)
function handle_mousedown(evt) {
  mousedown = true;
  mouse_x = evt.offsetX - padding;
  mouse_y = evt.offsetY - padding;
  // begin drawing
  if (edit_mode) {
    let img_y = Math.floor(mouse_y/scale);
    let img_x = Math.floor(mouse_x/scale);
    mouse_trace.push([img_y, img_x]);
  }
}

// handles mouse movement, whether or not mouse button is held down
function handle_mousemove(evt) {
  // update displayed info depending on where mouse is
  mouse_x = evt.offsetX - padding;
  mouse_y = evt.offsetY - padding;
  brush.x = mouse_x;
  brush.y = mouse_y;
  render_info_display();

  // update brush preview
  if (edit_mode) {
    // brush's canvas is keeping track of the brush
    if (mousedown) {
      // update mouse_trace
      let img_y = Math.floor(mouse_y/scale);
      let img_x = Math.floor(mouse_x/scale);
      mouse_trace.push([img_y, img_x]);
    } else {
      brush.clearView();
    }
    brush.addToView();
    render_image_display();
  }
}

// handles end of click&drag (different from click())
function handle_mouseup(evt) {
  mousedown = false;
  if (edit_mode) {
    //send click&drag coordinates to caliban.py to update annotations
    mode.handle_draw();
    // reset brush preview
    brush.refreshView();
  }
}

function prepare_canvas() {
  // bind click
  $('#canvas').click(function(evt) {
    if (!edit_mode) {
      mode.click(evt);
    }
    render_info_display();
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
  // bind mouse button release (end of click&drag)
  $('#canvas').mouseup(function(evt) {
    handle_mouseup(evt);
  });
  // bind keypress
  window.addEventListener('keydown', function(evt) {
    mode.handle_key(evt.key);
  }, false);
}

function action(action, info, frame = current_frame) {
  $.ajax({
    type:'POST',
    url:`${document.location.origin}/action/${project_id}/${action}/${frame}`,
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
          seg_image.src = payload.imgs.segmented;
        }

        if (payload.imgs.hasOwnProperty('raw')) {
          raw_image.src = payload.imgs.raw;
        }
      }
      if (payload.tracks) {
        tracks = payload.tracks[0];
        maxTrack = Math.max(... Object.keys(tracks).map(Number));
      }
      if (payload.tracks || payload.imgs) {
        render_image_display();
      }
    },
    async: false
  });
}

function startCaliban(filename, settings) {
  // disable scrolling from scrolling around on page (it should just control brightness)
  document.addEventListener('wheel', function(event) {
    event.preventDefault();
  }, { passive: false });
  // disable space and up/down keys from moving around on page
  document.addEventListener('keydown', function(event) {
    if (event.key === ' ') {
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
    }
  });

  load_file(filename);
  prepare_canvas();
  fetch_and_render_frame();

  brush = new Brush(scale=scale, height=dimensions[1], width=dimensions[0], pad = padding);
}
