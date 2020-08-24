/**
 * Handles zooming and panning of the canvas.
 */
class CanvasState {
  constructor(width, height, scale, padding) {
    this.width = width;
    this.height = height;

    // attributes for viewing the canvas.
    this.sx = 0;
    this.sy = 0;
    this.sWidth = width;
    this.sHeight = height;
    this.zoom = 100;
    this.zoomLimit = 100;

    // attributes for mouse on the canvas.
    this.isPressed = false;
    this.trace = [];

    // mouse coords
    // mouse position on canvas, no adjustment for padding
    this.rawX = 0;
    this.rawY = 0;
    // adjusted for padding
    this.canvasPosX = -1 * padding;
    this.canvasPosY = -1 * padding;
    // coordinates in original image (used for actions, labels, etc)
    this.imgX = null;
    this.imgY = null;
    // what imgX and imgY were upon most recent click
    this.storedClickX = null;
    this.storedClickY = null;

    this.label = 0;
    // store as part of object to be able to get current label
    this._segArray = null;

    this.scale = scale;

    this.topBorder = new Path2D();
    this.bottomBorder = new Path2D();
    this.rightBorder = new Path2D();
    this.leftBorder = new Path2D();

    this.isSpacedown = false;
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

  // clear the current trace
  clearTrace() {
    this.trace = [];
  }

  // check if the mouse position in canvas matches to a displayed part of image
  inRange() {
    return (
      this.canvasPosX >= 0 && this.canvasPosX < this.scaledWidth &&
      this.canvasPosY >= 0 && this.canvasPosY < this.scaledHeight
    );
  }

  updateCursorPosition(x, y, padding) {
    // store raw mouse position, in case of pan without mouse movement
    this.rawX = x;
    this.rawY = y;

    // convert to viewing pane position, to check whether to access label underneath
    this.canvasPosX = x - padding;
    this.canvasPosY = y - padding;

    // convert to image indices, to use for actions and getting label
    if (this.inRange()) {
      this.imgX = Math.floor((this.canvasPosX * 100 / (this.scale * this.zoom) + this.sx));
      this.imgY = Math.floor((this.canvasPosY * 100 / (this.scale * this.zoom) + this.sy));
      this.label = Math.abs(this._segArray[this.imgY][this.imgX]);
    } else {
      this.label = 0;
    }
  }

  setBorders(padding) {
    const scaledWidth = this.scaledWidth;
    const scaledHeight = this.scaledHeight;

    // create paths for recoloring borders
    this.topBorder = new Path2D();
    this.topBorder.moveTo(0, 0);
    this.topBorder.lineTo(padding, padding);
    this.topBorder.lineTo(scaledWidth + padding, padding);
    this.topBorder.lineTo(scaledWidth + 2 * padding, 0);
    this.topBorder.closePath();

    this.bottomBorder = new Path2D();
    this.bottomBorder.moveTo(0, scaledHeight + 2 * padding);
    this.bottomBorder.lineTo(padding, scaledHeight + padding);
    this.bottomBorder.lineTo(scaledWidth + padding, scaledHeight + padding);
    this.bottomBorder.lineTo(scaledWidth + 2 * padding, scaledHeight + 2 * padding);
    this.bottomBorder.closePath();

    this.leftBorder = new Path2D();
    this.leftBorder.moveTo(0, 0);
    this.leftBorder.lineTo(0, scaledHeight + 2 * padding);
    this.leftBorder.lineTo(padding, scaledHeight + padding);
    this.leftBorder.lineTo(padding, padding);
    this.leftBorder.closePath();

    this.rightBorder = new Path2D();
    this.rightBorder.moveTo(scaledWidth + 2 * padding, 0);
    this.rightBorder.lineTo(scaledWidth + padding, padding);
    this.rightBorder.lineTo(scaledWidth + padding, scaledHeight + padding);
    this.rightBorder.lineTo(scaledWidth + 2 * padding, scaledHeight + 2 * padding);
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

  drawImage(ctx, image, padding = 0) {
    ctx.clearRect(padding, padding, this.width, this.height);
    ctx.drawImage(
      image,
      this.sx, this.sy,
      this.sWidth, this.sHeight,
      padding, padding,
      this.scaledWidth,
      this.scaledHeight
    );
  }

  isCursorPressed() {
    return this.isPressed;
  }
}
