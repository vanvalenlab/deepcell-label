class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cells = {}
    this.highlight = false;
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.action = "";
    this.prompt = "";

  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.highlighted_cells = {}
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;
    this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                              "cell_two": this.highlighted_cell_two};
    action("change_selected_cells", this.highlighted_cells);
    this.action = "";
    this.prompt = "";
  }

  handle_key(key) {

    if (edit_mode) {
      if (key === "=") {
        edit_value += 1;
        this.info = {"edit_value": edit_value};
        action("edit_value", this.info);
        this.clear();
      } else if (key === "-") {
        edit_value = Math.max(edit_value - 1, 1);
        this.info = {"edit_value": edit_value};
        action("edit_value", this.info);
        this.clear();
      } else if (key === "x") {
        erase = -(erase);

        action("change_erase", {"erase": erase});
        this.clear();
      } else if (key === ",") {
        brush_size = Math.max(brush_size - 1, 1);
        this.info = {"brush_size": brush_size};
        action("change_brush_size", this.info);
        this.clear();
      } else if (key === ".") {
        brush_size = Math.min(self.brush_size + 1, dimensions[0], dimensions[1]);
        this.info = {"brush_size": brush_size};
        action("change_brush_size", this.info);
        this.clear();
      }

    }

    if(key === "h") {
        action("change_highlight", this.info);
        this.clear();
    }

    if (this.kind == Modes.none) {
      if (key === "e") {
        rendering_edit = !rendering_edit;
        edit_mode = !edit_mode
        brush_size = 1;
        edit_value = 1;
        erase = -1
        action("change_edit_mode", {});
        action("change_brush_size", {"brush_size": brush_size});
        action("edit_value", {"edit_value": edit_value});
        action("change_erase", {"erase": erase});
        this.clear();
      }

    }

    if (this.kind == Modes.single) {
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
        this.update_highlighted_cells(-1, 1)
        this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                  "cell_two": this.highlighted_cell_two};

        action("change_selected_cells", this.highlighted_cells);

      } else if (key === "-") {
        this.update_highlighted_cells(1, -1)
        this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                  "cell_two": this.highlighted_cell_two};

        action("change_selected_cells", this.highlighted_cells);
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
      } else if (key === "=") {
        this.update_highlighted_cells(-1, 1)
        this.highlighted_cells = {"cell_one": this.highlighted_cell_one,
                                  "cell_two": this.highlighted_cell_two};
        action("change_selected_cells", this.highlighted_cells);
      } else if (key === "-") {
        this.update_highlighted_cells(1, -1)
        this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                  "cell_two": this.highlighted_cell_two};
        action("change_selected_cells", this.highlighted_cells);
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

  handle_draw(mouse_x, mouse_y) {
    action("handle_draw", { "x": mouse_x,
                  "y": mouse_y,
                  "frame": current_frame});
    this.clear()
  }

  update_highlighted_cells(decrease, increase) {

    if (this.highlighted_cell_one != -1) {
      if (increase == 1) {
        if (this.highlighted_cell_one < num_tracks) {
          this.highlighted_cell_one += 1;
        } else {
          this.highlighted_cell_one = 1;
        }
      } else if (decrease == 1) {
        if (this.highlighted_cell_one > 1) {
          this.highlighted_cell_one -= 1;
        } else {
          this.highlighted_cell_one = num_tracks;
        }
      }
    }
    if (this.kind === Modes.single) {
      this.info.label = this.highlighted_cell_one;
    } else if (this.kind === Modes.multiple) {
      this.info.label_1 = this.highlighted_cell_one;
      this.info.label_2 = this.highlighted_cell_two;
    }
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
    } else if (current_label === 0) {
      this.highlighted_cell_one = -1;
      this.highlighted_cell_two = -1;
      this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                "cell_two":this.highlighted_cell_two};
      action("change_selected_cells", this.highlighted_cells);
      this.clear();
      return;
    } else if (this.kind === Modes.none) {
      this.kind = Modes.single;
      this.info = {"label": current_label,
                  "frame": current_frame};
      this.highlighted_cell_one = current_label;
      this.highlighted_cell_two = -1;
      this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                "cell_two": this.highlighted_cell_two};
      action("change_selected_cells", this.highlighted_cells);
      temp_x = mouse_x;
      temp_y = mouse_y;

    } else if (this.kind === Modes.single) {
      this.kind = Modes.multiple;

      this.highlighted_cell_one = this.info.label;
      this.highlighted_cell_two = current_label;
      this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                "cell_two": this.highlighted_cell_two};
      action("change_selected_cells", this.highlighted_cells);

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
      this.highlighted_cells = {"cell_one":this.highlighted_cell_one,
                                "cell_two": this.highlighted_cell_two};
      action("change_selected_cells", this.highlighted_cells);

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
var rendering_edit = false;
var current_contrast = 0;
var current_frame = 0;
var current_label = 0;
var current_highlight = false;
var max_frames = undefined;
var current_cmap = undefined;
var dimensions = undefined;
var tracks = undefined;
var num_tracks = 0;
var mode = new Mode(Modes.none, {});
var raw_image = undefined;
var seg_image = undefined;
var edit_image = undefined;
var mouse_x = 0;
var mouse_y = 0;
var edit_mode = false;
var edit_value = undefined;
var brush_size = undefined;
var erase = undefined;
var last_mousex = last_mousey = 0;
var mousedown = false;
var answer = "(SPACE=YES / ESC=NO)";
var project_id = undefined;

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

