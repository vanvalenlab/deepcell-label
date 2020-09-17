/**
 * Handles zooming and panning of the canvas.
 */
class CanvasState {
  constructor(width, height, scale, padding) {
    this.width = width;
    this.height = height;

    this.padding = padding;

    // attributes for viewing the canvas.
    this.sx = 0;
    this.sy = 0;
    this.sWidth = width;
    this.sHeight = height;
    this.zoom = 100;
    this.zoomLimit = 100;

    // attributes for mouse on the canvas.
    this.isPressed = false;
    this._trace = [];

    // mouse coords
    // mouse position on canvas, no adjustment for padding
    this.rawX = 0;
    this.rawY = 0;
    // adjusted for padding
    this.canvasPosX = -1 * this.padding;
    this.canvasPosY = -1 * this.padding;
    // coordinates in original image (used for actions, labels, etc)
    this.imgX = null;
    this.imgY = null;
    // what imgX and imgY were upon most recent click
    this.storedClickX = null;
    this.storedClickY = null;

    this.label = 0;
    // store as part of object to be able to get current label
    this._segArray = null;

    this._scale = scale;

    this.topBorder = new Path2D();
    this.bottomBorder = new Path2D();
    this.rightBorder = new Path2D();
    this.leftBorder = new Path2D();

    this.isSpacedown = false;
  }

  get scale() {
    return this._scale;
  }

  set scale(newScale) {
    // no need to reset zoom, etc if scale has not actually changed
    if (this.scale !== newScale) {
      this._scale = newScale;
      this.zoom = 100;

      // set viewing coords back to show full image
      this.sx = 0;
      this.sy = 0;
      this.sWidth = this.width;
      this.sHeight = this.height;
      this.setBorders();
    }
  }

  get segArray() {
    return this._segArray;
  }

  set segArray(newSegArray) {
    this._segArray = newSegArray;
    if (this.inRange()) {
      this.label = Math.abs(this._segArray[this.imgY][this.imgX]);
    } else {
      this.label = 0;
    }
  }

  get scaledWidth() {
    return this.scale * this.width;
  }

  get scaledHeight() {
    return this.scale * this.height;
  }

  get paddedWidth() {
    return this.scaledWidth + 2 * this.padding;
  }

  get paddedHeight() {
    return this.scaledHeight + 2 * this.padding;
  }

  /**
  * Creates 2D path for clipping to prevent other object methods (eg, the brush)
  * from drawing in blank padding regions.
  */
  get visibleRegion() {
    const region = new Path2D();
    region.rect(this.padding, this.padding, this.scaledWidth, this.scaledHeight);
    return region;
  }

  // only time trace needs to be accessed externally
  // is to be passed to caliban.py in JSON format
  get trace() {
    return JSON.stringify(this._trace);
  }

  // clear the current trace
  clearTrace() {
    this._trace = [];
  }

  addToTrace() {
    this._trace.push([this.imgY, this.imgX]);
  }

  // check if the mouse position in canvas matches to a displayed part of image
  inRange() {
    return (
      this.canvasPosX >= 0 && this.canvasPosX < this.scaledWidth &&
      this.canvasPosY >= 0 && this.canvasPosY < this.scaledHeight
    );
  }

  updateCursorPosition(x, y) {
    // store raw mouse position, in case of pan without mouse movement
    this.rawX = x;
    this.rawY = y;

    // convert to viewing pane position, to check whether to access label underneath
    this.canvasPosX = x - this.padding;
    this.canvasPosY = y - this.padding;

    // convert to image indices, to use for actions and getting label
    if (this.inRange()) {
      this.imgX = Math.floor((this.canvasPosX * 100 / (this.scale * this.zoom) + this.sx));
      this.imgY = Math.floor((this.canvasPosY * 100 / (this.scale * this.zoom) + this.sy));
      this.label = Math.abs(this._segArray[this.imgY][this.imgX]);
    } else {
      this.label = 0;
    }
  }

