// helper functions

// modify image data in place to recolor
function recolorScaled(data, i, j, jlen, r=255, g=255, b=255) {
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
function contrast_image(img, contrast = 0, brightness = 0) {
  let d = img.data;
  contrast = (contrast / 100) + 1;
  for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i]*contrast + brightness;
      d[i + 1] = d[i+1]*contrast + brightness;
      d[i + 2] = d[i+2]*contrast + brightness;
  }
  return img;
}

function grayscale(img) {
  let data = img.data;
  for (var i = 0; i < data.length; i += 4) {
      var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i]     = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
  return img;
}

function invert(img) {
  let data = img.data;
  for (var i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];     // red
    data[i + 1] = 255 - data[i + 1]; // green
    data[i + 2] = 255 - data[i + 2]; // blue
    }
  return img;
}

function preCompositeLabelMod(img, h1, h2) {
  let ann = img.data;
  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;
      let currentVal = Math.abs(seg_array[j][i]);
      if (currentVal === h1 || currentVal === h2) {
        recolorScaled(ann, i, j, jlen, r=255, g=-255, b=-255);
      }
    }
  }
}

function postCompositeLabelMod(img,
    redOutline=false, r1=-1,
    singleOutline=false, o1=-1,
    outlineAll = false,
    translucent=false, t1=-1, t2=-1) {

  let ann = img.data;
  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;
      let currentVal = seg_array[j][i];
      // outline red
      if (redOutline && currentVal === -r1) {
        recolorScaled(ann, i, j, jlen, r=255, g=-255, b=-255);
        continue;
      // outline white single
      } else if (singleOutline && currentVal === -o1) {
        recolorScaled(ann, i, j, jlen, r=255, g=255, b=255);
        continue;
      // outline all remaining edges with white
      } else if (outlineAll && currentVal < 0) {
        recolorScaled(ann, i, j, jlen, r=255, g=255, b=255);
        continue;
      // translucent highlight
      } else if (translucent &&
            (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
        recolorScaled(ann, i, j, jlen, r=60, g=60, b=60);
        continue;
      }
    }
  }
}

// apply contrast+brightness to raw image
function contrastRaw(contrast, brightness) {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(raw_image, 0, 0, rawWidth, rawHeight);
  let rawData = ctx.getImageData(0, 0, rawWidth, rawHeight);
  contrast_image(rawData, contrast, brightness);
  ctx.putImageData(rawData, 0, 0);

  contrastedRaw.src = canvas.toDataURL();
}

function preCompAdjust() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(seg_image, 0, 0, rawWidth, rawHeight);

  if (current_highlight) {
    let segData = ctx.getImageData(0, 0, rawWidth, rawHeight);

    if (edit_mode) {
      h1 = brush.value;
      h2 = -1;
    } else {
      h1 = mode.highlighted_cell_one;
      h2 = mode.highlighted_cell_two;
    }

    // highlight
    preCompositeLabelMod(segData, h1, h2);
    ctx.putImageData(segData, 0, 0);
  }

  // once this new src is loaded, displayed image will be rerendered
  preCompSeg.src = canvas.toDataURL();
}

// adjust raw further, pre-compositing (use to draw when labels hidden)
function preCompRawAdjust() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // further adjust raw image
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(contrastedRaw, 0, 0, rawWidth, rawHeight);
  let rawData = ctx.getImageData(0, 0, rawWidth, rawHeight);
  grayscale(rawData);
  if (display_invert) {
    invert(rawData);
  }
  ctx.putImageData(rawData, 0, 0);

  preCompRaw.src = canvas.toDataURL();
}

// composite annotations on top of adjusted raw image
function compositeImages() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(preCompRaw, 0, 0, rawWidth, rawHeight);

  // add labels on top
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.drawImage(preCompSeg, 0, 0, rawWidth, rawHeight);
  ctx.restore();

  compositedImg.src = canvas.toDataURL();
}

// apply outlines, transparent highlighting
function postCompAdjust() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(compositedImg, 0, 0, rawWidth, rawHeight);

  // add outlines around conversion brush target/value
  let imgData = ctx.getImageData(0, 0, rawWidth, rawHeight);

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

  postCompositeLabelMod(imgData, redOutline, r1, singleOutline, o1,
                        outlineAll, translucent, t1, t2);

  ctx.putImageData(imgData, 0, 0);

  postCompImg.src = canvas.toDataURL();
}

// apply outlines, transparent highlighting for RGB
function postCompAdjustRGB() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, rawWidth, rawHeight);
  ctx.drawImage(contrastedRaw, 0, 0, rawWidth, rawHeight);

  // add outlines around conversion brush target/value
  let imgData = ctx.getImageData(0, 0, rawWidth, rawHeight);

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

  postCompositeLabelMod(imgData, redOutline, r1, singleOutline, o1,
    outlineAll, translucent, t1, t2);

  ctx.putImageData(imgData, 0, 0);

  postCompImg.src = canvas.toDataURL();
}

function prepareRaw() {
  contrastRaw(current_contrast, brightness);
}

function segAdjust() {
  segLoaded = true;
  if (rawLoaded && segLoaded) {
    if (rgb) {
      postCompAdjustRGB();
    } else {
      compositeImages();
    }
  }
}

function rawAdjust() {
  rawLoaded = true;
  if (rawLoaded && segLoaded) {
    if (rgb) {
      postCompAdjustRGB();
    } else {
      compositeImages();
    }
  }
}
