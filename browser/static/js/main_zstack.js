class Mode {
  constructor(kind, info) {
    this.kind = kind;
    this.info = info;
    this.highlighted_cells = {}
    this.highlight = false;
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
    this.highlighted_cells = {}
    this.highlighted_cell_one = -1;
    this.highlighted_cell_two = -1;


    this.highlighted_cells = {"cell_one": this.highlighted_cell_one, 
                              "cell_two": this.highlighted_cell_two};

    if (current_highlight) {
      action("change_selected_cells", this.highlighted_cells);
    }
    
    this.action = "";
    this.prompt = "";
  }

  handle_key(key) {
    if (edit_mode) {
      //keybinds to change value of brush
      if (key === "=") {
        edit_value += 1; //increase edit_value, no upper limit
        render_log(); //change display to show new edit_value
      } else if (key === "-") {
        edit_value = Math.max(edit_value - 1, 1); //decrease edit_value, should always be positive number
        render_log(); //change display to show new edit_value

      //turn eraser on and off
      } else if (key === "x") {
        erase = !erase;
        render_log();
        //note: turning erase off and on changes the justification
        //of all the other text when render_log is called

      //keybinds to change brush size
      } else if (key === ",") { //decrease brush size, should always be > 0
        brush_size = Math.max(brush_size - 1, 1);
        render_log(); //display new brush size

        // update the brush with its new size
        let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
        hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])
        brush.radius = brush_size * scale;
        brush.draw(hidden_ctx);

        // redraw the frame with the updated brush preview
        render_frame();

      } else if (key === ".") { //increase brush size, shouldn't be larger than the image
        brush_size = Math.min(self.brush_size + 1, dimensions[0], dimensions[1]);
        render_log(); //display new brush size

        // update the brush with its new size
        let hidden_ctx = $('#hidden_canvas').get(0).getContext("2d");
        hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1])
        brush.radius = brush_size * scale;
        brush.draw(hidden_ctx);

        // redraw the frame with the updated brush preview
        render_frame();
      } else if (key === 'n') {//set edit value to something unused
        edit_value = maxLabelsMap.get(this.feature) + 1; //max value in feature + 1
        render_log(); //change display to show that value has changed
      }

    } else if(key === "h") {
        action("change_highlight", this.info);
        this.clear();
    } else if(key === "shiftKey") {
      this.kind = Modes.question;
      this.action = "trim_pixels";
      this.info = {"label": current_label, 
                        "frame": current_frame,
                        "x_location": mouse_x,
                        "y_location": mouse_y};
      this.prompt = "SPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL / ESC = CANCEL";
     
    } else if(key === "altKey") {
      this.kind = Modes.question;
      this.action = "flood_cell";
      this.info = {"label": current_label, 
                        "frame": current_frame,
                        "x_location": mouse_x,
                        "y_location": mouse_y}
      this.prompt = "SPACE = FLOOD SELECTED CELL WITH NEW LABEL / ESC = CANCEL";
    }

    if (this.kind == Modes.none) {
      if (key === "f") {
        this.change_feature();
        this.info = {"feature": this.feature};
        action("change_feature", this.info);
        this.clear();
      } else if (key === "c") {
        this.change_channel(true);
        this.info = {"channel": this.channel};
        action("change_channel", this.info);
        this.clear();

        //if shift-c is pressed
      } else if (key === "C") {
        this.change_channel(false);
        this.info = {"channel": this.channel};
        action("change_channel", this.info);
        this.clear();
      } else if (key === "p") {
        this.kind = Modes.question;
        this.action = "predict";
        this.prompt = "Predict cell ids for zstack? / S=PREDICT THIS FRAME / SPACE=PREDICT ALL FRAMES / ESC=CANCEL PREDICTION";

      } else if (key === "e") {
        edit_mode = !edit_mode;
        render_log();
        render_frame();
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

        if (current_label != 0) {
          this.prompt = "Select hole to fill in cell " + current_label;
        } 
      } else if (key === "c") {
        this.kind = Modes.question;
        this.action = "create_new";
        this.prompt = "CREATE NEW(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)";
      } else if (key === "x") {
        this.kind = Modes.question;
        this.action = "delete";
        this.prompt = "delete label " + this.info.label + " in frame " + this.info.frame + "? " + answer;
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
      if (key === "s") {
        this.kind = Modes.question;
        this.action = "swap_cells";
        this.prompt = "SPACE = SWAP IN ALL FRAMES / S = SWAP IN THIS FRAME ONLY / ESC = CANCEL SWAP";
      } else if (key === "r") {
        this.kind = Modes.question;
        this.action = "replace";
        this.prompt = "Replace " + this.info.label_2 + " with " + this.info.label_1 + "? " + answer;
      } else if (key === "w" ) {
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
        } else if (this.action == "flood_cell") {
          action("flood_cell", this.info);
          this.clear();
        } else if (this.action == "trim_pixels") {
          action("trim_pixels", this.info);
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
          action("predict_single", {"frame": current_frame});
          this.clear();
        }
      }
    }
  }

  handle_draw() {
    action("handle_draw", { "trace": JSON.stringify(mouse_trace), //stringify array so it doesn't get messed up
                  "edit_value": edit_value, //we don't update caliban with edit_value, etc each time they change
                  "brush_size": brush_size, //so we need to pass them in as args
                  "erase": erase,
                  "frame": current_frame});
    this.clear()
  }

  update_highlighted_cells(decrease, increase) {

    if (this.highlighted_cell_one != -1) {
      if (increase == 1) {
        if (this.highlighted_cell_one < maxLabelsMap.get(this.feature)) {
          this.highlighted_cell_one += 1;
        } else {
          this.highlighted_cell_one = 1;
        }
      } else if (decrease == 1) {
        if (this.highlighted_cell_one > 1) {
          this.highlighted_cell_one -= 1;
        } else {
          this.highlighted_cell_one = maxLabelsMap.get(this.feature);
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

  change_feature(){
    if (this.feature < feature_max - 1) {
      this.feature += 1;
    } else {
      this.feature = 0;
    }
  }

  change_channel(cycle_forward){
    if (cycle_forward) {
      if (this.channel < channel_max - 1) {
        this.channel += 1;
      } else {
        this.channel = 0;
      }

    } else {
      if (this.channel > 0) {
        this.channel -= 1;
      } else {
        this.channel = channel_max - 1;
      }
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
      this.info = { "label": current_label, 
                    "frame": current_frame };
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
var raw_image = undefined;
var seg_image = undefined;
var edit_image = undefined;
var seg_array; // declare here so it is global var
var scale;
var mouse_x = 0;
var mouse_y = 0;
var edit_mode = false;
var edit_value = 1;
var brush_size = 1;
var erase = false;
var answer = "(SPACE=YES / ESC=NO)";
var last_mousex = last_mousey = 0;
var mousedown = false;
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

  if (current_highlight == true) {
    $('#highlight').html("ON");

  } else {
    $('#highlight').html("OFF");

  }

  if (edit_mode == true) {
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
    ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
    ctx.drawImage(edit_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.save(); // save here to store the default globalCompositeOperation
    ctx.globalCompositeOperation = 'color'; 
    ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
    ctx.restore(); // we only want compositing in this section, so restore
    // when finished compositing to reset composite setting

    // draw brushview on top of cells/annotations

    let hidden_canvas = document.getElementById('hidden_canvas');
    ctx.save();
    ctx.globalAlpha = 0.7;
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

      // load new value of seg_array
      // array of arrays, contains annotation raw data for frame
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

async function fetch_frame(frame) {
  return $.ajax({
    type: 'GET',
    url: "frame/" + frame + "/" + project_id
   
  });
}

function prepare_canvas() {
  $('#canvas').click(function(evt) {
    // bind click events on canvas
  
    if (!edit_mode) {
      mode.click();
    }
    
    render_log();
  });

  $('#canvas').on('wheel', function(evt) {
    // bind mouse scroll events on canvas
    if (rendering_raw) {
      //contrast adjust raw image
      let delta = - evt.originalEvent.deltaY / 2;
      current_contrast = Math.max(current_contrast + delta, -100);
      render_frame();
    }
  });

  $('#canvas').mousemove(function(evt) {
    // bind what happens when mouse moves across canvas

    // always update mouse_x and mouse_y and use to display
    // relevant text info:
    mouse_x = evt.offsetX;
    mouse_y = evt.offsetY;
    render_log();

  });
  $('#canvas').mousedown(function(evt) {

    mouse_x = evt.offsetX;
    mouse_y = evt.offsetY;

    last_mousex = mouse_x 
    last_mousey = mouse_y
    mousedown = true; //so we can differentiate mousemove from click&drag

     if (evt.altKey) {
        mode.handle_key("altKey");
        
      } else if (evt.shiftKey) {
        mode.handle_key("shiftKey");
       
      }

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
    hidden_ctx.clearRect(0,0,dimensions[0],dimensions[1]);

    //send click&drag coordinates to caliban.py to update annotations
    if(edit_mode) {
      mode.handle_draw();
    }

    //update display

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
      brush.radius = brush_size * scale;
      // update brush color?

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
        brush.radius = brush_size * scale;
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
    url:"tracks/" + project_id,
    data: project_id,
    success: function (payload) {
      tracks = payload.tracks;
      //update maxLabelsMap when we get new track info
      for (let i = 0; i < Object.keys(tracks).length; i++){
        let key = Object.keys(tracks)[i]; //the keys are strings
        maxLabelsMap.set(i, Math.max(... Object.keys(tracks[key]).map(Number)));
      };
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