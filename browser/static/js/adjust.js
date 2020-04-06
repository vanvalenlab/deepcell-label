// helper functions

// modify image data in place to recolor
function recolorScaled(data, scale, i, j, jlen, r=255, g=255, b=255) {
  // fill in all pixels affected by scale
  // k and l get the pixels that are part of the original pixel that has been scaled up
  for (var k = 0; k < scale; k +=1) {
    for (var l = 0; l < scale; l +=1) {
      // location in 1D array based on i,j, and scale
      pixel_num = (scale*(jlen*(scale*j + l) + i)) + k;
      // set to color by changing RGB values
      // data is clamped 8bit type, so +255 sets to 255, -255 sets to 0
      data[(pixel_num*4)] += r;
      data[(pixel_num*4) + 1] += g;
      data[(pixel_num*4) + 2] += b;
    }
  }
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

function highlight(img, label) {
  let ann = img.data;

  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;

      if (Math.abs(seg_array[j][i]) === label) {
        if (rgb && !display_labels) {
          // add translucent effect
          recolorScaled(ann, scale, i, j, jlen, r=60, g=60, b=60);
        } else {
          // change color to red
          recolorScaled(ann, scale, i, j, jlen, r=255, g=-255, b=-255);
        }
      }
    }
  }
}

// the only change we make to labels before compositing with raw
// is recoloring the label to solid red for highlighting
function preCompositeLabelMod(img, h1, h2) {
  let ann = img.data;
  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;
      let currentVal = Math.abs(seg_array[j][i]);
      if (currentVal === h1 || currentVal === h2) {
        recolorScaled(ann, scale, i, j, jlen, r=255, g=-255, b=-255);
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
        recolorScaled(ann, scale, i, j, jlen, r=255, g=-255, b=-255);
        continue;
      // outline white single
      } else if (singleOutline && currentVal === -o1) {
        recolorScaled(ann, scale, i, j, jlen, r=255, g=255, b=255);
        continue;
      // outline all remaining edges with white
      } else if (outlineAll && currentVal < 0) {
        recolorScaled(ann, scale, i, j, jlen, r=255, g=255, b=255);
        continue;
      // translucent highlight
      } else if (translucent &&
            (Math.abs(currentVal) === t1 || Math.abs(currentVal) === t2)) {
        recolorScaled(ann, scale, i, j, jlen, r=60, g=60, b=60);
        continue;
      }
    }
  }
}


// apply highlight to edit_value in seg_image, save resulting
// image as src of adjusted_seg to use to render edit (if needed)
// additional hidden canvas is used to prevent image flickering
function update_seg_highlight() {
  let canvas = document.getElementById('hidden_seg_canvas');
  let ctx = $('#hidden_seg_canvas').get(0).getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // draw seg_image so we can extract image data
  ctx.clearRect(0, 0, dimensions[0], dimensions[1]);
  ctx.drawImage(seg_image, 0, 0, dimensions[0], dimensions[1]);
  let seg_img_data = ctx.getImageData(0, 0, dimensions[0], dimensions[1]);
  highlight(seg_img_data, brush.value);
  ctx.putImageData(seg_img_data, 0, 0);
  // once this new src is loaded, displayed image will be rerendered
  adjusted_seg.src = canvas.toDataURL();
}
