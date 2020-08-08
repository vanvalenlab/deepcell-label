// cursor to handle mouse movement and attributes
class CalibanCursor {
  constructor(width, height, scale) {
    this.width = width
    this.height = height
    this.scale = scale;
    this.pressed = false;
    this.trace = [];
  }

  // check if the mouse position in canvas matches to a displayed part of image
  inRange(x, y) {
    if (x >= 0 && x < this.width * this.scale &&
        y >= 0 && y < this.height * this.scale) {
      return true;
    } else {
      return false;
    }
  }

}

// handle updating zooming and panning attributes
class CanvasView {
  constructor(width, height) {

    this.width = width;
    this.height = height;
    this.sx = 0;
    this.sy = 0;
    this.sWidth = width;
    this.sHeight = height;
    this.zoom = 100;
    this.zoomLimit = 100;

    this.scale = 1;

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


}