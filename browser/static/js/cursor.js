// cursor to handle mouse movement and attributes
class CalibanCursor {
  constructor(width, height, scale) {
    this.width = width
    this.height = height
    this.scale = scale;
    this.pressed = false;
    this.trace = [];

    // mouse coords
    // mouse position on canvas, no adjustment for padding
    this.rawX = 0;
    this.rawY = 0;
    // adjusted for padding
    this.canvasPosX = -5;
    this.canvasPosY = -5;
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

    this.topBorder = new Path2D();
    this.bottomBorder = new Path2D();
    this.rightBorder = new Path2D();
    this.leftBorder = new Path2D();

  }

  setBorders(padding) {
    const scaledWidth = this.scale * this.width;
    const scaledHeight = this.scale * this.height;

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
    if (Math.floor(this.sx) === 0) {
      ctx.fillStyle = 'white';
    } else {
      ctx.fillStyle = 'black';
    }
    ctx.fill(this.leftBorder);

    // right border
    if (Math.ceil(this.sx + this.sWidth) === this.width) {
      ctx.fillStyle = 'white';
    } else {
      ctx.fillStyle = 'black';
    }
    ctx.fill(this.rightBorder);

    // top border
    if (Math.floor(this.sy) === 0) {
      ctx.fillStyle = 'white';
    } else {
      ctx.fillStyle = 'black';
    }
    ctx.fill(this.topBorder);

    // bottom border
    if (Math.ceil(this.sy + this.sHeight) === this.height) {
      ctx.fillStyle = 'white';
    } else {
      ctx.fillStyle = 'black';
    }
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
    const newZoom = this.zoom - 10*dZoom;
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
      const scaledWidth = this.scale * this.width;
      const scaledHeight = this.scale * this.height;
      const propX = canvasPosX / scaledWidth;
      const propY = canvasPosY / scaledHeight;
      const dx = propX * (newWidth - oldWidth);
      const dy = propY * (newHeight - oldHeight);
      this.pan(dx, dy);
    }
  }


}