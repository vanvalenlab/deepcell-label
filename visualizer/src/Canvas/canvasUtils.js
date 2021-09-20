/** Helper functions to manipulate ImageData. */

export function createImageData(typedArray, width, height) {
  const max = Math.max.apply(null, typedArray);
  const rescaled = Uint8ClampedArray.from(typedArray.map(i => (i / max) * 255));
  const data = new Uint8ClampedArray(typedArray.length * 4);
  for (let i = 0; i < rescaled.length; i++) {
    data[4 * i] = rescaled[i];
    data[4 * i + 1] = rescaled[i];
    data[4 * i + 2] = rescaled[i];
    data[4 * i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

export function createSegmentationImageData(typedArray, colormap, width, height) {
  const data = new Uint8ClampedArray(typedArray.length * 4);
  for (let i = 0; i < typedArray.length; i++) {
    const label = typedArray[i];
    const color = colormap[label];
    data[4 * i] = color[0];
    data[4 * i + 1] = color[1];
    data[4 * i + 2] = color[2];
    data[4 * i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

/**
 * Highlights a label with color.
 * @param {ImageData} imageData where we draw the highlight
 * @param {Array} labeledArray describes label at each pixel; has negative label values on label border
 * @param {int} label label to highlight
 * @param {Array} color color to highlight label with
 */
export function highlightImageData(imageData, labeledArray, label, color) {
  if (label === 0) {
    return;
  }
  const [r, g, b, a] = color;
  const { data, width, height } = imageData;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const element = Math.abs(labeledArray[j][i]);
      if (element === label) {
        data[(j * width + i) * 4 + 0] = r;
        data[(j * width + i) * 4 + 1] = g;
        data[(j * width + i) * 4 + 2] = b;
        data[(j * width + i) * 4 + 3] = a;
      }
    }
  }
}

/**
 * Changes the opacity of the image.
 * @param {ImageData} imageData
 * @param {float} opacity between 0 and 1; 0 makes the image transparent, and 1 does nothing
 */
export function opacityImageData(imageData, opacity) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] *= opacity;
  }
}

/**
 * Draws fColor around the foreground label and bColor
 * @param {ImageData} imageData where to draw outlines
 * @param {Array} labeledArray describes the label at each pixel; has negative values on the label borders
 * @param {int} foreground value of foreground label
 * @param {int} background value of background label
 * @param {Array} fColor RGBA color
 * @param {Array} bColor RGBA color
 */
export function outlineSelected(imageData, labeledArray, foreground, background, fColor, bColor) {
  const [fr, fg, fb, fa] = fColor;
  const [br, bg, bb, ba] = bColor;
  const { data, width, height } = imageData;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const label = labeledArray[j][i];
      if (foreground !== 0 && label === -1 * foreground) {
        data[(j * width + i) * 4 + 0] = fr;
        data[(j * width + i) * 4 + 1] = fg;
        data[(j * width + i) * 4 + 2] = fb;
        data[(j * width + i) * 4 + 3] = fa;
      } else if (background !== 0 && label === -1 * background) {
        data[(j * width + i) * 4 + 0] = br;
        data[(j * width + i) * 4 + 1] = bg;
        data[(j * width + i) * 4 + 2] = bb;
        data[(j * width + i) * 4 + 3] = ba;
      }
    }
  }
}

/**
 * Draws color outlines around all labels in labeledArray.
 * @param {ImageData} imageData where to draw outlines
 * @param {Array} labeledArray describes the label at each pixel; has negative values on the label borders
 * @param {Array} color RGBA color
 * @returns
 */
export function outlineAll(imageData, labeledArray, color) {
  const { data, width, height } = imageData;
  const [r, g, b, a] = color;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const label = labeledArray[j][i];
      if (label < 0) {
        data[(j * width + i) * 4 + 0] = r;
        data[(j * width + i) * 4 + 1] = g;
        data[(j * width + i) * 4 + 2] = b;
        data[(j * width + i) * 4 + 3] = a;
      }
    }
  }
}

// contrast between 0 and 1
export function contrastImageData(imageData, contrast) {
  const { data } = imageData;
  contrast *= 255; // scale fraction to full range of pixel values
  const factor = (255 + contrast) / (255.01 - contrast); // add .1 to avoid /0 error
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128;
    data[i + 1] = factor * (data[i + 1] - 128) + 128;
    data[i + 2] = factor * (data[i + 2] - 128) + 128;
  }
}

// brightness between -1 and 1
export function brightnessImageData(imageData, brightness) {
  const { data } = imageData;
  brightness *= 255; // scale fraction to full range of pixel values
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] + brightness;
    data[i + 1] = data[i + 1] + brightness;
    data[i + 2] = data[i + 2] + brightness;
  }
}

