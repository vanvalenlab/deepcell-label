class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.feature = 0;
    this.channel = 0;
    this.action = "";
    this.prompt = "";

  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;

    if (current_highlight) {
      // update img display
      render_frame();
    }

    this.action = "";
    this.prompt = "";
    render_log();
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
      render_frame();
    } else if (key === 'z') {
      // toggle rendering_raw
      rendering_raw = !rendering_raw;
      render_frame();
    }
  }

  // keybinds that apply when in edit mode
  handle_edit_keybind(key) {
    if (key === "e") {
      // toggle edit mode
      edit_mode = !edit_mode;
      render_frame();
    } else if (key === "=") {
      // increase edit_value up to max label + 1 (guaranteed unused)
      edit_value = Math.min(edit_value + 1,
          maxLabelsMap.get(this.feature) + 1);
      render_log();
    } else if (key === "-") {
      // decrease edit_value, minimum 1
      edit_value = Math.max(edit_value - 1, 1);
      render_log();
    } else if (key === "x") {
      // turn eraser on and off
      erase = !erase;
      render_log();
    } else if (key === "ArrowDown") {
      // decrease brush size, minimum size 1
      brush_size = Math.max(brush_size - 1, 1);

      // update the brush with its new size
      let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
      hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])
      brush.radius = brush_size * scale;
      brush.draw(hidden_ctx);

      // redraw the frame with the updated brush preview
      render_frame();
    } else if (key === "ArrowUp") {
      //increase brush size, shouldn't be larger than the image
      brush_size = Math.min(self.brush_size + 1,
          dimensions[0]/scale, dimensions[1]/scale);

      // update the brush with its new size
      let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
      hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])
      brush.radius = brush_size * scale;
      brush.draw(hidden_ctx);

      // redraw the frame with the updated brush preview
      render_frame();
    } else if (key === 'n') {
      // set edit value to something unused
      edit_value = maxLabelsMap.get(this.feature) + 1;
      render_log();
      // when value of brush determines color of brush, render_frame instead
    } else if (key === 'i') {
      // toggle light/dark inversion of raw img
      display_invert = !display_invert;
      render_frame();
    }
  }

  // keybinds that apply in bulk mode, nothing selected
  handle_mode_none_keybind(key) {
    if (key === "e") {
      // toggle edit mode
      edit_mode = !edit_mode;
      render_frame();
    } else if (key === "f") {
      // cycle forward one feature, if applicable
      if (feature_max > 0) {
        this.feature = this.increment_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "F") {
      // cycle backward one feature, if applicable
      if (feature_max > 0) {
        this.feature = this.decrement_value(this.feature, 0, feature_max -1);
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      }
    } else if (key === "c") {
      // cycle forward one channel, if applicable
      if (channel_max > 0) {
        this.channel = this.increment_value(this.channel, 0, channel_max -1);
        this.info = {"channel": this.channel};
        action("change_channel", this.info);
        this.clear();
      }
    } else if (key === "C") {
      // cycle backward one channel, if applicable
      if (channel_max > 0) {
        this.channel = this.decrement_value(this.channel, 0, channel_max -1);
        this.info = {"channel": this.channel};
        action("change_channel", this.info);
        this.clear();
      }
    } else if (key === "p") {
      //iou cell identity prediction
      this.kind = Modes.question;
      this.action = "predict";
      this.prompt = "Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION";
      render_log();
    } else if (key === "-" && this.highlighted_cell_one !== -1) {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      render_frame();
    } else if (key === "=" && this.highlighted_cell_one !== -1) {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      render_frame();
    }
  }

  // keybinds that apply in bulk mode, one selected
  handle_mode_single_keybind(key) {
    if (key === "f") {
      //hole fill
      this.info = { "label": this.info['label'],
                    "frame": current_frame};
      this.kind = Modes.question;
      this.action = "fill_hole";
      this.prompt = "Select hole to fill in cell " + this.info['label'];
      render_log();
    } else if (key === "c") {
      // create new
      this.kind = Modes.question;
      this.action = "create_new";
      this.prompt = "CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)";
      render_log();
    } else if (key === "x") {
      // delete label from frame
      this.kind = Modes.question;
      this.action = "delete";
      this.prompt = "delete label " + this.info.label + " in frame " + this.info.frame + "? " + answer;
      render_log();
    } else if (key === "-") {
      // cycle highlight to prev label
      this.highlighted_cell_one = this.decrement_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      render_frame();
    } else if (key === "=") {
      // cycle highlight to next label
      this.highlighted_cell_one = this.increment_value(this.highlighted_cell_one,
          1, maxLabelsMap.get(this.feature));
      // clear info but show new highlighted cell
      let temp_highlight = this.highlighted_cell_one;
      this.clear();
      this.highlighted_cell_one = temp_highlight;
      render_frame();
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
      render_log();
    } else if (key === "s") {
      // swap
      this.kind = Modes.question;
      this.action = "swap_cells";
      this.prompt = "SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP";
      render_log();
    } else if (key === "w" ) {
      // watershed
      this.kind = Modes.question;
      this.action = "watershed";
      this.prompt = "Perform watershed to split " + this.info.label_1 + "? " + answer;
      render_log();
    }
  }

  // keybinds that apply in bulk mode, answering question/prompt
  handle_mode_question_keybind(key) {
    if (key === " ") {
      if (this.action === "flood_cell") {
        action("flood_cell", this.info);
      } else if (this.action === "trim_pixels") {
        action("trim_pixels", this.info);
      } else if (this.action === "create_new"){
        action("new_cell_stack", this.info);
      } else if (this.action === "delete") {
        action("delete", this.info);
      } else if (this.action === "predict") {
        action("predict_zstack", this.info);
      } else if (this.action === "replace") {
        action("replace", this.info);
      } else if (this.action === "swap_cells") {
        action("swap_all_frame", this.info);
      } else if (this.action === "watershed") {
        action("watershed", this.info);
      }
      this.clear();
    } else if (key === "s") {
      if(this.action === "create_new"){
        action("new_single_cell", this.info);
      } else if (this.action === "predict") {
        action("predict_single", {"frame": current_frame});
      } else if (this.action === "replace") {
        action("replace_single", this.info);
      } else if (this.action === "swap_cells"){
        action("swap_single_frame", this.info);
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
    action("handle_draw", { "trace": JSON.stringify(mouse_trace), //stringify array so it doesn't get messed up
                  "edit_value": edit_value, //we don't update caliban with edit_value, etc each time they change
                  "brush_size": brush_size, //so we need to pass them in as args
                  "erase": erase,
                  "frame": current_frame});
    mouse_trace = [];
    this.clear()
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
      this.info = {"label": current_label,
                        "frame": current_frame,
                        "x_location": mouse_x,
                        "y_location": mouse_y}
      this.prompt = "SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL";
      this.highlighted_cell_one = current_label;
    } else if (evt.shiftKey) {
      // shift+click
      this.kind = Modes.question;
      this.action = "trim_pixels";
      this.info = {"label": current_label,
                        "frame": current_frame,
                        "x_location": mouse_x,
                        "y_location": mouse_y};
      this.prompt = "SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL";
      this.highlighted_cell_one = current_label;
    } else {
      // normal click
      this.kind = Modes.single;
      this.info = { "label": current_label,
                    "frame": current_frame };
      this.highlighted_cell_one = current_label;
      this.highlighted_cell_two = -1;
      temp_x = mouse_x;
      temp_y = mouse_y;
    }
  }

  handle_mode_question_click(evt) {
    if (this.action === "fill_hole" && current_label === 0) {
      this.info = { "label": this.info['label'],
                    "frame": current_frame,
                    "x_location": mouse_x,
                    "y_location": mouse_y };
      action(this.action, this.info);
      this.clear();
    }
  }

  handle_mode_single_click(evt) {
    this.kind = Modes.multiple;

    this.highlighted_cell_one = this.info.label;
    this.highlighted_cell_two = current_label;

    this.info = { "label_1": this.info.label,
                  "label_2": current_label,
                  "frame_1": this.info.frame,
                  "frame_2": current_frame,
                  "x1_location": temp_x,
                  "y1_location": temp_y,
                  "x2_location": mouse_x,
                  "y2_location": mouse_y };
  }

  handle_mode_multiple_click(evt) {
    this.highlighted_cell_one = this.info.label_1;
    this.highlighted_cell_two = current_label;

    this.info = {"label_1": this.info.label_1,
                "label_2": current_label,
                "frame_1": this.info.frame_1,
                "frame_2": current_frame,
                "x1_location": temp_x,
                "y1_location": temp_y,
                "x2_location": mouse_x,
                "y2_location": mouse_y};
  }

  click(evt) {
    if (this.kind === Modes.question) {
      // just hole fill
      this.handle_mode_question_click(evt);
    } else if (current_label === 0) {
      // same as ESC
      this.clear();
      return; //not sure why we return here
    } else if (this.kind === Modes.none) {
      //if nothing selected: shift-, alt-, or normal click
      this.handle_mode_none_click(evt);
    } else if (this.kind === Modes.single) {
      // one label already selected
      this.handle_mode_single_click(evt);
    } else if (this.kind  === Modes.multiple) {
      // two labels already selected, reselect second label
      this.handle_mode_multiple_click(evt);
    }
    render_frame();
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
var current_frame = 0;
var current_label = 0;
var current_highlight = false;
var max_frames = undefined;
var feature_max = undefined;
var channel_max = undefined;
var dimensions = undefined;
var tracks = undefined;
let maxLabelsMap = new Map();
var mode = new Mode(Modes.none, {});
var raw_image = new Image();
var seg_image = new Image();
var seg_array; // declare here so it is global var
var scale;
var mouse_x = 0;
var mouse_y = 0;
var edit_mode = false;
var edit_value = 1;
var brush_size = 1;
var erase = false;
var answer = "(SPACE=YES / ESC=NO)";
let mousedown = false;
var tooltype = 'draw';
var project_id = undefined;
var brush;
let mouse_trace = [];

function upload_file() {
  $.ajax({
    type:'POST',
    url:"upload_file/" + project_id,
    success: function (payload) {
    },
    async: false
  });
}

// image adjustment functions: take img as input and manipulate data attribute
// pixel data is 1D array of 8bit RGBA values
function contrast_image(img, contrast) {
  let d = img.data;
  contrast = (contrast / 100) + 1;
  /* let intercept = 128 * (1 - contrast); */
  for (let i = 0; i < d.length; i += 4) {
      d[i] *= contrast;
      d[i + 1] *= contrast;
      d[i + 2] *= contrast;
  }
  return img;
}

function highlight(img, label) {
  let ann = img.data;

  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;

      if (seg_array[j][i] === label){
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
  let img_y = Math.floor(mouse_y/scale) //image has been scaled by 2x
  let img_x = Math.floor(mouse_x/scale)
  let new_label = seg_array[img_y][img_x]; //check array value at mouse location
  return new_label;
}

function render_log() {
  current_label = label_under_mouse();

  $('#frame').html(current_frame);
  if (current_label != 0) {
    $('#label').html(current_label);
  } else {
    $('#label').html("");
  }


  $('#feature').html(mode.feature);
  $('#channel').html(mode.channel);

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

  if (edit_mode) {
    $('#edit_mode').html("ON");
    $('#edit_brush_row').css('visibility', 'visible');
    $('#edit_label_row').css('visibility', 'visible');
    $('#edit_erase_row').css('visibility', 'visible');

    $('#edit_brush').html(brush_size);
    $('#edit_label').html(edit_value);

    if (erase) {
      $('#edit_erase').html("ON");
    } else {
      $('#edit_erase').html("OFF");
    }

  } else {
    $('#edit_mode').html("OFF");
    $('#edit_brush_row').css('visibility', 'hidden');
    $('#edit_label_row').css('visibility', 'hidden');
    $('#edit_erase_row').css('visibility', 'hidden');
  }

  if (current_label !== 0) {
    let track = tracks[mode.feature][current_label.toString()];
    $('#slices').text(track.slices.toString());
  } else {
    $('#slices').text("");
  }
  $('#mode').html(mode.render());
}

function render_frame() {

  let ctx = $('#canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;

  if (edit_mode) { // if in edit mode, doesn't matter if raw is true or false
    // start with clean canvas
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);

    // start with raw data, adjust, then layer annotations on top
    ctx.drawImage(raw_image, 0, 0, dimensions[0], dimensions[1]);

    // editing image_data, not the actual raw_image we received from caliban.py
    let image_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);

    // apply raw contrast adjustment to image data
    contrast_image(image_data, current_contrast);

    //convert contrast adjusted image data to grayscale
    grayscale(image_data);

    // invert if needed
    if (display_invert) {
      invert(image_data);
    }

    // draw over original raw image with the adjusted raw
    ctx.putImageData(image_data, 0, 0);

    ctx.save(); // save here to store the default globalCompositeOperation
    // ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.restore(); // we only want compositing in this section, so restore
    // when finished compositing to reset composite setting

    // draw brushview on top of cells/annotations
    let hidden_canvas = document.getElementById('hidden_canvas');
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(hidden_canvas, 0,0,dimensions[0],dimensions[1]);
    ctx.restore();

  } else if (rendering_raw) { // if not edit, check whether drawing raw
    ctx.clearRect(0, 0, dimensions, dimensions[1]);
    ctx.drawImage(raw_image, 0, 0, dimensions[0], dimensions[1]);

    //contrast image
    image_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
    contrast_image(image_data, current_contrast);

    //draw contrasted image over the original
    ctx.putImageData(image_data, 0, 0);

  } else { // draw annotations
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    if (current_highlight){
      let img_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
      highlight(img_data, mode.highlighted_cell_one);
      highlight(img_data, mode.highlighted_cell_two);
      ctx.putImageData(img_data, 0, 0)
    }
  }
  render_log();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: "frame/" + current_frame + "/" + project_id,
    success: function(payload) {
      // load new value of seg_array
      // array of arrays, contains annotation data for frame
      seg_array = payload.seg_arr;
      seg_image.src = payload.segmented;
      seg_image.onload = render_frame;
      raw_image.src = payload.raw;
      raw_image.onload = render_frame;
    },
    async: false
  });
}

function load_file(file) {
  $.ajax({
    type:'POST',
    url:"load/" + file,
    success: function (payload) {
      max_frames = payload.max_frames;
      feature_max = payload.feature_max;
      channel_max = payload.channel_max;
      scale = payload.screen_scale;
      dimensions = [scale * payload.dimensions[0], scale * payload.dimensions[1]];

      tracks = payload.tracks; //tracks payload is dict

      //for each feature, get list of cell labels that are in that feature
      //(each is a key in that dict), cast to numbers, then get the maximum
      //value from each array and store it in a map
      for (let i = 0; i < Object.keys(tracks).length; i++){
        let key = Object.keys(tracks)[i]; //the keys are strings
        //use i as key in this map because it is an int, mode.feature is also int
        maxLabelsMap.set(i, Math.max(... Object.keys(tracks[key]).map(Number)));
      };

      project_id = payload.project_id;
      $('#canvas').get(0).width = dimensions[0];
      $('#canvas').get(0).height = dimensions[1];
      $('#hidden_canvas').get(0).width = dimensions[0];
      $('#hidden_canvas').get(0).height = dimensions[1];
    },
    async: false
  });
}

// adjust current_contrast upon mouse scroll
function handle_scroll(evt) {
  // adjust contrast whenever we can see raw
  if (rendering_raw || edit_mode) {
    let delta = - evt.originalEvent.deltaY / 2;
    current_contrast = Math.max(current_contrast + delta, -100);
    render_frame();
  }
}

// handle pressing mouse button (treats this as the beginning
// of click&drag, since clicks are handled by Mode.click)
function handle_mousedown(evt) {
  mousedown = true;
  mouse_x = evt.offsetX;
  mouse_y = evt.offsetY;
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
  mouse_x = evt.offsetX;
  mouse_y = evt.offsetY;
  render_log();

  // update brush preview
  if (edit_mode) {
    // hidden canvas is keeping track of the brush
    let hidden_canvas = document.getElementById('hidden_canvas');
    let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
    if (mousedown) {
      // update mouse_trace
      let img_y = Math.floor(mouse_y/scale);
      let img_x = Math.floor(mouse_x/scale);
      mouse_trace.push([img_y, img_x]);
    } else {
      hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])
    }
    brush.x = mouse_x;
    brush.y = mouse_y;
    brush.draw(hidden_ctx);
    render_frame();
  }
}

