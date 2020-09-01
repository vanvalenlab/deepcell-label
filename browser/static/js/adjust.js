// helper functions

class ImageAdjuster {
  constructor(width, height, rgb, channelMax) {
    // canvas element used for image processing
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'adjustCanvas';

    // this canvas should never be seen
    this.canvas.style.display = 'none';

    // same dimensions as true image size
    this.canvas.height = height;
    this.canvas.width = width;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // these will never change once initialized
    this.height = height;
    this.width = width;

    this.rgb = rgb;

    // this can be between 0.0 and 1.0, inclusive (1 is fully opaque)
    // want to make user-adjustable in future
    this.labelTransparency = 0.3;

    // brightness and contrast adjustment
    this._minContrast = -100;
    this._maxContrast = 700;

    this._minBrightness = -512;
    this._maxBrightness = 255;

    // image adjustments are stored per channel for better viewing
    this.contrastMap = new Map();
    this.brightnessMap = new Map();
    this.invertMap = new Map();

    for (let i = 0; i < channelMax; i++) {
      this.brightnessMap.set(i, 0);
      this.contrastMap.set(i, 0);
      this.invertMap.set(i, true);
    }
    this.brightness = this.brightnessMap.get(0);
    this.contrast = this.contrastMap.get(0);
    this.displayInvert = this.invertMap.get(0);

    // raw and adjusted image storage
    // cascasding image updates if raw or seg is reloaded
    this.rawImage = new Image();
    this.contrastedRaw = new Image();
    this.preCompRaw = new Image();

    this.segImage = new Image();
    this.preCompSeg = new Image();

    // adjusted raw + annotations
    this.compositedImg = new Image();

    // composite image + outlines, transparent highlight
    this.postCompImg = new Image();

    this.rawLoaded = false;
    this.segLoaded = false;
  }

  // getters for brightness/contrast allowed ranges
  // no setters; these should remain fixed
  get minBrightness() {
    return this._minBrightness;
  }

  get maxBrightness() {
    return this._maxBrightness;
  }

  get minContrast() {
    return this._minContrast;
  }

  get maxContrast() {
    return this._maxContrast;
  }

  changeContrast(inputChange) {
    const modContrast = -Math.sign(inputChange) * 4;
    // stop if fully desaturated
    let newContrast = Math.max(this.contrast + modContrast, this.minContrast);
    // stop at 8x contrast
    newContrast = Math.min(newContrast, this.maxContrast);

    if (newContrast !== this.contrast) {
      // need to retrigger downstream image adjustments
      this.rawLoaded = false;
      this.contrast = newContrast;
      this.contrastRaw();
    }
  }

  changeBrightness(inputChange) {
    const modBrightness = -Math.sign(inputChange);
    // limit how dim image can go
    let newBrightness = Math.max(this.brightness + modBrightness, this.minBrightness);
    // limit how bright image can go
    newBrightness = Math.min(newBrightness, this.maxBrightness);

    if (newBrightness !== this.brightness) {
      this.rawLoaded = false;
      this.brightness = newBrightness;
      this.contrastRaw();
    }
  }

  resetBrightnessContrast() {
    this.brightness = 0;
    this.contrast = 0;
    this.rawLoaded = false;
    this.contrastRaw();
  }

  toggleInvert() {
    this.displayInvert = !this.displayInvert;
    this.preCompRawAdjust();
  }

  // modify image data in place to recolor
  _recolorScaled(data, i, j, jlen, r = 255, g = 255, b = 255) {
    // location in 1D array based on i and j
    const pixelNum = (jlen * j + i) * 4;
    // set to color by changing RGB values
    // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
    data[pixelNum] += r;
    data[pixelNum + 1] += g;
    data[pixelNum + 2] += b;
  }

