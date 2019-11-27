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
      render_frame();
    }
    this.action = "";
    this.prompt = "";
    render_log();
  }

  handle_key(key) {

    if (edit_mode) {
      //keybinds to change value of brush
      if (key === "=") {
        edit_value += 1; //increase edit_value, no upper limit
        render_log(); //update display to show new edit_value
      } else if (key === "-") {
        edit_value = Math.max(edit_value - 1, 1); //decrease edit_value, minimum 1
        render_log(); //update display to show new edit_value
      } else if (key === "x") {
        //turn eraser on and off
        erase = !erase;
        render_log();
      //keybinds to change brush size
      } else if (key === ",") { //decrease brush size, minimum size 1
        brush_size = Math.max(brush_size - 1, 1);
        render_log(); //display new brush size in infopane

        //update brush with its new size
        let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
        hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1]);
        brush.radius = brush_size * scale;
        brush.draw(hidden_ctx);

        //redraw the frame with the updated brush preview
        render_frame();

      } else if (key === ".") { //increase brush size, shouldn't be larger than the image
        brush_size = Math.min(self.brush_size + 1,
          dimensions[0]/scale, dimensions[1]/scale);
        render_log(); //display new brush size in infopane

        //update brush with its new size
        let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
        hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1]);
        brush.radius = brush_size * scale;
        brush.draw(hidden_ctx);

        //redraw the frame with the updated brush preview
        render_frame();
      }

    } // END OF EDIT MODE KEYBINDS

    // nothing selected, not in edit mode
    else if (this.kind == Modes.none) {
      if (key === "-" && this.highlighted_cell_one !== -1) {
        //allow cycling through highlighted cells to view, if nothing selected
        if (this.highlighted_cell_one === 1) {
          this.highlighted_cell_one = maxTrack;
        } else {
          this.highlighted_cell_one -= 1;
        }
        render_frame();
      } else if (key === "=" && this.highlighted_cell_one !== -1) {
        //allow cycling through highlighted cells to view, if nothing selected
        if (this.highlighted_cell_one === maxTrack) {
          this.highlighted_cell_one = 1;
        } else {
          this.highlighted_cell_one += 1;
        }
        render_frame();
      }
    // end of "nothing selected" keybinds
    } else if (this.kind == Modes.single) {

      //hole fill
      if (key === "f") {
        if (current_label != 0) {
          this.info = { "label": current_label,
                      "frame": current_frame,
                      "x_location": mouse_x,
                      "y_location": mouse_y };
          this.kind = Modes.question;
          this.prompt = "Select hole to fill in cell " + current_label;
          this.action = "fill_hole";
          action("fill_hole", this.info);

        } else {
          this.clear();
        }
      } else if (key === "c") {
        this.kind = Modes.question;
        this.action = "new_track";
        this.prompt = "CREATE NEW (SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)";

      } else if (key === "=") {
        if (this.highlighted_cell_one === maxTrack) {
          this.highlighted_cell_one = 1;
        } else {
          this.highlighted_cell_one += 1;
        }
        // clear info but show new highlighted cell
        let temp_highlight = this.highlighted_cell_one;
        this.clear();
        this.highlighted_cell_one = temp_highlight;
        render_frame();

      } else if (key === "-") {
        if (this.highlighted_cell_one === 1) {
          this.highlighted_cell_one = maxTrack;
        } else {
          this.highlighted_cell_one -= 1;
        }
        // clear info but show new highlighted cell
        let temp_highlight = this.highlighted_cell_one;
        this.clear();
        this.highlighted_cell_one = temp_highlight;
        render_frame();
      } else if (key === "x") {
        this.kind = Modes.question;
        this.action = "delete_cell";
        this.prompt = "delete label " + this.info.label + " in frame " + this.info.frame + "? " + answer;
      }
    } else if (this.kind == Modes.multiple) {
      if (key === "r") {
        this.kind = Modes.question;
        this.action = "replace";
        this.prompt = "Replace " + this.info.label_2 + " with " + this.info.label_1 + "? " + answer;
      } else if (key === "p") {
        this.kind = Modes.question;
        this.action = "set_parent";
        this.prompt = "Set " + this.info.label_1 + " as parent of " + this.info.label_2 + "? " + answer;
      } else if (key === "s") {
        this.kind = Modes.question;
        this.action = "swap_cells";
        this.prompt = "SPACE = SWAP IN ALL FRAMES / ESC = CANCEL SWAP";
      } else if (key === "w") {
        this.kind = Modes.question;
        this.action = "watershed";
        this.prompt = "Perform watershed to split " + this.info.label_1 + "? " + answer;
      }
    } else if (this.kind == Modes.question) {
      if (key === " ") {
        if (this.action == "new_track") {
          action("create_all_new", this.info);
          this.clear();
        } else if (this.action == "set_parent") {
          action(this.action, this.info);
          this.clear();
        } else if (this.action == "replace") {
          action(this.action, this.info);
          this.clear();
        } else if (this.action == "watershed") {
          action(this.action, this.info);
          this.clear();
        } else if (this.action == "delete_cell") {
          action(this.action, this.info);
          this.clear();
        } else if (this.action == "swap_cells") {
          action("swap_tracks", this.info);
          this.clear();
        }
      }
    }
  }

  handle_draw() {
    action("handle_draw", { "trace": JSON.stringify(mouse_trace),
                  "edit_value": edit_value,
                  "brush_size": brush_size,
                  "erase": erase,
                  "frame": current_frame});
    this.clear()
  }

  click() {
    if (this.kind === Modes.question) {
      if(this.action == "fill_hole" && current_label == 0) {
        this.info = { "label": current_label,
                      "frame": current_frame,
                      "x_location": mouse_x,
                      "y_location": mouse_y };
        action(this.action, this.info);
        this.clear();
      }

      //if click on background, same as ESC
    } else if (current_label === 0) {
      this.highlighted_cell_one = -1;
      this.highlighted_cell_two = -1;
      this.clear();
      return;

    } else if (this.kind === Modes.none) {
      this.kind = Modes.single;
      this.info = {"label": current_label,
                  "frame": current_frame};
      this.highlighted_cell_one = current_label;
      this.highlighted_cell_two = -1;
      temp_x = mouse_x;
      temp_y = mouse_y;

    } else if (this.kind === Modes.single) {
      this.kind = Modes.multiple;

      this.highlighted_cell_one = this.info.label;
      this.highlighted_cell_two = current_label;

      if (this.info.label == current_label) {
        this.info = {"label_1": this.info.label,
                    "label_2": current_label,
                    "frame": current_frame,
                    "x1_location": temp_x,
                    "y1_location": temp_y,
                    "x2_location": mouse_x,
                    "y2_location": mouse_y};
      } else {
        this.info = {"label_1": this.info.label,
                    "frame_1": this.info.frame,
                    "label_2": current_label,
                    "frame_2": current_frame};
      }
    } else if (this.kind  === Modes.multiple) {
      this.highlighted_cell_one = this.info.label_1;
      this.highlighted_cell_two = current_label;

      if (this.info.label_1 == current_label) {
        this.info = {"label_1": this.info.label_1,
                    "label_2": current_label,
                    "frame": current_frame,
                    "x1_location": temp_x,
                    "y1_location": temp_y,
                    "x2_location": mouse_x,
                    "y2_location": mouse_y};
      } else {
        this.info = {"label_1": this.info.label_1,
                    "frame_1": this.info.frame_1,
                    "label_2": current_label,
                    "frame_2": current_frame};
      }
    }
    render_frame();
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
var current_contrast = 0;
var current_frame = 0;
var current_label = 0;
var current_highlight = false;
var max_frames = undefined;
var dimensions = undefined;
var tracks = undefined;
var maxTrack;
var mode = new Mode(Modes.none, {});
var raw_image = undefined;
var seg_image = undefined;
var edit_image = undefined;
var seg_array;
var scale;
var mouse_x = 0;
var mouse_y = 0;
var edit_mode = false;
var edit_value = 1;
var brush_size = 1;
var erase = false;
var last_mousex = last_mousey = 0;
var mousedown = false;
var answer = "(SPACE=YES / ESC=NO)";
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

function label_under_mouse() {
  let img_y = Math.floor(mouse_y/scale)
  let img_x = Math.floor(mouse_x/scale)
  let new_label = seg_array[img_y][img_x]; //check array value at mouse location
  return new_label;
}

function render_log() {
  current_label = label_under_mouse();

  $('#frame').html(current_frame);
  $('#label').html(current_label);

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
    $('#edit_brush').text("brush size: " + brush_size);
    $('#edit_label').text("editing label: " + edit_value);

    if (erase) {
      $('#edit_erase').text("eraser mode: ON");
    } else {
      $('#edit_erase').text("eraser mode: OFF");
    }

  } else {
    $('#edit_mode').html("OFF");
    $('#edit_brush').text("");
    $('#edit_label').text("");
    $('#edit_erase').text("");


  }

  if (current_label !== 0) {
    let track = tracks[current_label.toString()];
    $('#parent').text(track.parent || "None");
    $('#daughters').text("[" + track.daughters.toString() + "]");
    $('#frame_div').text(track.frame_div || "None");
    let capped = track.capped.toString();
    $('#capped').text(capped[0].toUpperCase() + capped.substring(1));
    $('#frames').text(track.frames.toString());
  } else {
    $('#capped').text("");
    $('#daughters').text("");
    $('#frame_div').text("");
    $('#frames').text("");
  }
  $('#mode').html(mode.render());
}

