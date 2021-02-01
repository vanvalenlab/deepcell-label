/** Displays and updates UI elements. */
export class View {
  constructor(model) {
    // TODO: use observer interface & have View subscribe to model
    this.model = model;

    this.infopaneView = new InfopaneView(model);
    this.canvasView = new CanvasView(model);
  }

  /**
   * Formats the undo/redo buttons.
   */
  displayUndoRedo() {
    const canvasElement = document.getElementById('canvas');
    const undoButton = document.getElementById('undo');
    undoButton.hidden = false;
    undoButton.style.width = canvasElement.width / 2 + 'px';

    const redoButton = document.getElementById('redo');
    redoButton.hidden = false;
    redoButton.style.width = canvasElement.width / 2 + 'px';
  }

  /**
   * Calculate available space and how much to scale x and y to fill it
   */
  setCanvasDimensions() {
    const maxWidth = this._calculateMaxWidth();
    const maxHeight = this._calculateMaxHeight();

    const scaleX = maxWidth / this.model.width;
    const scaleY = maxHeight / this.model.height;

    // pick scale that accomodates both dimensions; can be less than 1
    const scale = Math.min(scaleX, scaleY);
    const padding = this.model.canvas.padding;

    this.model.canvas.zoom = 100;
    this.model.canvas.scale = scale;
    this.canvasView.setBorders();

    // TODO: move to view?
    // set canvases size according to scale
    document.getElementById('canvas').width = this.model.canvas.scaledWidth + 2 * padding;
    document.getElementById('canvas').height = this.model.canvas.scaledHeight + 2 * padding;
  }

  /**
   * Calculate the maximum width of the canvas display area.
   * The canvas only shares width with the table display on its left.
   */
  _calculateMaxWidth() {
    const mainSection = window.getComputedStyle(
      document.getElementsByTagName('main')[0]
    );
    const tableColumn = window.getComputedStyle(
      document.getElementById('table-col')
    );
    const canvasColumn = window.getComputedStyle(
      document.getElementById('canvas-col')
    );
    const maxWidth = Math.floor(
      document.getElementsByTagName('main')[0].clientWidth -
      parseInt(mainSection.marginTop) -
      parseInt(mainSection.marginBottom) -
      document.getElementById('table-col').clientWidth -
      parseFloat(tableColumn.paddingLeft) -
      parseFloat(tableColumn.paddingRight) -
      parseFloat(tableColumn.marginLeft) -
      parseFloat(tableColumn.marginRight) -
      parseFloat(canvasColumn.paddingLeft) -
      parseFloat(canvasColumn.paddingRight) -
      parseFloat(canvasColumn.marginLeft) -
      parseFloat(canvasColumn.marginRight)
    );
    return maxWidth;
  }

  /**
   * Calculate the maximum height for the canvas display area,
   * leaving space for navbar, instructions pane, and footer.
   */
  _calculateMaxHeight() {
    const mainSection = window.getComputedStyle(
      document.getElementsByTagName('main')[0]
    );
    // leave space for navbar, instructions pane, and footer
    const maxHeight = Math.floor(
      (
        (
          window.innerHeight ||
          document.documentElement.clientHeight ||
          document.body.clientHeight
        ) -
        parseInt(mainSection.marginTop) -
        parseInt(mainSection.marginBottom) -
        document.getElementsByClassName('page-footer')[0].clientHeight -
        document.getElementsByClassName('collapsible')[0].clientHeight -
        document.getElementsByClassName('navbar-fixed')[0].clientHeight
      )
    );
    return maxHeight;
  }
}

/**
 * Renders the infopane.
 */
class InfopaneView {
  constructor(model) {
    this.model = model;
    this.canvas = model.canvas;
    this.brush = model.brush;
  }

  /**
   * Updates the infopane with the latest project info.
   */
  render() {
    // always show current frame, feature, channel
    document.getElementById('frame').innerHTML = this.model.frame;
    document.getElementById('feature').innerHTML = this.model.feature;
    document.getElementById('channel').innerHTML = this.model.channel;
    document.getElementById('zoom').innerHTML = `${this.canvas.zoom}%`;

    const minX = Math.floor(this.canvas.sx);
    const maxX = Math.ceil(this.canvas.sx + this.canvas.sWidth);
    const displayedX = `${minX}-${maxX}`;
    document.getElementById('displayedX').innerHTML = displayedX;

    const minY = Math.floor(this.canvas.sy);
    const maxY = Math.ceil(this.canvas.sy + this.canvas.sHeight);
    const displayedY = `${minY}-${maxY}`;
    document.getElementById('displayedY').innerHTML = displayedY;

    const highlightText = (this.model.highlight) ? 'ON' : 'OFF';
    document.getElementById('highlight').innerHTML = highlightText;
    document.getElementById('edit_brush').innerHTML = this.brush.size;
    this.renderLabelRows();
    // always show 'state' and selected labels
    const states = window.controller.service.state.toStrings();
    document.getElementById('mode').innerHTML = states[states.length - 2];
    const foreground = this.model.selected.label;
    const background = this.model.selected.secondLabel;
    document.getElementById('foreground').innerHTML = foreground === 0 ? 'background' : foreground;
    document.getElementById('background').innerHTML = background === 0 ? 'background' : background;
  }

