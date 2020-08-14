// var width = 600;
// var height = 600;

// var stage_orig = new Konva.Stage({
//     container: 'orig',
//     width: width,
//     height: height,
// });


// var stage_diff = new Konva.Stage({
//     container: 'diff',
//     width: width,
//     height: height,
// });

// var stage_qc = new Konva.Stage({
//     container: 'qc',
//     width: width,
//     height: height,
// });

// var layer_orig = new Konva.Layer();
// var layer_diff = new Konva.Layer();
// var layer_qc = new Konva.Layer();

// stage_orig.add(layer_orig);
// stage_diff.add(layer_diff);
// stage_qc.add(layer_qc);

// var rect1 = new Konva.Rect({
//     x: 20,
//     y: 20,
//     width: 100,
//     height: 50,
//     fill: 'green',
//     stroke: 'black',
//     strokeWidth: 4,
// });

// var rect2 = new Konva.Rect({
//     x: 150,
//     y: 40,
//     width: 100,
//     height: 50,
//     fill: 'red',
//     shadowBlur: 10,
//     cornerRadius: 10,
//     draggable: true,
// });

// layer_orig.add(rect1);
// layer_diff.add(rect1);
// layer_diff.add(rect2);
// layer_qc.add(rect2);



// layer_orig.draw();
// layer_diff.draw();
// layer_qc.draw();

// constants
const padding = 5;
const translucentOpacity = 0.3;

class Caliban {
  constructor(
    projectId,
    rawWidth, rawHeight,
    maxFrames, maxFeatures, maxChannels,
    segArray,
    rgb = false,
    pixelOnly = false,
    labelOnly = false
  ) {
    // project / image level configuration
    this._projectId = projectId;
    this._rawWidth = rawWidth;
    this._rawHeight = rawHeight;
    this._maxFrames = maxFrames;
    this._maxFeatures = maxFeatures;
    this._maxChannels = maxChannels;
    this._rgb = rgb;
    this._pixel_only = pixelOnly;
    this._label_only = labelOnly;

    // toggle-able settings
    this._editMode = pixelOnly && !labelOnly;
    this._currentHighlight = this._rgb;
    this._displayLabels = !this._rgb;
    this._inverted = true;
    this._renderingRaw = false;

    this._channel = 0;
    this._feature = 0;
    this._frame = 0;
    this._minScale = 1; // update this when resizing canvas.

    // drawing with Konva: https://konvajs.org/docs/sandbox/Free_Drawing.html
    this._isPaint = false;
    this.brush = new Brush(null, this._rawHeight, this._rawWidth, padding);

    this.stage = new Konva.Stage({
      container: 'canvas-col',
      width: this._rawWidth,
      height: this._rawHeight
    });

    this.stage.on('wheel', (event) => {
      // don't scroll the page
      event.evt.preventDefault();
      // instead, change some settings based on the keypress
      if (event.evt.altKey) {
        this.changeZoom(-Math.sign(event.evt.deltaY));
      } else if (this._renderingRaw || this._editMode) {
        if (event.evt.shiftKey) {
          this.changeContrast(event.evt.deltaY);
        } else {
          this.changeBrightness(event.evt.deltaY);
        }
      }
    });

    // this.stage.getContainer().style.backgroundColor = 'black';
    this.fitStageIntoParentContainer();

    // brightness and contrast adjustment
    this._minContrast = -100;
    this._maxContrast = 100;

    this._minBrightness = -1;
    this._maxBrightness = 0.7;

    // image adjustments are stored per channel for better viewing
    this.contrastMap = new Map();
    this.brightnessMap = new Map();
    this.invertMap = new Map();

    for (let i = 0; i < this._maxChannels; i++) {
      this.brightnessMap.set(i, 0);
      this.contrastMap.set(i, 0);
      this.invertMap.set(i, true);
    }

    this.maxLabelsMap = new Map();

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // create the raw image
    this.rawImage = new Konva.Image({
      height: this._rawHeight,
      width: this._rawWidth
    });
    this.layer.add(this.rawImage);

    this._rawLoaded = false;
    this._rawImage = new Image();
    this._rawImage.onload = () => {
      this._rawLoaded = true;
      this.rawImage.image(this._rawImage);
      if (this._rawLoaded && this._segLoaded) {
        this.rawImage.visible(this._renderingRaw);
        this.segImage.visible(!this._renderingRaw);
        this.renderImageDisplay();
      }
    };

    // create the annotation image
    this.segImage = new Konva.Image({
      height: this._rawHeight,
      width: this._rawWidth
    });
    this.layer.add(this.segImage);

    this._segLoaded = false;
    this._segImage = new Image();
    this._segImage.onload = () => {
      this._segLoaded = true;
      this.segImage.image(this._segImage);
      if (this._rawLoaded && this._segLoaded) {
        this.rawImage.visible(this._renderingRaw);
        this.segImage.visible(!this._renderingRaw);
        this.renderImageDisplay();
      }
    };
  }

