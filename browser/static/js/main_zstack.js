class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.feature = 0;
    this.channel = 0;
    this.action = "";
    this.prompt = "";
    this.edit_mode = false;
    this.erase = false;
  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
    this.action = "";
    this.prompt = "";
  }

  handle_key(key) {
    if (this.edit_mode == true) {
      if (key === "=") {
        edit_value += 1;
      } else if (key === "-") {
        Math.max(edit_value - 1, 1);
      } else if (key === "x") {
        erase = !erase;
      } else if (key === ".") {
        Math.max(brush_size - 1, 1);
      } else if (key === ",") {
        Math.min(self.brush_size + 1, dimensions[0], dimensions[1]);
      }

    }
    if (this.kind == Modes.none) {
      if (key === "f") {
        this.change_feature();
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      } else if (key === "c") {
        this.change_channel();
        this.info = {"channel": this.channel};
        action("change_channel", this.info);
        this.clear();
      } else if (key === "p") {
        this.kind = Modes.question;
        this.action = "predict";
        this.prompt = "Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION";

      } else if (key === "e") {
        this.edit_mode = !this.edit_mode;
        brush_size = 1;
        erase = !erase;
        edit_value = 1;


      }
    } else if (this.kind == Modes.single) {
      if (key === "f") {
        this.info = { "label": current_label, 
                      "frame": current_frame,
                      "x_location": mouse_x,
                      "y_location": mouse_y };

        this.kind = Modes.question;
        this.action = "fill_hole";
        action("fill_hole", this.info);

        if (current_label =! 0) {
          this.prompt = "select hole to fill in";
        } 
      } else if (key === "c") {
        this.kind = Modes.question;
        this.action = "create_new";
        this.prompt = "(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)";
      } else if (key === "x") {
        this.kind = Modes.question;
        this.action = "delete";
        this.prompt = "delete label in frame?";
      }
    } else if (this.kind == Modes.multiple) {
      if (key === "s") {
        this.kind = Modes.question;
        this.action = "swap_cells";
        this.prompt = "SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP";
      } else if (key === "r") {
        this.kind = Modes.question;
        this.action = "replace";
        this.prompt = "replace?";
      } else if (key === "w" ) {
        this.kind = Modes.question;
        this.action = "watershed";
        this.prompt = "watershed?";
      }
    } else if (this.kind == Modes.question) {
      if (key === " ") {
        if (this.action == "create_new"){
          action("new_cell_stack", this.info);
          this.clear();
        } else if (this.action == "swap_cells") {
          action("swap_all_frame", this.info);
          this.clear();
        } else if (this.action == "predict") {
          action("predict_zstack", this.info);
          this.clear();
        } else if (this.action == "replace") {
          action("replace", this.info);
          this.clear();
        } else if (this.action == "watershed") {
          action("watershed", this.info);
          this.clear();
        } else if (this.action == "delete") {
          action("delete", this.info);
          this.clear();
        }
      } else if (key === "s") {
        if(this.action == "create_new"){
          action("new_single_cell", this.info);
          this.clear();
        } else if (this.action == "swap_cells"){
          action("swap_single_frame", this.info);
          this.clear();
        } else if (this.action == "predict") {
          action("predict_single", this.info);
          this.clear();
        }
      }
    }
  }

  change_feature(){
    if (this.feature < feature_max - 1) {
      this.feature += 1;
    } else {
      this.feature = 0;
    }
  }

  change_channel(){
    if (this.channel < channel_max - 1) {
      this.channel += 1;
    } else {
      this.channel = 0;
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
    }

    if (this.kind === Modes.none) {
      this.kind = Modes.single;
      this.info = { "label": current_label, 
                    "frame": current_frame };
      temp_x = mouse_x
      temp_y = mouse_y
    } else if (this.kind === Modes.single) {
      this.kind = Modes.multiple;
      if (this.info.label == current_label) {
        this.info = { "label_1": this.info.label, 
                      "label_2": current_label, 
                      "frame": current_frame, 
                      "x1_location": temp_x, 
                      "y1_location": temp_y, 
                      "x2_location": mouse_x, 
                      "y2_location": mouse_y };
      } else {
        this.info = { "label_1": this.info.label, 
                      "frame_1": this.info.frame, 
                      "label_2": current_label, 
                      "frame_2": current_frame };
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
var max_frames = undefined;
var feature_max = undefined;
var channel_max = undefined;
var current_cmap = undefined;
var dimensions = undefined;
var tracks = undefined;
var mode = new Mode(Modes.none, {});
var raw_image = undefined;
var seg_image = undefined;
var edit_image = undefined;
var mouse_x = 0;
var mouse_y = 0;
var edit_mode = false;
var edit_value = undefined;
var brush_size = undefined;
var erase = false;

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
  if (current_label != 0) {
    $('#label').html(current_label);
  } else {
    $('#label').html("");
  }
 
  $('#feature').html(mode.feature);
  $('#channel').html(mode.channel);

  if (edit_mode == true) {
    $('#edit_mode').html("ON");
    
  } else {
    $('#edit_mode').html("OFF");
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
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);

  } else {
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
  }

  render_log();
}

function fetch_and_render_frame() {
  $.ajax({
    type: 'GET',
    url: "frame/" + current_frame,
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
      feature_max = payload.feature_max;
      channel_max = payload.channel_max;
      dimensions = [2 * payload.dimensions[0], 2 * payload.dimensions[1]];
      tracks = payload.tracks;

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
    url: "frame/" + frame
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
      console.log(evt.key);
      if (evt.key === "e") {
        edit_mode = !edit_mode;
        rendering_edit = !rendering_edit;
      }
      mode.handle_key(evt.key);
    }
  }, false);
}

function reload_tracks() {
  $.ajax({
    type:'GET',
    url:"tracks",
    success: function (payload) {
      tracks = payload.tracks;
    },
    async: false
  });
}

function action(action, info) {
  $.ajax({
    type:'POST',
    url:"action/" + action,
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