  // image adjustment functions: take img as input and manipulate data attribute
  // pixel data is 1D array of 8bit RGBA values
  _contrastImage(img, contrast = 0, brightness = 0) {
    const d = img.data;
    contrast = (contrast / 100) + 1;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] * contrast + brightness;
      d[i + 1] = d[i + 1] * contrast + brightness;
      d[i + 2] = d[i + 2] * contrast + brightness;
    }
  }

  _grayscale(img) {
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
  }

  _invert(img) {
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // red
      data[i + 1] = 255 - data[i + 1]; // green
      data[i + 2] = 255 - data[i + 2]; // blue
    }
  }

  preCompositeLabelMod(img, segArray, h1, h2) {
    let r, g, b;
    const ann = img.data;
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < segArray.length; j += 1) { // y
      for (let i = 0; i < segArray[j].length; i += 1) { // x
        const jlen = segArray[j].length;
        const currentVal = Math.abs(segArray[j][i]);
        if (currentVal === h1 || currentVal === h2) {
          this._recolorScaled(ann, i, j, jlen, r = 255, g = -255, b = -255);
        }
      }
    }
  }

  postCompositeLabelMod(img, segArray,
    redOutline = false, r1 = -1,
    singleOutline = false, o1 = -1,
    outlineAll = false,
    translucent = false, t1 = -1, t2 = -1) {
    let r, g, b;
    const ann = img.data;
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < segArray.length; j += 1) { // y
      for (let i = 0; i < segArray[j].length; i += 1) { // x
        const jlen = segArray[j].length;
        const currentVal = segArray[j][i];
        // outline red
        if (redOutline && currentVal === -r1) {
          this._recolorScaled(ann, i, j, jlen, r = 255, g = -255, b = -255);
          continue;
        // outline white single
        } else if (singleOutline && currentVal === -o1) {
          this._recolorScaled(ann, i, j, jlen, r = 255, g = 255, b = 255);
          continue;
        // outline all remaining edges with white
        } else if (outlineAll && currentVal < 0) {
          this._recolorScaled(ann, i, j, jlen, r = 255, g = 255, b = 255);
          continue;
        // translucent highlight
        } else if (translucent &&
              (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
          this._recolorScaled(ann, i, j, jlen, r = 60, g = 60, b = 60);
          continue;
        }
      }
    }
  }

  // apply contrast+brightness to raw image
  contrastRaw() {
    // draw rawImage so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.rawImage, 0, 0, this.width, this.height);
    const rawData = this.ctx.getImageData(0, 0, this.width, this.height);
    this._contrastImage(rawData, this.contrast, this.brightness);
    this.ctx.putImageData(rawData, 0, 0);

    this.contrastedRaw.src = this.canvas.toDataURL();
  }

  preCompAdjust(segArray, currentHighlight, editMode, brush, mode) {
    this.segLoaded = false;

    // draw segImage so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.segImage, 0, 0, this.width, this.height);

    if (currentHighlight) {
      const segData = this.ctx.getImageData(0, 0, this.width, this.height);
      let h1, h2;

      if (editMode) {
        h1 = brush.value;
        h2 = -1;
      } else {
        h1 = mode.highlighted_cell_one;
        h2 = mode.highlighted_cell_two;
      }

      // highlight
      this.preCompositeLabelMod(segData, segArray, h1, h2);
      this.ctx.putImageData(segData, 0, 0);
    }

    // once this new src is loaded, displayed image will be rerendered
    this.preCompSeg.src = this.canvas.toDataURL();
  }

  // adjust raw further, pre-compositing (use to draw when labels hidden)
  preCompRawAdjust() {
    // further adjust raw image
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.contrastedRaw, 0, 0, this.width, this.height);
    const rawData = this.ctx.getImageData(0, 0, this.width, this.height);
    this._grayscale(rawData);
    if (this.displayInvert) {
      this._invert(rawData);
    }
    this.ctx.putImageData(rawData, 0, 0);

    this.preCompRaw.src = this.canvas.toDataURL();
  }

  // composite annotations on top of adjusted raw image
  compositeImages() {
    this.ctx.drawImage(this.preCompRaw, 0, 0, this.width, this.height);

    // add labels on top
    this.ctx.save();
    this.ctx.globalAlpha = this.labelTransparency;
    this.ctx.drawImage(this.preCompSeg, 0, 0, this.width, this.height);
    this.ctx.restore();

    this.compositedImg.src = this.canvas.toDataURL();
  }

  // apply white (and sometimes red) opaque outlines around cells, if needed
  postCompAdjust(segArray, editMode, brush, currentHighlight) {
    // draw compositedImg so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.compositedImg, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;
    // red outline for conversion brush target
    if (editMode && brush.conv && brush.target !== -1) {
      redOutline = true;
      r1 = brush.target;
    }
    // white outline for conversion brush drawing value
    if (editMode && brush.conv && brush.value !== -1) {
      singleOutline = true;
      o1 = brush.value;
    }
    // add an outline around the currently highlighted cell, if there is one
    // but only if the brush isn't set to conversion brush mode
    if (editMode && currentHighlight && !brush.conv) {
      singleOutline = true;
      o1 = brush.value;
    }

    this.postCompositeLabelMod(
      imgData, segArray, redOutline, r1, singleOutline, o1,
      outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  // apply outlines, transparent highlighting for RGB
  postCompAdjustRGB(segArray, currentHighlight, editMode, brush, mode) {
    // draw contrastedRaw so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.contrastedRaw, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, translucent, t1, t2;

    // red outline for conversion brush target
    if (editMode && brush.conv && brush.target !== -1) {
      redOutline = true;
      r1 = brush.target;
    }

    // singleOutline never on for RGB

    const outlineAll = true;

    // translucent highlight
    if (currentHighlight) {
      translucent = true;
      if (editMode) {
        t1 = brush.value;
      } else {
        t1 = mode.highlighted_cell_one;
        t2 = mode.highlighted_cell_two;
      }
    }

    this.postCompositeLabelMod(
      imgData, segArray, redOutline, r1, singleOutline, o1,
      outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  segAdjust(segArray, currentHighlight, editMode, brush, mode) {
    this.segLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB(segArray, currentHighlight, editMode, brush, mode);
      } else {
        this.compositeImages();
      }
    }
  }

  rawAdjust(segArray, currentHighlight, editMode, brush, mode) {
    this.rawLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB(segArray, currentHighlight, editMode, brush, mode);
      } else {
        this.compositeImages();
      }
    }
  }
}