  /** Getters and Setters for individual channel settings */

  get brightness() {
    return this.brightnessMap.get(this._channel);
  }

  set brightness(value) {
    this.brightnessMap.set(this._channel, value);
  }

  get contrast() {
    return this.contrastMap.get(this._channel);
  }

  set contrast(value) {
    this.contrastMap.set(this._channel, value);
  }

  get inverted() {
    return this.invertMap.get(this._channel);
  }

  set inverted(value) {
    this.invertMap.set(this._channel, value);
  }

  /** Render the raw image with brightness and contrast filters. */
  _prepareRawImage(grayscale = false) {
    this.rawImage.cache();

    const filters = [
      Konva.Filters.Brighten,
      Konva.Filters.Contrast
    ]

    if (grayscale) {
      filters.push(Konva.Filters.Grayscale);
      if (this._inverted) {
        filters.push(Konva.Filters.Invert);
      }
    }

    this.rawImage.filters(filters);

    this.rawImage.brightness(this.brightness);
    this.rawImage.contrast(this.contrast);
  }

  _prepareSegImage() {
    this.layer.imageSmoothingEnabled(false);
    this.segImage.cache();
    this.segImage.opacity(1);
    this.segImage.filters([]);
  }

  renderRawImage() {
    this._prepareRawImage();
    this.rawImage.getLayer().batchDraw();
  }

  /** Render the segmentation image */
  renderSegImage() {
    this._prepareSegImage();
    this.segImage.getLayer().batchDraw();
  }

  /** Render source image */
  renderSourceImages() {
    this._prepareRawImage();
    this._prepareSegImage();
    this.rawImage.visible(this._renderingRaw);
    this.segImage.visible(!this._renderingRaw);
    this.layer.batchDraw();
  }

  /** Render the raw image with Grayscale and Invert filters. */
  _prepareGrayscaleRawImage() {
    this._prepareRawImage(true);
  }

  renderGrayscaleRawImage() {
    this._prepareGrayscaleRawImage();
    this.rawImage.getLayer().batchDraw();
  }

  /** Render Composite Image - inverted raw with transparent labels on top. */
  _preparePreCompositeSegImage() {
    this.segImage.cache();
    if (this._currentHighlight) {
      this.segImage.cache();
      const h1 = (this._editMode) ? this.brush.value : mode.highlighted_cell_one;
      const h2 = (this._editMode) ? -1 : mode.highlighted_cell_two;

      this.segImage.filters([
        this.makeHighlightFilter(h1, h2, 255, -255, -255)
      ]);
    }
  }

  renderHighlightedAnnotationImage() {
    // preCompAdjust
    // TODO get highlighted cells?
    this._preparePreCompositeSegImage();
    this.segImage.getLayer().batchDraw();
  }

  _preparePostCompositeImage() {
    this.segImage.cache();

    // add outlines around conversion brush target/value
    const r1 = this.brush.target;
    const o1 = this.brush.value;

    const filters = [];

    if (this._currentHighlight) {
      const h1 = (this._editMode) ? o1 : mode.highlighted_cell_one;
      const h2 = (this._editMode) ? -1 : mode.highlighted_cell_two;
      filters.push(this.makeHighlightFilter(h1, h2, 255, -255, -255));
    }

    // red outline for conversion brush target
    const outlineAll = this._rgb; // ???
    const redOutline = (this._editMode && this.brush.conv && r1 !== -1);
    const singleOutline = (this._editMode && this.brush.conv && o1 !== -1);

    const compositeFilter = this.makePostCompsiteLabelFilter(
      redOutline, r1,
      singleOutline,
      o1,
      outlineAll
    );
    filters.push(compositeFilter);

    this.segImage.filters(filters);
  }