function render_frame() {

  let ctx = $('#canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;

  if (edit_mode) {
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
    ctx.drawImage(edit_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.restore();

    // draw brushview on top of cells/annotations

    let hidden_canvas = document.getElementById('hidden_canvas');
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(hidden_canvas, 0, 0, dimensions[0], dimensions[1]);
    ctx.restore();

  } else if (rendering_raw) {
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
    ctx.drawImage(raw_image, 0, 0, dimensions[0], dimensions[1]);

    //contrast image
    image_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
    contrast_image(image_data, current_contrast);
    //draw contrasted image over the original
    ctx.putImageData(image_data, 0, 0);

  } else { //draw annotations
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    if (current_highlight) {
      let img_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
      highlight(img_data, mode.highlighted_cell_one);
      highlight(img_data, mode.highlighted_cell_two);
      ctx.putImageData(img_data, 0, 0);
    }
  }
  render_log();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: "frame/" + current_frame + "/" + project_id,
    success: function(payload) {
      if (seg_image === undefined) {
        seg_image = new Image();
      }
      if (raw_image === undefined) {
        raw_image = new Image();
      }
      if (edit_image === undefined) {
        edit_image = new Image();
      }

      seg_array = payload.seg_arr;

      seg_image.src = payload.segmented;
      seg_image.onload = render_frame;
      raw_image.src = payload.raw;
      raw_image.onload = render_frame;
      edit_image.src = payload.edit_background;
      edit_image.onload = render_frame;

    },
    async: true
  });
}

