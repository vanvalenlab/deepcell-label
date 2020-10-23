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

class Pan {
  // Implements command pattern for an undoable pan
  constructor(canvas, dx, dy) {
    this.canvas = canvas;
    // change in x position of scaled window
    this.dx = Math.min(Math.max(-dx, -canvas.sx), // move to right edge 
      canvas.width - canvas.sWidth - canvas.sx) // move to left edge
    // change in y position of scaled window
    this.dy = Math.min(Math.max(-dy, -canvas.sy), // move to top edge 
      canvas.height - canvas.sHeight - canvas.sy) // move to bottom edge
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
    this.canvas = canvas;
    this.dZoom = dZoom;
    this.posX = canvas.canvasPosX;
    this.posY = canvas.canvasPosY;
  }

  changeZoom(canvas, dZoom, posX, posY) {
    const newZoom = Math.max(canvas.zoom - 10 * dZoom, canvas.zoomLimit);
    const oldZoom = canvas.zoom;
    const newHeight = canvas.height * 100 / newZoom;
    const newWidth = canvas.width * 100 / newZoom;

    // store sWidth and sHeight to compare against for panning
    const oldHeight = canvas.sHeight;
    const oldWidth = canvas.sWidth;

    if (oldZoom !== newZoom) {
      canvas.zoom = newZoom;
      canvas.sHeight = newHeight;
      canvas.sWidth = newWidth;
      const propX = posX / canvas.scaledWidth;
      const propY = posY / canvas.scaledHeight;
      // change in x position of scaled window
      const dx = Math.min(Math.max(propX * (oldWidth - newWidth), // no edges
          -canvas.sx), // move to right edge 
        canvas.width - canvas.sWidth - canvas.sx) // move to left edge
      // change in y position of scaled window
      const dy = Math.min(Math.max(propY * (oldHeight - newHeight), // no edges
          -canvas.sy), // move to top edge 
        canvas.height - canvas.sHeight - canvas.sy) // move to bottom edge
      this.canvas.sx = this.canvas.sx + dx;
      this.canvas.sy = this.canvas.sy + dy;
    }
  }

  do() {
    this.changeZoom(this.canvas, this.dZoom, this.posX, this.posY);
  }

  redo() {
    this.changeZoom(this.canvas, this.dZoom, this.posX, this.posY);
  }

  undo() {
    this.changeZoom(this.canvas, -this.dZoom, this.posX, this.posY);
  }
}

