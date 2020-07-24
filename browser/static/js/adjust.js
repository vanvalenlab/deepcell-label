// helper functions

class ImageAdjuster{
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

    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // these will never change once initialized
    this.height = height;
    this.width = width;

    this.rgb = rgb;

    // TODO: also want invertMap for better adjustments
    // when toggling between different channels
    this.displayInvert = true;

    // brightness and contrast adjustment
    // TODO: have this returned by a getter w/o a setter?
    this.MIN_CONTRAST = -100;
    this.MAX_CONTRAST = 700;

    this.contrastMap = new Map();
    this.brightnessMap = new Map();

    for (let i = 0; i < channelMax; i++) {
        this.brightnessMap.set(i, 0);
        this.contrastMap.set(i, 0);
      }
    this.brightness = this.brightnessMap.get(0);
    this.contrast = this.contrastMap.get(0);

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

    if (rgb) {
      this.rawImage.onload = () => this.contrastRaw();
      this.contrastedRaw.onload = () => this.rawAdjust(current_highlight, edit_mode, brush, mode);
      this.segImage.onload = () => this.preCompAdjust(current_highlight, edit_mode, brush, mode);
      this.preCompSeg.onload = () => this.segAdjust(current_highlight, edit_mode, brush, mode);
    } else {
      this.rawImage.onload = () => this.contrastRaw();
      this.contrastedRaw.onload = () => this.preCompRawAdjust();
      this.preCompRaw.onload = () => this.rawAdjust(current_highlight, edit_mode, brush, mode);
      this.segImage.onload = () => this.preCompAdjust(current_highlight, edit_mode, brush, mode);
      this.preCompSeg.onload = () => this.segAdjust(current_highlight, edit_mode, brush, mode);
      this.compositedImg.onload = () => this.postCompAdjust(edit_mode, brush);
    }