  /**
   * Renders the rows about the label being hovered over.
   */
  renderLabelRows() {
    if (this.canvas.label !== 0) {
      document.getElementById('label').innerHTML = this.canvas.label;
      const track = this.model.tracks[this.model.feature][this.canvas.label.toString()];
      document.getElementById('slices').textContent = track.slices.toString();
    } else {
      document.getElementById('label').innerHTML = '';
      document.getElementById('slices').textContent = '';
    }
  }
}

/** Renders images onto the interactive canas. */
class CanvasView {
  constructor(model) {
    this.model = model;
    this.canvas = model.canvas;

    this.brushView = new BrushView(model);

    this.topBorder = new Path2D();
    this.bottomBorder = new Path2D();
    this.rightBorder = new Path2D();
    this.leftBorder = new Path2D();
  }

  get overlay() {
    if (this.model.rgb) { // && this.model.rendering_raw) { TODO: use displayState in statechart
      return this.model.adjuster.contrastedRaw;
    } else if (!this.model.rgb && !this.model.display_labels) {
      return this.model.adjuster.preCompRaw;
    } else {
      return this.model.adjuster.postCompImg;
    }
  }

  get raw() {
    return this.model.adjuster.contrastedRaw;
  }

  get labeled() {
    if (this.model.rgb && !this.model.display_labels) {
      return this.model.adjuster.postCompImg;
    } else {
      return this.model.adjuster.preCompSeg;
    }
  }

  get sx() {
    return this.canvas.sx;
  }

  get sy() {
    return this.canvas.sy;
  }

  get sWidth() {
    return this.canvas.sWidth;
  }

  get sHeight() {
    return this.canvas.sHeight;
  }

  get scaledWidth() {
    return this.canvas.scaledHeight;
  }

  get scaledHeight() {
    return this.canvas.scaledHeight;
  }