  renderPostAnnotationImage() {
    // create composite images
    this._prepareGrayscaleRawImage();
    this._preparePostCompositeImage();
    this.layer.batchDraw();
  }

  _preparePostCompositeImageRGB() {
    // add outlines around conversion brush target/value
    const r1 = this.brush.target;
    const redOutline = (this._editMode && this.brush.conv && r1 !== -1);
    // singleOutline never on for RGB
    const outlineAll = true;
    const singleOutline = false;
    const translucent = this._currentHighlight;

    let t1, t2;

    // translucent highlight
    if (this._currentHighlight) {
      if (this._editMode) {
        t1 = this.brush.value;
      } else {
        t1 = mode.highlighted_cell_one;
        t2 = mode.highlighted_cell_two;
      }
    }

    const filter = this.makePostCompsiteLabelFilter(
      redOutline, r1,
      singleOutline,
      -1, // o1 is not used for RGB
      outlineAll,
      translucent,
      t1, t2
    )
    this.segImage.filters([
      filter
    ]);
    this.segImage.getLayer().batchDraw();
  }

  renderCompositeImageRGB() {
    // draw contrastedRaw so we can extract image data
    this._prepareGrayscaleRawImage();
    // add outlines around conversion brush target/value
    this._preparePostCompositeImageRGB();
    this.layer.batchDraw();
  }

  renderCompositeImage() {
    // grayscale and invert (if required) raw data
    // TODO: filter is much darker than production
    this._prepareGrayscaleRawImage();
    this._preparePostCompositeImage();
    this.segImage.opacity(translucentOpacity);
    this.rawImage.visible(true);
    this.segImage.visible(true);
    this.layer.batchDraw();
  }

  renderImageDisplay() {
    if (this._editMode) {
      if (this._rgb && this._renderingRaw) {
        // edit mode (annotations overlaid on raw + brush preview)
        this.renderRawImage();
      } else if (!this._rgb && !this._displayLabels) {
        this.renderGrayscaleRawImage(); // grayscale + invert
      } else {
        // render postCompImg
        this.renderCompositeImage();
      }
      // this.brush.draw(ctx, sx, sy, swidth, sheight, scale * zoom / 100);
    } else if (!this._renderingRaw && this._rgb && !this._displayLabels) {
      // render postCompImg, calculated via postCompAdjustRGB
      this.renderCompositeImage();
    } else {
      this.renderSourceImages(); // looking good!
    }
    this.renderInfoDisplay();
  }

  /** Populate the information table with current data */
  renderInfoDisplay() {
    document.getElementById('frame').innerHTML = this._frame;
    document.getElementById('feature').innerHTML = this._feature;
    document.getElementById('channel').innerHTML = this._channel;
    const zoom = `${this.stage.scaleX() / 100}%`;
    document.getElementById('zoom').innerHTML = zoom;
    // document.getElementById('displayedX').innerHTML = `${Math.floor(sx)}-${Math.ceil(sx+swidth)}`;
    // document.getElementById('displayedY').innerHTML = `${Math.floor(sx)}-${Math.ceil(sx+swidth)}`;

    this.renderHighlightInfo();

    this.renderEditInfo();

    this.renderCellInfo();

    // always show 'state'
    // document.getElementById('mode').innerHTML = mode.render();
  }

  /** Populate the highlighted information */
  renderHighlightInfo() {
    let highlightStatus = 'OFF';
    let currentlyHighlighted = 'none';

    if (this._currentHighlight) {
      highlightStatus = 'ON';
      if (this._editMode) {
        currentlyHighlighted = this.brush.value > 0 ? this.brush.value : '-';
      } else if (mode.highlighted_cell_one !== -1) {
        if (mode.highlighted_cell_two !== -1) {
          currentlyHighlighted = `${mode.highlighted_cell_one}, ${mode.highlighted_cell_two}`;
        } else {
          currentlyHighlighted = mode.highlighted_cell_one;
        }
      }
    }
    document.getElementById('highlight').innerHTML = highlightStatus;
    document.getElementById('currently_highlighted').innerHTML = currentlyHighlighted;
  }

