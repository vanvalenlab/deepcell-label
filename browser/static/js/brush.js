class Brush {
  constructor(height, width, pad) {
    // center of brush (scaled)
    this.x = 0;
    this.y = 0;
    // size of brush in pixels
    this._size = 5;

    // status of eraser
    this._erase = false;

    // normal brush attributes
    this._regTarget = 0;
    this._regValue = 1;

    // conversion brush attributes
    this._convTarget = -1;
    this._convValue = -1;

    // status of conversion brush mode
    this._conv = false;

    // threshold/box attributes
    this.show = true; // showing brush shape
    // -2*pad will always be out of range for annotators
    // anchored corner of bounding box
    this._threshX = -2 * pad;
    this._threshY = -2 * pad;
    this._showBox = false;

    // how to draw brush/box shadow
    this._outlineColor = 'white';
    // opacity only applies to interior
    this._fillColor = 'white';
    this._opacity = 0.3;

    // attributes needed to match visible canvas
    this._height = height;
    this._width = width;
    this._padding = pad;

    // create hidden canvas to store brush preview
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'brushCanvas';
    // this canvas should never be seen
    this.canvas.style.display = 'none';
    this.canvas.height = height;
    this.canvas.width = width;
    document.body.appendChild(this.canvas);
    this.ctx = document.getElementById('brushCanvas').getContext('2d');
    // set fillStyle here, it will never change
    this.ctx.fillStyle = this._fillColor;
  }

  get size() {
    return this._size;
  }

  // set bounds on size of brush, update brushview appropriately
  set size(newSize) {
    // don't need brush to take up whole frame
    if (newSize > 0 && newSize < this._height / 2 &&
        newSize < this._width / 2 && newSize !== this._size) {
      // size is size in pixels, used to modify source array
      this._size = newSize;
      // update brush preview with new size
      this.refreshView();
    }
  }

  get erase() {
    return this._erase;
  }

  set erase(bool) {
    // eraser is either true or false
    if (typeof bool === 'boolean') {
      this._erase = bool;
      // red outline is visual indicator for eraser being on
      if (this._erase) {
        this._outlineColor = 'red';
      // white outline if eraser is off (drawing normally)
      } else {
        this._outlineColor = 'white';
      }
    }
  }

  // target = value of array that backend will overwrite
  get target() {
    if (this._conv) {
      return this._convTarget;
    } else {
      // always 0
      return this._regTarget;
    }
  }

  // only conversion brush target can change
  set target(val) {
    // never set conversion brush to modify background
    if (this._conv && val !== 0) {
      this._convTarget = val;
    }
  }

  // value = label that gets added to annotation array in backend
  get value() {
    if (this._conv) {
      return this._convValue;
    } else {
      return this._regValue;
    }
  }

  // can change brush's normal value or conversion brush value
  set value(val) {
    // never set conversion brush to modify background
    // logic for val != target is elsewhere to prevent
    // value picking from finishing early
    if (this._conv && val !== 0) {
      this._convValue = val;
    // regular brush never has value less than 1
    } else if (!this._conv) {
      this._regValue = Math.max(val, 1);
    }
  }

  // whether or not conversion brush is on
  get conv() {
    return this._conv;
  }

  set conv(bool) {
    this._conv = bool;
    // if turning off conv brush, reset conv values
    if (!bool) {
      this._convValue = -1;
      this._convTarget = -1;
    }
    // if conv brush is on, temporarily disable eraser, even if erase is true
    if (this._erase && !this._conv) {
      this._outlineColor = 'red';
    } else {
      this._outlineColor = 'white';
    }
  }

  get threshX() {
    return this._threshX;
  }

  set threshX(x) {
    // clearing anchor corner
    if (x === -2 * this._padding) {
      this._threshX = x;
      this._showBox = false;
      this.clearView();
    // setting anchor corner
    } else {
      this._threshX = x;
      this._showBox = true;
      this.boxView();
    }
  }

  get threshY() {
    return this._threshY;
  }

  set threshY(y) {
    // clearing anchor corner
    if (y === -2 * this._padding) {
      this._threshY = y;
      this._showBox = false;
      this.clearView();
    // setting anchor corner
    } else {
      this._threshY = y;
      this._showBox = true;
      this.boxView();
    }
  }

  // reset thresholding box anchor corner
  clearThresh() {
    this.threshX = -2 * this._padding;
    this.threshY = -2 * this._padding;
    // restore normal brush view
    this.show = true;
    this.addToView();
  }

  // clear ctx
  clearView() {
    this.ctx.clearRect(0, 0, this._width, this._height);
  }

  // adds brush shadow to ctx
  addToView() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, true);
    this.ctx.closePath();
    // no opacity needed; just shows where brush has been
    this.ctx.fill();
  }

  // clear previous view and update with current view
  refreshView() {
    this.clearView();
    this.addToView();
  }

  // display bounding box for thresholding
  boxView() {
    // clear previous box shape
    this.clearView();
    // only if actively drawing box (anchor corner set)
    if (this._showBox) {
      // interior of box; will be added to visible canvas with opacity
      this.ctx.fillRect(
        this.threshX, this.threshY,
        this.x - this.threshX,
        this.y - this.threshY);
    }
  }

  // draw brush preview onto destination ctx
  draw(ctxDst, viewer) {
    // get attributes from viewer object
    const sx = viewer.sx;
    const sy = viewer.sy;
    const swidth = viewer.sWidth;
    const sheight = viewer.sHeight;
    const mag = viewer.scale * viewer.zoom / 100;

    // draw translucent brush trace
    ctxDst.save();
    ctxDst.globalAlpha = this._opacity;
    ctxDst.globalCompositeOperation = 'source-over';
    const ctxDstHeight = ctxDst.canvas.height;
    const ctxDstWidth = ctxDst.canvas.width;
    ctxDst.drawImage(
      this.canvas, sx, sy, swidth, sheight,
      this._padding, this._padding,
      ctxDstWidth - 2 * this._padding,
      ctxDstHeight - 2 * this._padding);
    ctxDst.restore();

    // add solid outline around current brush location
    if (this.show) {
      ctxDst.beginPath();
      const cX = (this.x - sx) * mag + this._padding;
      const cY = (this.y - sy) * mag + this._padding;
      ctxDst.arc(cX, cY, mag * this.size, 0, Math.PI * 2, true);
      ctxDst.strokeStyle = this._outlineColor; // either red or white
      ctxDst.closePath();
      ctxDst.stroke();
    } else if (this._showBox) {
      // draw box around threshold area
      ctxDst.strokeStyle = 'white';
      const boxStartX = (this.threshX - sx) * mag + this._padding;
      const boxStartY = (this.threshY - sy) * mag + this._padding;
      const boxWidth = (this.x - this.threshX) * mag;
      const boxHeight = (this.y - this.threshY) * mag;
      ctxDst.strokeRect(boxStartX, boxStartY, boxWidth, boxHeight);
    }
  }
}