  get padding() {
    return this.canvas.padding;
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.width;
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

  /**
   * Renders the image on the canvas.
   */
  render() {
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // TODO: is there a corresponding ctx.restore to match this ctx.save?
    ctx.save();
    ctx.clearRect(
      0, 0,
      2 * this.model.padding + this.scaledWidth,
      2 * this.model.padding + this.scaledHeight
    );

    if (window.controller.service.state.matches('display.overlay')) {
      // edit mode (annotations overlaid on raw + brush preview)
      this.renderOverlay(ctx);
    } else if (window.controller.service.state.matches('display.raw')) {
      // draw raw image
      this.renderRaw(ctx);
    } else {
      // draw annotations
      this.renderLabeled(ctx);
    }
    this.drawBorders(ctx);
  }

  /**
   * Renders labels overlaid with the raw image and the brush preview.
   * @param {*} ctx canvas context to render on
   */
  renderOverlay(ctx) {
    this.drawImage(ctx, this.overlay);
    ctx.save();
    const region = new Path2D();
    region.rect(this.model.padding, this.model.padding,
      this.scaledWidth, this.scaledHeight);
    ctx.clip(region);
    ctx.imageSmoothingEnabled = true;

    // Draw brush on top of image
    this.brushView.draw(ctx);

    ctx.restore();
  }

  /**
   * Renders raw image.
   * @param {*} ctx canvas context to render on
   */
  renderRaw(ctx) {
    this.drawImage(ctx, this.raw);
  }

  /**
   * Renders labeled image.
   * @param {*} ctx canvas context to render on
   */
  renderLabeled(ctx) {
    this.drawImage(ctx, this.labeled);
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
}

/** Renders the brush onto the interactive canvas. */
class BrushView {
  constructor(model) {
    this.model = model;
    this.brush = model.brush;

    // opacity only applies to interior
    this._fillColor = 'white';
    this._opacity = 0.3;

    // create hidden canvas to store brush preview
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'brushCanvas';
    // this canvas should never be seen
    this.canvas.style.display = 'none';
    this.canvas.height = model.height;
    this.canvas.width = model.width;
    document.body.appendChild(this.canvas);
    this.ctx = document.getElementById('brushCanvas').getContext('2d');
    // set fillStyle here, it will never change
    this.ctx.fillStyle = this._fillColor;
  }

  get _outlineColor() {
    // if conv brush is on, disable eraser, even when erase is true
    // red outline is visual indicator for eraser being on
    // white outline if eraser is off (drawing normally)
    return this.brush.value === 0 ? 'red' : 'white';
  }

  get padding() {
    return this.model.padding;
  }

  // clear previous view and update with current view
  refresh() {
    this.clear();
    this.addShadow();
  }

  /**
   * Draws the brush canvas onto another ctx.
   * @param {*} ctxDst
   */
  draw(ctxDst) {
    // get attributes from viewer object
    const sx = this.model.canvas.sx;
    const sy = this.model.canvas.sy;
    const swidth = this.model.canvas.sWidth;
    const sheight = this.model.canvas.sHeight;
    const mag = this.model.canvas.scale * this.model.canvas.zoom / 100;

    // Update the translucent brush canvas
    if (window.controller.service.state.matches('label.interactive.edit.tool.threshold')) {
      this.drawThreshold();
    } else if (window.controller.service.state.matches('label.interactive.edit.tool.paint')) {
      this.drawPaintbrush();
    } else {
      this.clear();
    }

    // Draw the translucent brush trace onto the main canvas
    ctxDst.save();
    ctxDst.globalAlpha = this._opacity;
    ctxDst.globalCompositeOperation = 'source-over';
    const ctxDstHeight = ctxDst.canvas.height;
    const ctxDstWidth = ctxDst.canvas.width;
    ctxDst.drawImage(
      this.canvas, sx, sy, swidth, sheight,
      this.padding, this.padding,
      ctxDstWidth - 2 * this.padding,
      ctxDstHeight - 2 * this.padding);
    ctxDst.restore();

    const x = this.model.canvas.imgX;
    const y = this.model.canvas.imgY;

    // Draw solid outlines
    if (window.controller.service.state.matches('label.interactive.edit.tool.threshold.dragging')) {
      const storedX = window.controller.service.state.context.storedX;
      const storedY = window.controller.service.state.context.storedY;
      // solid box around threshold area
      ctxDst.strokeStyle = 'white';
      const boxStartX = (storedX - sx) * mag + this.padding;
      const boxStartY = (storedY - sy) * mag + this.padding;
      const boxWidth = (x - storedX) * mag;
      const boxHeight = (y - storedY) * mag;
      ctxDst.strokeRect(boxStartX, boxStartY, boxWidth, boxHeight);
    } else if (window.controller.service.state.matches('label.interactive.edit.tool.paint')) {
      // solid circle around current brush location
      ctxDst.beginPath();
      const cX = (x - sx) * mag + this.padding;
      const cY = (y - sy) * mag + this.padding;
      ctxDst.arc(cX, cY, mag * this.brush.size, 0, Math.PI * 2, true);
      ctxDst.strokeStyle = this._outlineColor;
      ctxDst.closePath();
      ctxDst.stroke();
    }
  }

  /**
   * Draws the current thresholding box onto brush canvas.
   */
  drawThreshold() {
    // clear previous box shape
    this.clear();
    const storedX = window.controller.service.state.context.storedX;
    const storedY = window.controller.service.state.context.storedY;
    const x = this.model.canvas.imgX;
    const y = this.model.canvas.imgY;
    // interior of box; will be added to visible canvas with opacity
    if (window.controller.service.state.matches('label.interactive.edit.tool.threshold.dragging')) {
      this.ctx.fillRect(
        storedX, storedY,
        x - storedX,
        y - storedY);
    }
  }

  /**
   * Draws the current brush trace on the brush canvas.
   */
  drawPaintbrush() {
    const x = this.model.canvas.imgX;
    const y = this.model.canvas.imgY;
    // When painting, leave behind previous shadows to show brush's trace
    if (!window.controller.service.state.matches('label.interactive.edit.tool.paint.dragging')) {
      this.clear();
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brush.size, 0, Math.PI * 2, true);
    this.ctx.closePath();
    // no opacity needed; just shows where brush has been
    this.ctx.fill();
  }

  /**
   * Removes everything on the brush canvas.
   */
  clear() {
    this.ctx.clearRect(0, 0, this.model.width, this.model.height);
  }
}