  /** Render the Edit Mode information */
  renderEditInfo() {
    const editing = this._editMode ? 'pixels' : 'whole labels';
    const visibility = this._editMode ? 'visible' : 'hidden';

    if (this._editMode) {
      document.getElementById('edit_brush').innerHTML = this.brush.size;

      const editLabel = this.brush.value > 0 ? this.brush.value : '-';
      document.getElementById('edit_label').innerHTML = editLabel;

      const editErase = this.brush.erase && this.brush.conv ? 'ON' : 'OFF';
      document.getElementById('edit_erase').innerHTML = editErase;
    }

    document.getElementById('edit_mode').innerHTML = editing;
    document.getElementById('edit_brush_row').style.visibility = visibility;
    document.getElementById('edit_label_row').style.visibility = visibility;
    document.getElementById('edit_erase_row').style.visibility = visibility;
  }

  /** Render Object Information */
  renderCellInfo() {
  }

  /** Render brush strokes */
  renderBrushDraw() {
    if (this._isPaint) {
      const pos = this.stage.getPointerPosition();
      var newPoints = lastLine.points().concat([pos.x, pos.y]);
      lastLine.points(newPoints);
      layer.batchDraw();
    }
  }

  /** Change the current contrast and render the raw image. */
  changeContrast(contrastDelta) {
    const modContrast = Math.sign(contrastDelta) * 4;
    // stop if fully desaturated
    const newContrast = Math.min(
      this._maxContrast,
      Math.max(
        this._minContrast,
        this.contrast + modContrast
      )
    );
    // stop at 8x contrast
    if (newContrast !== this.contrast) {
      this.contrast = newContrast;
      this.renderImageDisplay();
    }
  }

  /** Change the current brightness and render the raw image. */
  changeBrightness(brightnessDelta) {
    const modBrightness = Math.sign(brightnessDelta) / 100;
    // limit how brightness min and max
    const newBrightness = Math.min(
      this._maxBrightness,
      Math.max(
        this._minBrightness,
        this.brightness + modBrightness
      )
    );
    if (newBrightness !== this.brightness) {
      this.brightness = newBrightness;
      this.renderImageDisplay();
    }
  }

  /** Remove brightness and contrast filters and display the raw image. */
  resetBrightnessContrast() {
    this.brightness = 0;
    this.contrast = 0;
    this.renderImageDisplay();
  }

  /** Zoom to mouse coordinates.
   *
   * https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
   *
   */
  changeZoom(zoomDelta) {
    // TODO: length of X axis changes.
    const scaleBy = 1.05;
    // scaleX and scaleY should be equal.
    const oldScale = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();

    const newScale = zoomDelta > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // update mouse position if mouse is on the canvas
    if (newScale > this._minScale) { // never zoom out smaller than the image
      if (pointer.x) {
        this.stage.position({
          x: pointer.x * (1 - newScale / oldScale) + this.stage.x() * newScale / oldScale,
          y: pointer.y * (1 - newScale / oldScale) + this.stage.y() * newScale / oldScale
        });
      }
      this.stage.scale({ x: newScale, y: newScale });
      this.stage.batchDraw();
    }
  }

  /** Change current channel of raw data */
  changeChannel(newChannel) {
    // don't try and change channel if no other channels exist
    if (self._maxChannels > 1) {
      // change channel, wrap around if needed
      if (newChannel === this._maxChannels) {
        this._channel = 0;
      } else if (newChannel < 0) {
        this._channel = this._maxChannels - 1;
      } else {
        this._channel = newChannel;
      }
      // get new channel image from server
      this.action('change_channel', { channel: this.channel });
      this.brush.conv = false;
      this.brush.clearThresh();

      // get brightness/contrast vals for new channel
      this.renderImageDisplay();
    }
  }