    this.rawLoaded = false;
    this.segLoaded = false;
  }

  // TODO: getters/setters for brightness and contrast?
  // or use this group of methods?

  changeContrast(inputChange) {
    let modContrast = -Math.sign(inputChange) * 4;
    // stop if fully desaturated
    let newContrast = Math.max(this.contrast + modContrast, this.MIN_CONTRAST);
    // stop at 8x contrast
    newContrast = Math.min(newContrast, this.MAX_CONTRAST);

    if (newContrast !== this.contrast) {
      // need to retrigger downstream image adjustments
      this.rawLoaded = false;
      this.contrast = newContrast;
      this.contrastRaw();
    }
  }

  changeBrightness(inputChange) {
    let modBrightness = -Math.sign(inputChange);
    let newBrightness = Math.min(this.brightness + modBrightness, 255);
    newBrightness = Math.max(newBrightness + modBrightness, -512);

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
  _recolorScaled(data, i, j, jlen, r=255, g=255, b=255) {
    // location in 1D array based on i and j
    let pixel_num = jlen*j + i;
    // set to color by changing RGB values
    // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
    data[(pixel_num*4)] += r;
    data[(pixel_num*4) + 1] += g;
    data[(pixel_num*4) + 2] += b;
  }

  // image adjustment functions: take img as input and manipulate data attribute
  // pixel data is 1D array of 8bit RGBA values
  // TODO: do we want to pass in B&C values or use object attributes?
  _contrast_image(img, contrast=0, brightness=0) {
    let d = img.data;
    contrast = (contrast / 100) + 1;
    for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i]*contrast + brightness;
        d[i + 1] = d[i+1]*contrast + brightness;
        d[i + 2] = d[i+2]*contrast + brightness;
    }
  }

  _grayscale(img) {
    let data = img.data;
    for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i]     = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
  }

  _invert(img) {
    let data = img.data;
    for (var i = 0; i < data.length; i += 4) {
      data[i]     = 255 - data[i];     // red
      data[i + 1] = 255 - data[i + 1]; // green
      data[i + 2] = 255 - data[i + 2]; // blue
    }
  }

  preCompositeLabelMod(img, h1, h2) {
    let r, g, b;
    let ann = img.data;
    // use label array to figure out which pixels to recolor
    for (var j = 0; j < seg_array.length; j += 1){ // y
      for (var i = 0; i < seg_array[j].length; i += 1){ // x
        let jlen = seg_array[j].length;
        let currentVal = Math.abs(seg_array[j][i]);
        if (currentVal === h1 || currentVal === h2) {
          this._recolorScaled(ann, i, j, jlen, r=255, g=-255, b=-255);
        }
      }
    }
  }

  postCompositeLabelMod(img,
      redOutline=false, r1=-1,
      singleOutline=false, o1=-1,
      outlineAll = false,
      translucent=false, t1=-1, t2=-1) {

    let r, g, b;
    let ann = img.data;
    // use label array to figure out which pixels to recolor
    for (var j = 0; j < seg_array.length; j += 1){ // y
      for (var i = 0; i < seg_array[j].length; i += 1){ // x
        let jlen = seg_array[j].length;
        let currentVal = seg_array[j][i];
        // outline red
        if (redOutline && currentVal === -r1) {
          this._recolorScaled(ann, i, j, jlen, r=255, g=-255, b=-255);
          continue;
        // outline white single
        } else if (singleOutline && currentVal === -o1) {
          this._recolorScaled(ann, i, j, jlen, r=255, g=255, b=255);
          continue;
        // outline all remaining edges with white
        } else if (outlineAll && currentVal < 0) {
          this._recolorScaled(ann, i, j, jlen, r=255, g=255, b=255);
          continue;
        // translucent highlight
        } else if (translucent &&
              (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
          this._recolorScaled(ann, i, j, jlen, r=60, g=60, b=60);
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
    let rawData = this.ctx.getImageData(0, 0, this.width, this.height);
    this._contrast_image(rawData, this.contrast, this.brightness);
    this.ctx.putImageData(rawData, 0, 0);

    this.contrastedRaw.src = this.canvas.toDataURL();
  }

  preCompAdjust(current_highlight, edit_mode, brush, mode) {

    this.segLoaded = false;

    // draw segImage so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.segImage, 0, 0, this.width, this.height);

    if (current_highlight) {
      let segData = this.ctx.getImageData(0, 0, this.width, this.height);
      let h1, h2;

      if (edit_mode) {
        h1 = brush.value;
        h2 = -1;
      } else {
        h1 = mode.highlighted_cell_one;
        h2 = mode.highlighted_cell_two;
      }

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
    let rawData = this.ctx.getImageData(0, 0, this.width, this.height);
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
    this.ctx.globalAlpha = 0.3;
    this.ctx.drawImage(this.preCompSeg, 0, 0, this.width, this.height);
    this.ctx.restore();

    this.compositedImg.src = this.canvas.toDataURL();
  }

  // apply outlines, transparent highlighting
  postCompAdjust(edit_mode, brush) {

    // draw compositedImg so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.compositedImg, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    let imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;
    // red outline for conversion brush target
    if (edit_mode && brush.conv && brush.target !== -1) {
      redOutline = true;
      r1 = brush.target;
    }
    if (edit_mode && brush.conv && brush.value !== -1) {
      singleOutline = true;
      o1 = brush.value;
    }

    this.postCompositeLabelMod(imgData, redOutline, r1, singleOutline, o1,
                          outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  // apply outlines, transparent highlighting for RGB
  postCompAdjustRGB(current_highlight, edit_mode, brush, mode) {

    // draw contrastedRaw so we can extract image data
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.contrastedRaw, 0, 0, this.width, this.height);

    // add outlines around conversion brush target/value
    let imgData = this.ctx.getImageData(0, 0, this.width, this.height);

    let redOutline, r1, singleOutline, o1, outlineAll, translucent, t1, t2;

    // red outline for conversion brush target
    if (edit_mode && brush.conv && brush.target !== -1) {
      redOutline = true;
      r1 = brush.target;
    }

    // singleOutline never on for RGB

    outlineAll = true;

    // translucent highlight
    if (current_highlight) {
      translucent = true;
      if (edit_mode) {
        t1 = brush.value;
      } else {
        t1 = mode.highlighted_cell_one;
        t2 = mode.highlighted_cell_two;
      }
    }

    this.postCompositeLabelMod(imgData, redOutline, r1, singleOutline, o1,
      outlineAll, translucent, t1, t2);

    this.ctx.putImageData(imgData, 0, 0);

    this.postCompImg.src = this.canvas.toDataURL();
  }

  segAdjust(current_highlight, edit_mode, brush, mode) {
    this.segLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB(current_highlight, edit_mode, brush, mode);
      } else {
        this.compositeImages();
      }
    }
  }

  rawAdjust(current_highlight, edit_mode, brush, mode) {
    this.rawLoaded = true;
    if (this.rawLoaded && this.segLoaded) {
      if (this.rgb) {
        this.postCompAdjustRGB(current_highlight, edit_mode, brush, mode);
      } else {
        this.compositeImages();
      }
    }
  }
}