function load_file(file) {
  $.ajax({
    type:'POST',
    url:"load/" + file,
    success: function (payload) {
      max_frames = payload.max_frames;
      scale = payload.screen_scale;
      dimensions = [scale * payload.dimensions[0], scale * payload.dimensions[1]];
      tracks = payload.tracks;

      maxTrack = Math.max(... Object.keys(tracks).map(Number));

      project_id = payload.project_id;
      $('#canvas').get(0).width = dimensions[0];
      $('#canvas').get(0).height = dimensions[1];

      $('#hidden_canvas').get(0).width = dimensions[0];
      $('#hidden_canvas').get(0).height = dimensions[1];
    },
    async: false
  });
}

async function fetch_frame(frame) {
  return $.ajax({
    type: 'GET',
    url: "frame/" + frame+ "/" + project_id,
  });
}

function prepare_canvas() {
  $('#canvas').click(function(evt) {
    if (!edit_mode) {
      mode.click(evt);
    }
    render_log();
  });
  $('#canvas').on('wheel', function(evt) {
    if (rendering_raw) {
      let delta = - evt.originalEvent.deltaY / 2;
      current_contrast = Math.max(current_contrast + delta, -100);
      render_frame();
    }
  });
  $('#canvas').mousemove(function(evt) {
    mouse_x = evt.offsetX;
    mouse_y = evt.offsetY;
    render_log();
  });
  $('#canvas').mousedown(function(evt) {

    mouse_x = evt.offsetX;
    mouse_y = evt.offsetY;

    last_mousex = mouse_x
    last_mousey = mouse_y
    mousedown = true;

    if (edit_mode) {
      let img_y = Math.floor(mouse_y/scale);
      let img_x = Math.floor(mouse_x/scale);

      mouse_trace.push([img_y, img_x]);
    }
  });
  $('#canvas').mouseup(function(evt) {
    //on mouse release, clear image that shows where brush
    //has gone during click&drag

    mousedown = false; //no longer click&drag
    let hidden_canvas = document.getElementById('hidden_canvas');
    let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
    hidden_ctx.clearRect(0, 0, dimensions[0], dimensions[1]);

    //send click&drag coordinates to caliban.py to update annotations
    if (edit_mode) {
      mode.handle_draw();
    }
    //update display

    //reset mouse_trace
    mouse_trace = [];

  });
  $('#canvas').mousemove(function(evt) {
    // handle brush preview

    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    // hidden canvas is keeping track of the brush
    let hidden_canvas = document.getElementById('hidden_canvas');
    let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");

    mouse_x = evt.offsetX;
    mouse_y = evt.offsetY;

    // don't bother with brush preview updating unless in edit mode
    if (!mousedown && edit_mode) {
      //only draw brush where mouse currently is
      hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])

      // update brush params
      brush.x = mouse_x;
      brush.y = mouse_y;

      // draw brush onto hidden_ctx
      brush.draw(hidden_ctx);

      // show the updated image (composite + brush preview)
      // each time the preview changes
      render_frame();

    }
    if (mousedown && edit_mode) {
      // save coordinates of where mouse has gone
      // convert down from scaled coordinates (what the canvas sees)
      // to the coordinates of the original img array (what caliban sees)
      let img_y = Math.floor(mouse_y/scale);
      let img_x = Math.floor(mouse_x/scale);

      mouse_trace.push([img_y, img_x]);
      // update brush params but don't clear the image
      brush.x = mouse_x;
      brush.y = mouse_y;
      brush.draw(hidden_ctx);
      render_frame();
    }
      last_mousex = mouse_x;
      last_mousey = mouse_y;
  });

  window.addEventListener('keydown', function(evt) {

    if (evt.key === 'z') {
      rendering_raw = !rendering_raw;
      render_frame();
    } else if (evt.key === 'd') {
      current_frame += 1;
      if (current_frame >= max_frames) {
        current_frame = 0;
      }
      fetch_and_render_frame();
    } else if (evt.key === 'a') {
      current_frame -= 1;
      if (current_frame < 0) {
        current_frame = max_frames - 1;
      }
      fetch_and_render_frame();
    } else if (evt.key === "Escape") {
      mode.clear();
      render_log();
    } else if (evt.key === 'h') {
        current_highlight = !current_highlight;
        render_frame();
    } else if (evt.key === 'e') {
        edit_mode = !edit_mode;
        render_frame();
    } else {
      mode.handle_key(evt.key);
    }
  }, false);
}

function reload_tracks() {
  $.ajax({
    type:'GET',
    url:"tracks/" + project_id,
    data: project_id,
    success: function (payload) {
      tracks = payload.tracks;
      maxTrack = Math.max(... Object.keys(tracks).map(Number));
    },
    async: false
  });
}

function action(action, info) {
  $.ajax({
    type:'POST',
    url:"action/" + project_id + "/" + action,
    data: info,
    success: function (payload) {
      if (payload.error) {
        alert(payload.error);
      }
      if (payload.frames_changed) {
        fetch_and_render_frame();
      }
      if (payload.tracks_changed) {
        reload_tracks();
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