  /** Change current feature of annotation data */
  changeFeature(newFeature) {
    // don't try and change feature if no other features exist
    if (self._maxFeatures > 1) {
      // change channel, wrap around if needed
      if (newFeature === this._maxFeatures) {
        this._feature = 0;
      } else if (newFeature < 0) {
        this._feature = this._maxFeatures - 1;
      } else {
        this._feature = newFeature;
      }
      // get new channel image from server
      this.action('change_feature', { feature: this.feature });
      this.brush.conv = false;
      this.brush.clearThresh();
      this.renderImageDisplay();
    }
  }

  /** Toggle the Invert filter and apply a Grayscale filter to the raw Image. */
  toggleInvert() {
    this._inverted = !this._inverted;
    this.renderImageDisplay();
  }

  /** Switch the zIndex of the raw and seg images. */
  toggleDisplayedImage() {
    this._renderingRaw = !this._renderingRaw;
    this.rawImage.visible(this._renderingRaw);
    this.segImage.visible(!this._renderingRaw);
    this.renderImageDisplay();
  }

  /** Toggle Edit Mode - Display grayscale raw with segmentations on top */
  toggleEditMode() {
    this._editMode = !this._editMode;
    console.log(`Edit mode is: ${this._editMode ? 'enabled' : 'disabled'}`)
    this.renderImageDisplay();
  }

  /** Toggle Highlight Mode - display highlight mask over single object */
  toggleHighlightMode() {
    this._currentHighlight = !this._currentHighlight;
    this.renderImageDisplay();
  }

  /** Fetch new data from backend API and render it. */
  fetchAndRenderFrame(frame) {
    console.log(`Fetching frame ${frame}...`);
    $.ajax({
      type: 'GET',
      url: document.location.origin + `frame/${frame}/${this._projectId}`,
      success: (payload) => {
        this._segImage.src = payload.segmented;
        this._rawImage.src = payload.raw;
        this._segArray = payload.seg_arr;
        this.renderImageDisplay();
      },
      async: true
    });
  }

  /** Increment the current frame and then fetch and render it. */
  renderPreviousFrame() {
    this._frame -= 1;
    if (this._frame < 0) {
      this._frame = this._maxFrames - 1;
    }
    this.fetchAndRenderFrame(this._frame);
  }

  /** Decrement the current frame and then fetch and render it. */
  renderNextFrame() {
    this._frame += 1;
    if (this._frame >= this._maxFrames) {
      this._frame = 0;
    }
    this.fetchAndRenderFrame(this._frame);
  }

  /** Perform action on data and render results */
  action(action, info, frame) {
    $.ajax({
      type: 'POST',
      url: document.location.origin + `action/${this._projectId}/${action}/${frame}`,
      data: info,
      success: (payload) => {
        if (payload.error) alert(payload.error);

        if (payload.imgs) {
          // load new value of seg_array
          // array of arrays, contains annotation data for frame
          // TODO: seg_array?
          if (Object.prototype.hasOwnProperty.call(payload.imgs, 'seg_arr')) {
            this._segArray = payload.imgs.seg_arr;
          }
          if (Object.prototype.hasOwnProperty.call(payload.imgs, 'segmented')) {
            this._segImage.src = payload.imgs.segmented;
          }
          if (Object.prototype.hasOwnProperty.call(payload.imgs, 'raw')) {
            this._rawImage.src = payload.imgs.raw;
          }
        }

        if (payload.tracks) {
          // update maxLabelsMap when we get new track info
          this._updateLabelMapFromTracks(payload.tracks);
        }

        if (payload.tracks || payload.imgs) {
          this.layer.drawBatch();
          // TODO: Update info table
        }
      },
      async: true
    });
  }

  _updateLabelMapFromTracks(tracks) {
    // for each feature, get list of cell labels that are in that feature
    // (each is a key in that dict), cast to numbers, then get the maximum
    // value from each array and store it in a map
    for (let i = 0; i < Object.keys(tracks).length; i++) {
      const key = Object.keys(tracks)[i]; // the keys are strings
      if (Object.keys(tracks[key]).length > 0) {
        // use i as key in this map because it is an int, mode.feature is also int
        this.maxLabelsMap.set(i, Math.max(...Object.keys(tracks[key]).map(Number)));
      } else {
        // if no labels in feature, explicitly set max label to 0
        this.maxLabelsMap.set(i, 0);
      }
    }
  }

