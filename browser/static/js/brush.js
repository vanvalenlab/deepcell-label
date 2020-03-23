class Brush {
  constructor(scale, height, width, pad) {
    // center of brush (scaled)
    this.x = 0;
    this.y = 0;
    // size of brush in pixels
    this._size = 1;
    // scale of image (and therefore brush preview)
    this.scale = scale;
    // displayed size of brush
    this.radius = this._size * this.scale;
    // status of eraser
    this._erase = false;

    // threshold/box attributes
    this.show = true;
    this._threshX = -2*pad;
    this._threshY = -2*pad;
    this._showBox = false;

    this._fillColor = 'white';
    this._outlineColor = 'white';
    this._opacity = 0.2;

    this._height = height;
    this._width = width;
    this._padding = pad;

    // create hidden canvas to store brush preview
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'brushCanvas';
    this.canvas.style.display = 'none';
    this.canvas.height = height;
    this.canvas.width = width;
    document.body.appendChild(this.canvas);
    this.ctx = $('#brushCanvas').get(0).getContext("2d");
    this.ctx.fillStyle = this._fillColor;
  }

  get size() {
    return this._size;
  }

  // set bounds on size of brush, update radius and brushview appropriately
  set size(newSize) {
    if (newSize > 0 && newSize < this._height/(2*this.scale)
        && newSize < this._width/(2*this.scale) && newSize !== this._size) {
      this._size = newSize;
      this.radius = this._size * this.scale;
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

  get threshX() {
    return this._threshX;
  }

  set threshX(x) {
    if (x === -2*this._padding) {
      this._threshX = x;
      this._showBox = false;
      this.clearView();
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
    if (y === -2*this._padding) {
      this._threshY = y;
      this._showBox = false;
      this.clearView();
    } else {
      this._threshY = y;
      this._showBox = true;
      this.boxView();
    }
  }

  clearThresh() {
    this.threshX = -2*this._padding;
    this.threshY = -2*this._padding;
    this.show = true;
    this.addToView();
  }

  // clear ctx
  clearView() {
    this.ctx.clearRect(0,0,this._width,this._height);
  }

  // adds brush shadow to ctx
  addToView() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // clear previous view and update with current view
  refreshView() {
    this.clearView();
    this.addToView();
  }

  boxView() {
    this.clearView();
    if (this._showBox) {
      this.ctx.fillRect(this.threshX, this.threshY,
        this.x-this.threshX, this.y-this.threshY);
    }
  }

  // draw brush preview onto destination ctx
  draw(ctxDst) {
    // save here so we can revert clipped region after drawing
    ctxDst.save();

    // clip region to displayed image to prevent drawing brush onto
    // empty canvas padding region
    let region = new Path2D();
    region.rect(this._padding, this._padding, this._width, this._height);
    ctxDst.clip(region);

    // draw translucent brush trace
    ctxDst.save();
    ctxDst.globalAlpha = this._opacity;
    ctxDst.globalCompositeOperation = 'source-over';
    ctxDst.drawImage(this.canvas, this._padding, this._padding, this._width, this._height);
    ctxDst.restore();

    // add solid outline around current brush location
    if (this.show) {
      ctxDst.beginPath();
      ctxDst.arc(this.x + this._padding, this.y + this._padding, this.radius, 0, Math.PI * 2, true);
      ctxDst.strokeStyle = this._outlineColor;
      ctxDst.closePath();
      ctxDst.stroke();
    }  else if (this._showBox) {
      // draw box around threshold area
      ctxDst.strokeStyle = 'white';
      ctxDst.strokeRect(this.threshX + this._padding, this.threshY + this._padding,
        this.x-this.threshX, this.y-this.threshY);
    }

    // restore unclipped canvas context
    ctxDst.restore();
  }

}