function label_under_mouse() {
  p = $('#hidden_canvas').get(0).getContext('2d').getImageData(mouse_x, mouse_y, 1, 1).data;
  let label_str = "(" + p[0] + ", " + p[1] + ", " + p[2] + ", 255)";

  let new_label = current_cmap[label_str];
  return new_label;
}

function render_log() {
  current_label = label_under_mouse();

  $('#frame').html(current_frame);
  $('#label').html(current_label);

  if (current_highlight == true) {
    $('#highlight').html("ON");

  } else {
    $('#highlight').html("OFF");

  }

  if (edit_mode == true) {

    $('#edit_mode').html("ON");
    $('#edit_brush').text("brush size: " + brush_size);
    $('#edit_label').text("editing label: " + edit_value);

    if (erase == 1) {
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

  let ctx = $('#hidden_canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);

  ctx = $('#canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (rendering_raw) {
    ctx.drawImage(raw_image, 0, 0, dimensions[0], dimensions[1]);
    image_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
    contrast_image(image_data, current_contrast);
    ctx.putImageData(image_data, 0, 0);
  } else if (rendering_edit) {
    // add opacity


    ctx.drawImage(edit_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.restore();
  } else {
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
  }
  render_log();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: "frame/" + current_frame + "/" + project_id,
    success: function(payload) {
      current_cmap = payload.cmap;

      if (seg_image === undefined) {
        seg_image = new Image();
      }
      if (raw_image === undefined) {
        raw_image = new Image();
      }
      if (edit_image === undefined) {
        edit_image = new Image();
      }


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
      dimensions = [2 * payload.dimensions[0], 2 * payload.dimensions[1]];
      tracks = payload.tracks;
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
    mode.click();
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
    last_mousex = mouse_x
    last_mousey = mouse_y
    mousedown = true;
  });
  $('#canvas').mouseup(function(evt) {
    mousedown = false;
  });
  $('#canvas').mousemove(function(evt) {

    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    mousex = evt.offsetX;
    mousey = evt.offsetY;
    if (mousedown) {
        mode.handle_draw(mousex, mousey);

    }
      last_mousex = mousex;
      last_mousey = mousey;

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
    } else {
        if (evt.key === 'h') {
        current_highlight = !current_highlight;
        }
      mode.handle_key(evt.key);
    }
  }, false);
}

function reload_tracks() {
  $.ajax({
    type:'GET',
    url:"tracks" + project_id,
    success: function (payload) {
      tracks = payload.tracks;
      var test = Object.keys(tracks)
      num_tracks = test.length


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
}