  /** Custom Konva Filters for creating composite images */
  makeHighlightFilter(h1, h2, r, g, b) {
    // preCompAdjust
    return (imageData) => {
      const data = imageData.data;

      for (let i = 0; i < this._segArray.length; i += 1) { // y
        for (let j = 0; i < this._segArray[i].length; j += 1) { // x
          const currentVal = Math.abs(this._segArray[i][j]);
          if (currentVal === h1 || currentVal === h2) {
            const pixelNum = (this._segArray[i].length * i + j) * 4;
            // set to color by changing RGB values
            // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
            data[pixelNum] += r;
            data[pixelNum + 1] += g;
            data[pixelNum + 2] += b;
          }
        }
      }
    }
  };

  makePostCompsiteLabelFilter(
    redOutline = false, r1 = -1,
    singleOutline = false, o1 = -1,
    outlineAll = false,
    translucent = false,
    t1 = -1, t2 = -1
  ) {
    return (imageData) => {
      const data = imageData.data;
      // use label array to figure out which pixels to recolor
      for (let j = 0; j < this._segArray.length; j += 1) { // y
        for (let i = 0; i < this._segArray[j].length; i += 1) { // x
          const pixelNum = (this._segArray[j].length * j + i) * 4;
          const currentVal = this._segArray[j][i];
          let r, g, b;
          // outline red
          if (redOutline && currentVal === -r1) {
            r = 255; g = -255; b = -255;
          // outline white single
          } else if (singleOutline && currentVal === -o1) {
            r = 255; g = 255; b = 255;
          // outline all remaining edges with white
          } else if (outlineAll && currentVal < 0) {
            r = 255; g = 255; b = 255;
          // translucent highlight
          } else if (translucent &&
                (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
            r = 60; g = 60; b = 60;
          } else {
            continue;
          }
          // set to color by changing RGB values
          // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
          data[pixelNum] += r;
          data[pixelNum + 1] += g;
          data[pixelNum + 2] += b;
        }
      }
    };
  }

  /** Detect available container space and scale the stage into that space. */
  fitStageIntoParentContainer() {
    const maxWidth = _calculateMaxWidth();
    const maxHeight = _calculateMaxHeight();

    // to fit stage into parent we need to scale the stage
    const scale = Math.min(
      maxWidth / this._rawWidth,
      maxHeight / this._rawHeight
    );

    // set the stage to fill available area.
    this.stage.width(maxWidth);
    this.stage.height(maxHeight);
    this.stage.scale({ x: scale, y: scale });
    this.brush.refreshView();
    this.stage.draw();
    this._minScale = scale;
  }

  /** Key binding functions */
  handleKeyPress(event) {
    this.handleUniversalKeybind(event);

    this.handleNonRGBKeybind(event); // if rgb mode is false

    this.handleRGBKeybind(event); // if rgb mode is true

    this.handleUniversalEditKeybind(event); // if editMode is true
  }

  /** Universal keybinds, always active */
  handleUniversalKeybind(event) {
    const key = event.key;
    // universal keybinds
    if (key === 'e') {
      this.toggleEditMode();
    } else if (key === '0') {
      this.resetBrightnessContrast();
    } else if (key === 'z' && !this._editMode) {
      this.toggleDisplayedImage();
    } else if (key === '-') {
      this.changeZoom(-1);
    } else if (key === '=') {
      this.changeZoom(1);
    } else if (key === 'Escape') {
      this.brush.conv = false;
      this.brush.clearThresh();
    } else if (key === 'l' || key === 'L') {
      // this was a bit confusing...
      if ((this._rgb && !this._editMode) || (!this._rgb && this._pixelOnly)) {
        this._displayLabels = !this._displayLabels;
        this.renderImageDisplay();
      }
    } else if (key === 'c') {
      this.changeChannel(this.channel + 1);
    } else if (key === 'C') {
      this.changeChannel(this.channel - 1);
    } else if (key === 'f') {
      this.changeFeature(this.feature + 1);
    } else if (key === 'F') {
      this.changeFeature(this.feature - 1);
    }
  }

  /** Non-RGB mode keybinds */
  handleNonRGBKeybind(event) {
    if (!this._rgb) {
      const key = event.key;
      if ((key === 'a' || key === 'ArrowLeft')) {
        this.renderPreviousFrame();
      } else if ((key === 'd' || key === 'ArrowRight')) {
        this.renderNextFrame();
      } else if (key === 'h' && this._editMode) {
        this.toggleHighlightMode();
      }
    }
  }

  /** RGB mode keybinds */
  handleRGBKeybind(event) {
    const key = event.key;
    if (this._rgb) {
    }
  }

  /** Edit Mode keybinds */
  handleUniversalEditKeybind(event) {
    if (this._editMode) {
      const key = event.key;
      if (key === 'ArrowDown') {
        // decrease brush size, minimum size 1
        this.brush.size -= 1;
        // redraw the frame with the updated brush preview
        this.renderImageDisplay();
      } else if (key === 'ArrowUp') {
        // increase brush size, diameter shouldn't be larger than the image
        this.brush.size += 1;
        // redraw the frame with the updated brush preview
        this.renderImageDisplay();
      } else if (key === 'i' && !this._rgb) {
        this.toggleInvert();
      } else if (key === 'h' && !this._rgb) {
        // preCompAdjust
        this.toggleHighlightMode();
      }
    }
  }
}

const _calculateMaxWidth = () => {
  const mainSection = window.getComputedStyle(
    document.getElementsByTagName('main')[0]
  );
  const canvasColumn = window.getComputedStyle(
    document.getElementById('canvas-col')
  );
  const maxWidth = Math.floor(
    document.getElementsByTagName('main')[0].clientWidth -
    parseInt(mainSection.marginTop) -
    parseInt(mainSection.marginBottom) -
    parseFloat(canvasColumn.paddingLeft) -
    parseFloat(canvasColumn.paddingRight) -
    parseFloat(canvasColumn.marginLeft) -
    parseFloat(canvasColumn.marginRight)
  );
  return maxWidth;
}

const _calculateMaxHeight = () => {
  const mainSection = window.getComputedStyle(
    document.getElementsByTagName('main')[0]
  );
  // leave space for navbar, instructions pane, and footer
  const maxHeight = Math.floor(
    (
      (
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight
      ) -
      parseInt(mainSection.marginTop) -
      parseInt(mainSection.marginBottom) -
      document.getElementsByClassName('page-footer')[0].clientHeight -
      document.getElementsByClassName('navbar-fixed')[0].clientHeight
    )
  );
  return maxHeight;
}

const waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = 'Don\'t call this twice without a uniqueId';
    }
    if (timers[uniqueId]) {
      clearTimeout(timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();

const loadFile = (file, rgb, cb) => {
  $.ajax({
    type: 'POST',
    url: document.location.origin + `load/${file}?&rgb=${rgb}`,
    success: cb,
    async: true
  });
}

/** Create a Caliban instance and start all event listeners. */
function startCaliban(filename, settings) {
  console.log('Starting Caliban...');
  loadFile(filename, settings.rgb, (payload) => {
    console.log(`Loaded File: ${filename}`);
    const caliban = new Caliban(
      payload.project_id,
      payload.dimensions[0],
      payload.dimensions[1],
      payload.max_frames,
      payload.seg_arr,
      settings.rgb,
      settings.pixel_only,
      settings.label_only
    );

    // resize the stage on window resize events
    window.addEventListener('resize', () => {
      waitForFinalEvent(() => {
        caliban.brush.conv = false;
        caliban.brush.clearThresh();
        caliban.brush.refreshView();
        caliban.fitStageIntoParentContainer();
      }, 500, 'canvasResize');
    });

    document.addEventListener('keydown', (event) => {
      caliban.handleKeyPress(event)
    }, false);

    caliban._updateLabelMapFromTracks(payload.tracks);
    caliban.fetchAndRenderFrame(caliban._frame);
  });
}
