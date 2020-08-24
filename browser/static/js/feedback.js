
function start_feedback(filename) {
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

  load_feedback(filename);

  // define image onload cascade behavior, need rawHeight and rawWidth first
  adjuster = new ImageAdjuster(width=rawWidth, height=rawHeight,
                               rgb=rgb, channelMax=channelMax);
  brush = new Brush(scale=scale, height=rawHeight, width=rawWidth, pad=padding);

  adjuster.postCompImg.onload = render_image_display;

  prepare_canvas();
  fetch_and_render_frame();

}


// override keybind function in Mode to toggle between input, output and diff
Mode.prototype.handle_universal_keybind = function (key) {
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
  } else if (key === 't') {
    toggle_feedback_view();
    fetch_and_render_diff(source);
  }
}

// new functions below here

var source = 'input';

function fetch_and_render_diff(source) {
  $.ajax({
    type: 'GET',
    url: document.location.origin +  "/feedback/" + source + "/" + current_frame + "/" + project_id,
    success: function(payload) {
      adjuster.segLoaded = false;

      // load new value of seg_array
      // array of arrays, contains annotation data for frame
      seg_array = payload.seg_arr;
      adjuster.segImage.src = payload.segmented;
    },
    async: false
  });
}

function toggle_feedback_view() {
  console.log("Toggling from " + source);
  if (source === 'input') {
    source = 'output';
  } else if (source === 'output') {
    source = 'diff';
    document.getElementById('label_change_legend').style.display = 'block';
  } else if (source === 'diff') {
    source = 'input';
    document.getElementById('label_change_legend').style.display = 'none';
  }
  console.log("Toggled to " + source);
  fetch_and_render_diff(source);
  console.log("Diff frame rendered");
}

function load_feedback(file) {
  $.ajax({
    type: 'POST',
    url: document.location.origin + `/load/feedback/${file}?&rgb=${settings.rgb}`,
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
