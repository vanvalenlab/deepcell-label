// helper functions

export class ImageAdjuster {
  constructor(model) {
    this.model = model;

    // canvas element used for image processing
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'adjustCanvas';

    // this canvas should never be seen
    this.canvas.style.display = 'none';

    // same dimensions as true image size
    this.canvas.height = model.height;
    this.canvas.width = model.width;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // these will never change once initialized
    this.height = model.height;
    this.width = model.width;

    this.rgb = model.rgb;

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

    for (let i = 0; i < model.numChannels; i++) {
      this.brightnessMap.set(i, 0);
      this.contrastMap.set(i, 0);
      this.invertMap.set(i, true);
    }
    this._brightness = 0;
    this._contrast = 0;
    this._displayInvert = true;

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

    // image processing cascade, finishing with a notification that images are ready
    this.rawImage.onload = () => this.contrastRaw();
    this.segImage.onload = () => this.preCompAdjust();
    if (this.rgb) {
      this.contrastedRaw.onload = () => this.rawAdjust();
      this.preCompSeg.onload = () => this.segAdjust();
    } else {
      this.contrastedRaw.onload = () => this.preCompRawAdjust();
      this.preCompRaw.onload = () => this.rawAdjust();
      this.preCompSeg.onload = () => this.segAdjust();
      this.compositedImg.onload = () => this.postCompAdjust();
    }
    this.postCompImg.onload = () => this.model.notifyImageChange();
  }

  get brightness() {
    return this._brightness;
  }

  set brightness(value) {
    // limit how dim image can go
    let newBrightness = Math.max(value, this.minBrightness);
    // limit how bright image can go
    newBrightness = Math.min(newBrightness, this.maxBrightness);
    this._brightness = newBrightness;
    this.rawLoaded = false;
    this.contrastRaw();
  }

  get contrast() {
    return this._contrast;
  }

  set contrast(value) {
    // stop if fully desaturated
    let newContrast = Math.max(value, this.minContrast);
    // stop at 8x contrast
    newContrast = Math.min(newContrast, this.maxContrast);
    this._contrast = newContrast;
    this.rawLoaded = false;
    this.contrastRaw();
  }

  get displayInvert() {
    return this._displayInvert;
  }

  set displayInvert(value) {
    this._displayInvert = value;
    this.preCompRawAdjust();
  }

  get segArray() {
    return this.model.segArray;
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

  preCompositeLabelMod(img, h1, h2) {
    let r, g, b;
    const ann = img.data;
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < this.segArray.length; j += 1) { // y
      for (let i = 0; i < this.segArray[j].length; i += 1) { // x
        const jlen = this.segArray[j].length;
        const currentVal = Math.abs(this.segArray[j][i]);
        if (currentVal === h1 || currentVal === h2) {
          this._recolorScaled(ann, i, j, jlen, r = 255, g = -255, b = -255);
        }
      }
    }
  }

  postCompositeLabelMod(img,
    redOutline = false, r1 = -1,
    singleOutline = false, o1 = -1,
    outlineAll = false,
    translucent = false, t1 = -1, t2 = -1) {
    let r, g, b;
    const ann = img.data;
    // use label array to figure out which pixels to recolor
    for (let j = 0; j < this.segArray.length; j += 1) { // y
      for (let i = 0; i < this.segArray[j].length; i += 1) { // x
        const jlen = this.segArray[j].length;
        const currentVal = this.segArray[j][i];
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

  preCompAdjust() {
    this.segLoaded = false;

    // draw segImage so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.segImage, 0, 0, this.width, this.height);

    if (this.model.highlight) {
      const segData = this.ctx.getImageData(0, 0, this.width, this.height);

      const label = this.model.selected.label;
      const secondLabel = this.model.selected.secondLabel === 0;
      // Don't highlight background pixels by changing to -1
      const h1 = label === 0 ? -1 : label;
      const h2 = secondLabel === 0 ? -1 : secondLabel;

      // highlight
      this.preCompositeLabelMod(segData, h1, h2);
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
  postCompAdjust() {
    // draw compositedImg so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.compositedImg, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;

    const foreground = this.model.selected.label;
    const background = this.model.selected.secondLabel;

    if (foreground !== 0) {
      singleOutline = true;
      o1 = foreground;
    }

    if (background !== 0) {
      redOutline = true;
      r1 = background;
    }

    this.postCompositeLabelMod(
      imgData, redOutline, r1, singleOutline, o1,
      outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  // apply outlines, transparent highlighting for RGB
  postCompAdjustRGB() {
    // draw contrastedRaw so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.contrastedRaw, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, translucent, t1, t2;

    // red outline for brush target
    const background = this.model.selected.secondLabel;
    if (background !== 0) {
      redOutline = true;
      r1 = background;
    }

    // singleOutline never on for RGB

    const outlineAll = true;

    // translucent highlight
    if (this.model.highlight) {
      translucent = true;
      const foreground = this.model.selected.label;
      const background = this.model.selected.secondLabel;
      if (foreground !== 0) {
        t1 = foreground;
      }
      if (background !== 0) {
        t2 = background;
      }
    }

    this.postCompositeLabelMod(
      imgData, redOutline, r1, singleOutline, o1,
      outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  segAdjust() {
    this.segLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB();
      } else {
        this.compositeImages();
      }
    }
  }

  rawAdjust() {
    this.rawLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB();
      } else {
        this.compositeImages();
      }
    }
  }
}
