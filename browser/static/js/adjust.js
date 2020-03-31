// helper functions
function recolorScaled(data, scale, i, j, jlen, r=255, g=255, b=255) {
  // fill in all pixels affected by scale
  // k and l get the pixels that are part of the original pixel that has been scaled up
  for (var k = 0; k < scale; k +=1) {
    for (var l = 0; l < scale; l +=1) {
      // location in 1D array based on i,j, and scale
      pixel_num = (scale*(jlen*(scale*j + l) + i)) + k;
      // set to color by changing RGB values
      data[(pixel_num*4)] = r;
      data[(pixel_num*4) + 1] = g;
      data[(pixel_num*4) + 2] = b;
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

      if (Math.abs(seg_array[j][i]) === label){
        // fill in all pixels affected by scale
        // k and l get the pixels that are part of the original pixel that has been scaled up
        if (rgb && !display_labels) {
          for (var k = 0; k < scale; k +=1) {
            for (var l = 0; l < scale; l +=1) {
              // location in 1D array based on i,j, and scale
              pixel_num = (scale*(jlen*(scale*j + l) + i)) + k;
              // set to white by changing RGB values
              ann[(pixel_num*4)] += 60;
              ann[(pixel_num*4) + 1] += 60;
              ann[(pixel_num*4) + 2] += 60;
            }
          }
        }
        else {
          recolorScaled(ann, scale, i, j, jlen, r=255, g=0, b=0);
        }
      }
    }
  }
}

function outline(img) {
  let ann = img.data;
  // use label array to figure out which pixels to recolor
  for (var j = 0; j < seg_array.length; j += 1){ //y
    for (var i = 0; i < seg_array[j].length; i += 1){ //x
      let jlen = seg_array[j].length;
      // outline conv brush target in red
      if (edit_mode && brush.conv && brush.target !== -1
        && seg_array[j][i] === -brush.target) {
        recolorScaled(ann, scale, i, j, jlen, r=255, g=0, b=0);
      // all other outlines are white
      } else if (seg_array[j][i] < 0) {
        recolorScaled(ann, scale, i, j, jlen, r=255, g=255, b=255);
      }
    }
  }
}

function outline_all(ctx) {
  // to outline all edges:
  let composite = ctx.getImageData(padding, padding, dimensions[0], dimensions[1]);
  outline(composite);
  ctx.putImageData(composite, padding, padding);
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

