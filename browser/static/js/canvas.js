/**
 * Handles zooming and panning of the canvas.
 */
class CanvasPosition {
  constructor(model) {
    this.model = model;

    this.width = model.width;
    this.height = model.height;
    this.scale = model.scale;
    this.padding = model.padding;

    // attributes for viewing the canvas.
    this._sx = 0;
    this._sy = 0;
    this.sWidth = model.width;
    this.sHeight = model.height;
    this.zoom = 100;
    this.zoomLimit = 100;
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
}