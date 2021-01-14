/** Displays and updates UI elements. */
class View {
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
    let canvasElement = document.getElementById('canvas');
    let undoButton = document.getElementById('undo');
    undoButton.hidden = false;
    undoButton.style.width = canvasElement.width / 2 + 'px';
  
    let redoButton = document.getElementById('redo');
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
  
    this.renderHighlightRows();
    this.renderEditRows();
    this.renderLabelRows();
    // always show 'state'
    document.getElementById('mode').innerHTML = this.renderMode();
  }

  /**
   * Renders the highlight rows of the the infopane.
   */
  renderHighlightRows() {
    const highlightText = (this.model.highlight) ? 'ON' : 'OFF';
    let highlightedLabels = 'none';
    if (this.model.highlight) {
      if (this.model.edit_mode) {
        highlightedLabels = (this.brush.value > 0) ? this.brush.value : '-';
      } else {
        if (this.model.highlighted_cell_one !== -1) {
          if (this.model.highlighted_cell_two !== -1) {
            highlightedLabels = `${this.model.highlighted_cell_one}, ${this.model.highlighted_cell_two}`;
          } else {
            highlightedLabels = this.model.highlighted_cell_one;
          }
        }
      }
    }
    document.getElementById('highlight').innerHTML = highlightText;
    document.getElementById('currently_highlighted').innerHTML = highlightedLabels;

    let selectedLabels = `${this.model.selected.label}, ${this.model.selected.secondLabel}`;
    document.getElementById('selected').innerHTML = selectedLabels;
  }
  
  /**
   * Renders the edit mode specific rows of the infopane.
   */
  renderEditRows() {
    const editModeText = (this.model.edit_mode) ? 'paint mode' : 'whole-label mode';
    document.getElementById('edit_mode').innerHTML = editModeText;
  
    const rowVisibility = (this.model.edit_mode) ? 'visible' : 'hidden';
    document.getElementById('edit_brush_row').style.visibility = rowVisibility;
    document.getElementById('brush_label_row').style.visibility = rowVisibility;
    document.getElementById('edit_erase_row').style.visibility = rowVisibility;
  
    if (this.model.edit_mode) {
      document.getElementById('edit_brush').innerHTML = this.brush.size;
  
      const editLabelText = (this.brush.value > 0) ? this.brush.value : '-';
      document.getElementById('brush_label').innerHTML = editLabelText;
  
      const editEraseText = this.brush.erase ? 'ON' : 'OFF';
      document.getElementById('edit_erase').innerHTML = editEraseText;
    }
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

  /**
   * Renders text for "state:" in infopane.
   */
  renderMode() {
    const mode = this.model.kind;
    if (mode === Modes.none) {
      return '';
    }
    if (mode === Modes.single) {
      return `SELECTED ${this.model.selected.label}`;
    }
    if (mode === Modes.multiple) {
      return `SELECTED ${this.model.selected.label}, ${this.model.selected.secondLabel}`;
    }
    if (mode === Modes.question || mode === Modes.prompt || mode === Modes.drawing) {
      return this.model.pendingAction.prompt;
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
    if (this.model.rgb && this.model.rendering_raw) {
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
  
    if (this.model.edit_mode) {
      // edit mode (annotations overlaid on raw + brush preview)
      this.renderOverlay(ctx);
    } else if (this.model.rendering_raw) {
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
    return this.brush._erase && !this.brush._conv ? 'red' : 'white';
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
    if (this.brush.thresholding) {
      this.drawThreshold();
    } else {
      this.drawPaintbrush();
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

    // Draw solid outlines
    if (this.brush.showBox) {
      // solid box around threshold area
      ctxDst.strokeStyle = 'white';
      const boxStartX = (this.brush.threshX - sx) * mag + this.padding;
      const boxStartY = (this.brush.threshY - sy) * mag + this.padding;
      const boxWidth = (this.brush.x - this.brush.threshX) * mag;
      const boxHeight = (this.brush.y - this.brush.threshY) * mag;
      ctxDst.strokeRect(boxStartX, boxStartY, boxWidth, boxHeight);
    } else if (this.brush.showCircle) {
      // solid circle around current brush location
      ctxDst.beginPath();
      const cX = (this.brush.x - sx) * mag + this.padding;
      const cY = (this.brush.y - sy) * mag + this.padding;
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
    // interior of box; will be added to visible canvas with opacity
    if (this.brush.showBox) {
      this.ctx.fillRect(
        this.brush.threshX, this.brush.threshY,
        this.brush.x - this.brush.threshX,
        this.brush.y - this.brush.threshY);
    }
  }

  /**
   * Draws the current brush trace on the brush canvas.
   */
  drawPaintbrush() {
    // When painting, leave behind previous shadows to show brush's trace
    if (!this.model.isPainting) {
      this.clear();
    }
    this.ctx.beginPath();
    this.ctx.arc(this.brush.x, this.brush.y, this.brush.size, 0, Math.PI * 2, true);
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