export function adjustRangeImageData(imageData, min, max) {
  const { data } = imageData;
  const diff = max - min;
  const scale = diff === 0 ? 255 : 255 / diff;

  for (let i = 0; i < data.length; i += 4) {
    //pixel values in 4-byte blocks (r,g,b,a)
    data[i] = (data[i] - min) * scale; //r value
    data[i + 1] = (data[i + 1] - min) * scale; //g value
    data[i + 2] = (data[i + 2] - min) * scale; //b value
  }
}

export function recolorImageData(imageData, color) {
  const { data } = imageData;
  const [red, green, blue] = color;
  for (let i = 0; i < data.length; i += 4) {
    data[i] *= red / 255;
    data[i + 1] *= green / 255;
    data[i + 2] *= blue / 255;
  }
  return data;
}

export function invertImageData(imageData) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    //pixel values in 4-byte blocks (r,g,b,a)
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

/**
 * Draws a a solid outline circle of radius brushSize on the context at (x, y).
 * @param {*} ctx
 * @param {*} x
 * @param {*} y
 * @param {*} brushSize
 * @param {*} brushColor
 */
export function drawBrush(ctx, x, y, brushSize, brushColor) {
  const [r, g, b, a] = brushColor;
  const [sx, sy, sw, sh] = [
    x - brushSize + 1,
    y - brushSize + 1,
    2 * brushSize - 1,
    2 * brushSize - 1,
  ];
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const { data, height, width } = imageData;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      if (onBrush(i, j, brushSize)) {
        data[(j * width + i) * 4 + 0] = r;
        data[(j * width + i) * 4 + 1] = g;
        data[(j * width + i) * 4 + 2] = b;
        data[(j * width + i) * 4 + 3] = a;
      }
    }
  }
  ctx.putImageData(imageData, sx, sy);
}

/**
 * Draws a translucent, filled-in circle of radius brushSize on the context at (x, y).
 * @param {*} ctx
 * @param {*} x
 * @param {*} y
 * @param {*} brushSize
 */
export function drawTrace(ctx, x, y, brushSize) {
  const [sx, sy, sw, sh] = [
    x - brushSize + 1,
    y - brushSize + 1,
    2 * brushSize - 1,
    2 * brushSize - 1,
  ];
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const { data, height, width } = imageData;
  const radius = brushSize - 1;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      if (insideBrush(i, j, brushSize)) {
        data[(j * width + i) * 4 + 0] = 255;
        data[(j * width + i) * 4 + 1] = 255;
        data[(j * width + i) * 4 + 2] = 255;
        data[(j * width + i) * 4 + 3] = 255 / 2;
      }
    }
  }
  ctx.putImageData(imageData, sx, sy);
}

/**
 * Draws a bounding box between the two points.
 * Has an opaque outline and a translucent interior.
 * @param {*} ctx
 * @param {*} x1
 * @param {*} y1
 * @param {*} x2
 * @param {*} y2
 */
export function drawBox(ctx, x1, y1, x2, y2) {
  const [sx, sy] = [Math.min(x1, x2), Math.min(y1, y2)];
  const [sw, sh] = [Math.abs(x1 - x2) + 1, Math.abs(y1 - y2) + 1];
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const { data, height, width } = imageData;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      data[(j * width + i) * 4 + 0] = 255;
      data[(j * width + i) * 4 + 1] = 255;
      data[(j * width + i) * 4 + 2] = 255;
      if (j === 0 || j === height - 1 || i === 0 || i === width - 1) {
        // solid outline
        data[(j * width + i) * 4 + 3] = 255;
      } else {
        // translucent interior
        data[(j * width + i) * 4 + 3] = 128;
      }
    }
  }
  ctx.putImageData(imageData, sx, sy);
}

// Internal helper functions

/**
 * Returns the distance of (x, y) to the origin (0, 0).
 * @param {Number} x
 * @param {Number} y
 * @returns {Number} distance to origin
 */
function distance(x, y) {
  return Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2));
}

/**
 * Returns whether the pixel at (x, y) of the brush bounding box is on the brush border.
 * @param {*} x
 * @param {*} y
 * @param {*} brushSize
 * @returns {boolean}
 */
function onBrush(x, y, brushSize) {
  const radius = brushSize - 1;
  return (
    Math.floor(distance(x - radius, y - radius)) === radius &&
    // not on border if next to border in both directions
    !(
      Math.floor(distance(Math.abs(x - radius) + 1, y - radius)) === radius &&
      Math.floor(distance(x - radius, Math.abs(y - radius) + 1)) === radius
    )
  );
}

/**
 * Returns whether the pixel at (x, y) of the brush bounding box is inside the brush.
 * @param {*} x
 * @param {*} y
 * @param {*} brushSize
 * @returns
 */
function insideBrush(x, y, brushSize) {
  const radius = brushSize - 1;
  return Math.floor(distance(x - radius, y - radius)) <= radius;
}
