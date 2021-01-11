/**
 * Handles zooming and panning of the canvas
 * and the position of the cursor on the canvas.
 */
class CanvasPosition {
  constructor(model) {
    this.model = model;

    this.width = model.width;
    this.height = model.height;
    this.scale = model.scale;
    this.padding = model.padding;

    // canvas position
    this._sx = 0;
    this._sy = 0;
    this.sWidth = model.width;
    this.sHeight = model.height;
    this._zoom = 100;
    this.zoomLimit = 100;

    // cursor position
    // position on canvas, no adjustment for padding
    this.rawX = 0;
    this.rawY = 0;
    // adjusted for padding
    this.canvasPosX = -1 * model.padding;
    this.canvasPosY = -1 * model.padding;
    // coordinates in original image (used for actions, labels, etc)
    this.imgX = null;
    this.imgY = null;
    // what imgX and imgY were upon most recent click
    this.storedClickX = null;
    this.storedClickY = null;
    // label under the cursor
    this.label = 0;
    // Records cursor history for painting
    this._trace = [];
  }

  get sx() {
    return this._sx;
  }

  set sx(newSx) {
    // don't move past right edge
    newSx = Math.min(newSx, this.width - this.sWidth);
    // don't move past left edge
    newSx = Math.max(newSx, 0);
    this._sx = newSx;
  }

  get sy() {
    return this._sy;
  }

  set sy(newSy) {
    // don't move past bottom edge
    newSy = Math.min(newSy, this.height - this.sHeight);
    // don't move past top edge
    newSy = Math.max(0, newSy);
    this._sy = newSy;
  }

  get scaledWidth() {
    return this.scale * this.width;
  }

  get scaledHeight() {
    return this.scale * this.height;
  }

  get segArray() {
    return this.model.segArray;
  }

  get trace() {
    return JSON.stringify(this._trace);
  }

  clearTrace() {
    this._trace = [];
  }

  addToTrace() {
    this._trace.push([this.imgY, this.imgX]);
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
    }
    this.updateLabel();
  }

  updateLabel() {
    if (this.inRange()) {
      this.label = Math.abs(this.segArray[this.imgY][this.imgX]);
    } else {
      this.label = 0;
    }
  }

  // check if the mouse position in canvas matches to a displayed part of image
  inRange() {
    return (
      this.model.onCanvas &&
      this.canvasPosX >= 0 && this.canvasPosX < this.scaledWidth &&
      this.canvasPosY >= 0 && this.canvasPosY < this.scaledHeight
    );
  }

  /**
   * Zooms in to  around a point (x, y).
   * @param {int} zoom level to set zoom to
   * @param {int} x x coordinate of point to zoom around
   * @param {int} y y coordinate of point to zoom around
   */
  setZoom(zoom, x = this.canvasPosX, y = this.canvasPosY) {
    // Calculate how much canvas zooms
    const newZoom = Math.max(zoom, this.zoomLimit);
    // Calculate how canvas needs to pan after zooming
    const newHeight = this.height * 100 / newZoom;
    const newWidth = this.width * 100 / newZoom;
    const oldHeight = this.sHeight;
    const oldWidth = this.sWidth;
    const propX = x / this.scaledWidth;
    const propY = y / this.scaledHeight;
    const dx = propX * (oldWidth - newWidth);
    const dy = propY * (oldHeight - newHeight);

    this.zoom = newZoom;
    this.sHeight = newHeight;
    this.sWidth = newWidth;
    this.sx += dx;
    this.sy += dy;
  }
}