  setBorders() {
    const scaledWidth = this.scaledWidth;
    const scaledHeight = this.scaledHeight;

    // create paths for recoloring borders
    // TODO: would it be more intuitive to move the line to this.paddedWidth - this.padding
    // instead of scaledWidth + this.padding? same value but maybe it'll make the path
    // a little more clear
    this.topBorder = new Path2D();
    this.topBorder.moveTo(0, 0);
    this.topBorder.lineTo(this.padding, this.padding);
    this.topBorder.lineTo(scaledWidth + this.padding, this.padding);
    this.topBorder.lineTo(this.paddedWidth, 0);
    this.topBorder.closePath();

    this.bottomBorder = new Path2D();
    this.bottomBorder.moveTo(0, this.paddedHeight);
    this.bottomBorder.lineTo(this.padding, scaledHeight + this.padding);
    this.bottomBorder.lineTo(scaledWidth + this.padding, scaledHeight + this.padding);
    this.bottomBorder.lineTo(this.paddedWidth, this.paddedHeight);
    this.bottomBorder.closePath();

    this.leftBorder = new Path2D();
    this.leftBorder.moveTo(0, 0);
    this.leftBorder.lineTo(0, this.paddedHeight);
    this.leftBorder.lineTo(this.padding, scaledHeight + this.padding);
    this.leftBorder.lineTo(this.padding, this.padding);
    this.leftBorder.closePath();

    this.rightBorder = new Path2D();
    this.rightBorder.moveTo(this.paddedWidth, 0);
    this.rightBorder.lineTo(scaledWidth + this.padding, this.padding);
    this.rightBorder.lineTo(scaledWidth + this.padding, scaledHeight + this.padding);
    this.rightBorder.lineTo(this.paddedWidth, this.paddedHeight);
    this.rightBorder.closePath();
  }

  drawBorders(ctx) {
    ctx.save();
    // left border
    ctx.fillStyle = (Math.floor(this.sx) === 0) ? 'white' : 'black';
    ctx.fill(this.leftBorder);

    // right border
    ctx.fillStyle = (Math.ceil(this.sx + this.sWidth) === this.width) ? 'white' : 'black';
    ctx.fill(this.rightBorder);

    // top border
    ctx.fillStyle = (Math.floor(this.sy) === 0) ? 'white' : 'black';
    ctx.fill(this.topBorder);

    // bottom border
    ctx.fillStyle = (Math.ceil(this.sy + this.sHeight) === this.height) ? 'white' : 'black';
    ctx.fill(this.bottomBorder);

    ctx.restore();
  }

  pan(dx, dy) {
    let tempPanX = this.sx - dx;
    let tempPanY = this.sy - dy;

    // stop panning if at the edge of image (x)
    if (tempPanX >= 0 && tempPanX + this.sWidth < this.width) {
      this.sx = tempPanX;
    } else {
      tempPanX = Math.max(0, tempPanX);
      this.sx = Math.min(this.width - this.sWidth, tempPanX);
    }

    // stop panning if at the edge of image (y)
    if (tempPanY >= 0 && tempPanY + this.sHeight < this.height) {
      this.sy = tempPanY;
    } else {
      tempPanY = Math.max(0, tempPanY);
      this.sy = Math.min(this.height - this.sHeight, tempPanY);
    }
  }

  changeZoom(dZoom, canvasPosX, canvasPosY) {
    const newZoom = this.zoom - 10 * dZoom;
    const oldZoom = this.zoom;
    const newHeight = this.height * 100 / newZoom;
    const newWidth = this.width * 100 / newZoom;

    // store sWidth and sHeight to compare against for panning
    const oldHeight = this.sHeight;
    const oldWidth = this.sWidth;

    if (newZoom >= this.zoomLimit) {
      this.zoom = newZoom;
      this.sHeight = newHeight;
      this.sWidth = newWidth;
    }
    if (oldZoom !== newZoom) {
      const propX = canvasPosX / this.scaledWidth;
      const propY = canvasPosY / this.scaledHeight;
      const dx = propX * (newWidth - oldWidth);
      const dy = propY * (newHeight - oldHeight);
      this.pan(dx, dy);
    }
  }

  drawImage(ctx, image) {
    ctx.clearRect(this.padding, this.padding, this.width, this.height);
    ctx.drawImage(
      image,
      this.sx, this.sy,
      this.sWidth, this.sHeight,
      this.padding, this.padding,
      this.scaledWidth,
      this.scaledHeight
    );
  }

  isCursorPressed() {
    return this.isPressed;
  }
}