// handles end of click&drag (different from click())
function handle_mouseup(evt) {
  mousedown = false;
  if (edit_mode) {
    //send click&drag coordinates to caliban.py to update annotations
    mode.handle_draw();
    // reset brush preview
    let hidden_canvas = document.getElementById('hidden_canvas');
    let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
    hidden_ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
  }
}

function prepare_canvas() {
  // bind click on canvas
  $('#canvas').click(function(evt) {
    if (!edit_mode) {
      mode.click(evt);
    }
    render_log();
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
    url:"action/" + project_id + "/" + action + "/" + frame,
    data: info,
    success: function (payload) {
      if (payload.error) {
        alert(payload.error);
      }
      if (payload.imgs) {
        // load new value of seg_array
        // array of arrays, contains annotation data for frame
        seg_array = payload.imgs.seg_arr;

        seg_image.src = payload.imgs.segmented;
        // seg_image.onload = render_frame;
        raw_image.src = payload.imgs.raw;
        // raw_image.onload = render_frame;
      }
      if (payload.tracks) {
        tracks = payload.tracks;
      //update maxLabelsMap when we get new track info
        for (let i = 0; i < Object.keys(tracks).length; i++){
          let key = Object.keys(tracks)[i]; //the keys are strings
          maxLabelsMap.set(i, Math.max(... Object.keys(tracks[key]).map(Number)));
        }
      }
      if (payload.tracks || payload.imgs) {
        render_frame();
      }
    },
    async: false
  });
}

function start_caliban(filename) {
  load_file(filename);
  prepare_canvas();
  fetch_and_render_frame();

  brush = {
  x: 0,
  y: 0,
  radius: 1,
  color: 'red',
  draw: function(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    }
  }
}