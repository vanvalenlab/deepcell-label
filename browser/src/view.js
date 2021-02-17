/** Displays and updates UI elements. */
export class View {
  constructor(model) {
    // TODO: use observer interface & have View subscribe to model
    this.model = model;
    this.infopaneView = new InfopaneView(model);
    this.canvasView = new CanvasView(model);

    this.setCanvasDimensions();
    this.displayUndoRedo();
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
  }

  /**
   * Updates the infopane with the latest project info.
   */
  render() {
    document.getElementById('frame').textContent = this.model.frame;
    document.getElementById('feature').textContent = this.model.feature;
    document.getElementById('channel').textContent = this.model.channel;
    document.getElementById('zoom').textContent = `${this.canvas.zoom}%`;

    const minX = Math.floor(this.canvas.sx);
    const maxX = Math.ceil(this.canvas.sx + this.canvas.sWidth);
    const displayedX = `${minX}-${maxX}`;
    document.getElementById('displayedX').textContent = displayedX;

    const minY = Math.floor(this.canvas.sy);
    const maxY = Math.ceil(this.canvas.sy + this.canvas.sHeight);
    const displayedY = `${minY}-${maxY}`;
    document.getElementById('displayedY').textContent = displayedY;

    const highlightText = (this.model.highlight) ? 'ON' : 'OFF';
    document.getElementById('highlight').textContent = highlightText;
    document.getElementById('edit_brush').textContent = this.model.size;
    this.renderLabelRows();
    // always show tool and selected labels

    document.getElementById('mode').textContent = this.getTool();
    const foreground = this.model.foreground;
    const background = this.model.background;
    document.getElementById('foreground').textContent = foreground === 0 ? 'background' : foreground;
    document.getElementById('background').textContent = background === 0 ? 'background' : background;

    this.renderPrompt();
  }

  getTool() {
    const states = window.controller.service.state.toStrings();
    const toolbarState = 'mouse.toolbar.';
    for (const state of states) {
      if (state.startsWith(toolbarState)) { return state.substring(toolbarState.length); }
    }
    return 'loading...';
  }

  /**
   * Renders the rows about the label being hovered over.
   */
  renderLabelRows() {
    if (this.canvas.label !== 0) {
      document.getElementById('label').textContent = this.canvas.label;
      const track = this.model.tracks[this.model.feature][this.canvas.label.toString()];
      document.getElementById('slices').textContent = track.slices.toString();
    } else {
      document.getElementById('label').textContent = '';
      document.getElementById('slices').textContent = '';
    }
  }

  renderPrompt() {
    const state = window.controller.service.state;
    const label = this.model.foreground;
    const secondLabel = this.model.background;
    const frame = this.model.frame;
    let prompt;
    if (state.matches('confirm.predictFrame')) {
      prompt = `Predict labels on frame ${frame}?`;
    } else if (state.matches('confirm.predictAll')) {
      prompt = 'Predict labels on ALL frames?';
    } else if (state.matches('confirm.replaceFrame')) {
      prompt = `Replace label ${secondLabel} with label ${label} on frame ${frame}?`
    } else if (state.matches('confirm.replaceAll')) {
      prompt = `Replace label ${secondLabel} with label ${label} on ALL frames?`
    } else if (state.matches('confirm.swapFrame')) {
      prompt = `Swap label ${label} with label ${secondLabel} on frame ${frame}?`
    }

    if (prompt) {
      prompt = prompt + '\nPress ENTER to confirm or ESC to cancel.'
      document.getElementById('prompt').textContent = prompt;
    } else {
      document.getElementById('prompt').textContent = '';
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

  get image() {
    if (window.controller.service.state.matches('display.overlay')) {
      return this.overlay;
    } else if (window.controller.service.state.matches('display.raw')) {
      return this.raw;
    } else {
      return this.labeled;
    }
  }

  get overlay() {
    return this.model.adjuster.postCompImg;
  }

  get raw() {
    return this.model.adjuster.contrastedRaw;
  }

  get labeled() {
    return this.model.adjuster.preCompSeg;
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
    return this.canvas.scaledWidth;
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
    return this.canvas.height;
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

    this.drawImage(ctx);
    this.drawBrush(ctx);
    this.drawBorders(ctx);
  }

  drawImage(ctx) {
    ctx.clearRect(this.padding, this.padding, this.width, this.height);
    ctx.drawImage(
      this.image,
      this.sx, this.sy,
      this.sWidth, this.sHeight,
      this.padding, this.padding,
      this.scaledWidth,
      this.scaledHeight
    );
  }

  drawBrush(ctx) {
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
}

/** Renders the brush onto the interactive canvas. */
class BrushView {
  constructor(model) {
    this.model = model;
    // opacity only applies to interior
    this._fillColor = 'white';
    this._opacity = 0.3;

    // create hidden canvas to store brush preview
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'brushCanvas';
    // this canvas should never be seen
    this.canvas.style.display = 'none';
    this.canvas.height = this.model.height;
    this.canvas.width = this.model.width;
    document.body.appendChild(this.canvas);
    this.ctx = document.getElementById('brushCanvas').getContext('2d');
    // set fillStyle here, it will never change
    this.ctx.fillStyle = this._fillColor;
  }

  get _outlineColor() {
    return this.model.foreground === 0 ? 'red' : 'white';
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
    if (window.controller.service.state.matches('mouse.toolbar.threshold')) {
      this.drawThreshold();
    } else if (window.controller.service.state.matches('mouse.toolbar.paint')) {
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
    if (window.controller.service.state.matches('mouse.toolbar.threshold.dragging')) {
      const storedX = window.controller.service.state.context.storedX;
      const storedY = window.controller.service.state.context.storedY;
      // solid box around threshold area
      ctxDst.strokeStyle = 'white';
      const boxStartX = (storedX - sx) * mag + this.padding;
      const boxStartY = (storedY - sy) * mag + this.padding;
      const boxWidth = (x - storedX) * mag;
      const boxHeight = (y - storedY) * mag;
      ctxDst.strokeRect(boxStartX, boxStartY, boxWidth, boxHeight);
    } else if (window.controller.service.state.matches('mouse.toolbar.paint')) {
      // solid circle around current brush location
      ctxDst.beginPath();
      const cX = (x - sx) * mag + this.padding;
      const cY = (y - sy) * mag + this.padding;
      ctxDst.arc(cX, cY, mag * this.model.size, 0, Math.PI * 2, true);
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
    if (window.controller.service.state.matches('mouse.toolbar.threshold.dragging')) {
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
    if (!window.controller.service.state.matches('mouse.toolbar.paint.dragging')) {
      this.clear();
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.model.size, 0, Math.PI * 2, true);
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
