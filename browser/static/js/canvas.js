/**
 * Handles zooming and panning of the canvas.
 */
class CanvasState {
  constructor(width, height, scale, padding) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.padding = padding;

    // attributes for viewing the canvas.
    this.sx = 0;
    this.sy = 0;
    this.sWidth = width;
    this.sHeight = height;
    this.zoom = 100;
    this.zoomLimit = 100;

    // attributes for mouse on the canvas.
    this.onCanvas = false;
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
    this.topBorder = new Path2D();
    this.topBorder.moveTo(0, 0);
    this.topBorder.lineTo(this.padding, this.padding);
    this.topBorder.lineTo(scaledWidth + this.padding, this.padding);
    this.topBorder.lineTo(scaledWidth + 2 * this.padding, 0);
    this.topBorder.closePath();

    this.bottomBorder = new Path2D();
    this.bottomBorder.moveTo(0, scaledHeight + 2 * this.padding);
    this.bottomBorder.lineTo(this.padding, scaledHeight + this.padding);
    this.bottomBorder.lineTo(scaledWidth + this.padding, scaledHeight + this.padding);
    this.bottomBorder.lineTo(scaledWidth + 2 * this.padding, scaledHeight + 2 * this.padding);
    this.bottomBorder.closePath();

    this.leftBorder = new Path2D();
    this.leftBorder.moveTo(0, 0);
    this.leftBorder.lineTo(0, scaledHeight + 2 * this.padding);
    this.leftBorder.lineTo(this.padding, scaledHeight + this.padding);
    this.leftBorder.lineTo(this.padding, this.padding);
    this.leftBorder.closePath();

    this.rightBorder = new Path2D();
    this.rightBorder.moveTo(scaledWidth + 2 * this.padding, 0);
    this.rightBorder.lineTo(scaledWidth + this.padding, this.padding);
    this.rightBorder.lineTo(scaledWidth + this.padding, scaledHeight + this.padding);
    this.rightBorder.lineTo(scaledWidth + 2 * this.padding, scaledHeight + 2 * this.padding);
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

class Pan {
  // Implements command pattern for an undoable pan
  constructor(canvas, dx, dy) {
    this.canvas = canvas;

    // change in x position of scaled window
    // Don't move past right edge
    dx = Math.max(-dx, -canvas.sx); 
    // Don't move past left edge
    dx = Math.min(dx, canvas.width - canvas.sWidth - canvas.sx) 
    this.dx = dx;

    // change in y position of scaled window
    // Don't move past top edge
    dy = Math.max(-dy, -canvas.sy);
    // Don't move past bottom edge
    dy = Math.min(dy, canvas.height - canvas.sHeight - canvas.sy)
    this.dy = dy;  
  }

  pan(canvas, dx, dy) {
    canvas.sx = canvas.sx + dx;
    canvas.sy = canvas.sy + dy;
  }

  do() {
    this.pan(this.canvas, this.dx, this.dy);
  }

  redo() {
    this.pan(this.canvas, this.dx, this.dy);
  }

  undo() {
    this.pan(this.canvas, -this.dx, -this.dy);
  }
}

class Zoom {
  constructor(canvas, dZoom) {
    // Calculate how much canvas zooms
    const zoom = Math.max(canvas.zoom - 10 * dZoom, canvas.zoomLimit);

    // Calculate how canvas needs to pan after zooming
    const newHeight = canvas.height * 100 / zoom;
    const newWidth = canvas.width * 100 / zoom;
    const oldHeight = canvas.sHeight;
    const oldWidth = canvas.sWidth;
    const propX = canvas.canvasPosX / canvas.scaledWidth;
    const propY = canvas.canvasPosY / canvas.scaledHeight;
    let dx = propX * (newWidth - oldWidth);
    let dy = propY * (newHeight - oldHeight);

    this.canvas = canvas;
    this.oldZoom = canvas.zoom;
    this.newZoom = zoom;
    this.pan = new Pan(canvas, dx, dy);
  }

  do() {
    // Zoom then pan
    this.setZoom(this.newZoom);
    actions.addAction(this.pan);
  }

  redo() {
    this.setZoom(this.newZoom);
  }

  undo() {
    this.setZoom(this.oldZoom);
  }

  setZoom(zoom) {
    const newHeight = this.canvas.height * 100 / zoom;
    const newWidth = this.canvas.width * 100 / zoom;
    this.canvas.zoom = zoom;
    this.canvas.sHeight = newHeight;
    this.canvas.sWidth = newWidth;
  }
}

