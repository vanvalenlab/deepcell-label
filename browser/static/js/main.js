class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
  }

  clear() {
    this.kind = Modes.none;
    this.info = {};
  }

  handle_key(key) {
    if (this.kind == Modes.single) {
      if (key === "c") {
        action("new_track", this.info);
        this.clear();
      }
    }
    if (this.kind == Modes.multiple) {
      if (key === "r") {
        action("replace", this.info);
        this.clear();
      }
      if (key === "p") {
        action("set_parent", this.info);
        this.clear();
      }
      if (key === "s") {
        action("swap_tracks", this.info);
        this.clear();
      }
    }
  }

  click() {
    if (current_label === 0) {
      return;
    }

    if (this.kind === Modes.none) {
      this.kind = Modes.single;
      this.info = {"label": current_label, "frame": current_frame};
    }
    else if (this.kind === Modes.single) {
      this.kind = Modes.multiple;
      this.info = {"label_1": this.info.label, "frame_1": this.info.frame,
                   "label_2": current_label, "frame_2": current_frame};
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
      return "question?";
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


var rendering_raw = false;
var current_contrast = 0;
var current_frame = 0;
var current_label = 0;
var max_frames = undefined;
var current_cmap = undefined;
var dimensions = undefined;
var tracks = undefined;
var mode = new Mode(Modes.none, {});
var raw_image = undefined;
var seg_image = undefined;
var mouse_x = 0;
var mouse_y = 0;


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

  if (current_label !== 0) {
    let track = tracks[current_label.toString()];
    $('#parent').text(track.parent || "None");
    $('#daughters').text("[" + track.daughters.toString() + "]");
    $('#frame_div').text(track.frame_div || "None");
    let capped = track.capped.toString();
    $('#capped').text(capped[0].toUpperCase() + capped.substring(1));
    $('#frames').text(track.frames.toString());
  }
  else {
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

      seg_image.src = payload.segmented;
      seg_image.onload = render_frame;
      raw_image.src = payload.raw;
      raw_image.onload = render_frame;

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

function start_caliban() {
  load_file("track_review_HEK_500_400.pk");
  prepare_canvas();
  fetch_and_render_frame();
}


