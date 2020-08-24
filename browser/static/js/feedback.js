function startFeedback(filename, settings) {
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

  loadFeedback(filename, settings.rgb, (payload) => {
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
      adjuster.compositedImg.onload = () => adjuster.postCompAdjust(state.segArray, edit_mode, brush);
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
  } else if (key === 't') {
    toggleFeedbackView();
  }
}

// new functions below here

// TODO: @tddough98 don't use global variable
var source = 'input';

function fetchAndRenderDiff(source) {
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

function toggleFeedbackView() {
  if (source === 'input') {
    source = 'output';
  } else if (source === 'output') {
    source = 'diff';
    document.getElementById('label_change_legend').style.display = 'block';
  } else if (source === 'diff') {
    source = 'input';
    document.getElementById('label_change_legend').style.display = 'none';
  }
  fetchAndRenderDiff(source);
}



function loadFeedback(file, rgb = false, cb) {
  $.ajax({
    type: 'POST',
    url: document.location.origin + `/load/feedback/${file}?&rgb=${rgb}`,
    success: cb,
    async: true
  });
}