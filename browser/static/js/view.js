class View {
  constructor(model) {
    // TODO: use observer interface & have View subscribe to model
    this.model = model;
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
   * Updates the infopane with the latest project info.
   */
  render_info_display() {
    const model = this.model;
    const canvas = this.model.canvas;
    // always show current frame, feature, channel
    document.getElementById('frame').innerHTML = model.frame;
    document.getElementById('feature').innerHTML = model.feature;
    document.getElementById('channel').innerHTML = model.channel;
    document.getElementById('zoom').innerHTML = `${canvas.zoom}%`;
  
    const displayedX = `${Math.floor(canvas.sx)}-${Math.ceil(canvas.sx + canvas.sWidth)}`;
    document.getElementById('displayedX').innerHTML = displayedX;
  
    const displayedY = `${Math.floor(canvas.sy)}-${Math.ceil(canvas.sy + canvas.sHeight)}`
    document.getElementById('displayedY').innerHTML = displayedY;
  
    this.render_highlight_info();
    this.render_edit_info();
    this.render_cell_info();
    // always show 'state'
    document.getElementById('mode').innerHTML = this.renderMode();
  }

  /**
   * Renders the highlight rows of the the infopane.
   */
  render_highlight_info() {
    const model = this.model;
    const brush = this.model.brush;
    const highlightText = (model.highlight) ? 'ON' : 'OFF';
    let highlightedLabels = 'none';
    if (model.highlight) {
      if (model.edit_mode) {
        highlightedLabels = (brush.value > 0) ? brush.value : '-';
      } else {
        if (model.highlighted_cell_one !== -1) {
          if (model.highlighted_cell_two !== -1) {
            highlightedLabels = `${model.highlighted_cell_one}, ${model.highlighted_cell_two}`;
          } else {
            highlightedLabels = model.highlighted_cell_one;
          }
        }
      }
    }
    document.getElementById('highlight').innerHTML = highlightText;
    document.getElementById('currently_highlighted').innerHTML = highlightedLabels;
  }
  
  /**
   * Renders the edit mode specific rows of the infopane.
   */
  render_edit_info() {
    const model = this.model;
    const brush = model.brush;
    const editModeText = (model.edit_mode) ? 'paint mode' : 'whole-label mode';
    document.getElementById('edit_mode').innerHTML = editModeText;
  
    const rowVisibility = (model.edit_mode) ? 'visible' : 'hidden';
    document.getElementById('edit_brush_row').style.visibility = rowVisibility;
    document.getElementById('brush_label_row').style.visibility = rowVisibility;
    document.getElementById('edit_erase_row').style.visibility = rowVisibility;
  
    if (model.edit_mode) {
      document.getElementById('edit_brush').innerHTML = brush.size;
  
      const editLabelText = (brush.value > 0) ? brush.value : '-';
      document.getElementById('brush_label').innerHTML = editLabelText;
  
      const editEraseText = (brush.erase && !brush.conv) ? 'ON' : 'OFF';
      document.getElementById('edit_erase').innerHTML = editEraseText;
    }
  }
  
  /**
   * Renders the rows about the label being hovered over.
   */
  render_cell_info() {
    const model = this.model;
    const canvas = model.canvas;
    if (canvas.label !== 0) {
      document.getElementById('label').innerHTML = canvas.label;
      const track = model.tracks[model.feature][canvas.label.toString()];
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
      return `SELECTED ${this.model.info.label}`;
    }
    if (mode === Modes.multiple) {
      return `SELECTED ${this.model.info.label_1}, ${this.model.info.label_2}`;
    }
    if (mode === Modes.question || mode === Modes.prompt || mode === Modes.drawing) {
      return this.model.prompt;
    }
  }

  /**
   * Renders the image on the canvas.
   */
  render_image_display() {
    const model = this.model;
    const canvas = model.canvas;
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // TODO: is there a corresponding ctx.restore to match this ctx.save?
    ctx.save();
    ctx.clearRect(
      0, 0,
      2 * model.padding + canvas.scaledWidth,
      2 * model.padding + canvas.scaledHeight
    );
  
    if (model.edit_mode) {
      // edit mode (annotations overlaid on raw + brush preview)
      this.render_edit_image(ctx);
    } else if (model.rendering_raw) {
      // draw raw image
      this.render_raw_image(ctx);
    } else {
      // draw annotations
      this.render_annotation_image(ctx);
    }
    canvas.drawBorders(ctx);
  }

  /**
   * Renders labels overlaid with the raw image and the brush preview.
   * @param {*} ctx canvas context to render on
   */
  render_edit_image(ctx) {
    const model = this.model;
    const brush = model.brush;
    const canvas = model.canvas;
    if (model.rgb && model.rendering_raw) {
      render_raw_image(ctx);
    } else if (!model.rgb && !model.display_labels) {
      canvas.drawImage(ctx, this.model.adjuster.preCompRaw, model.padding);
    } else {
      canvas.drawImage(ctx, this.model.adjuster.postCompImg, model.padding);
    }
    ctx.save();
    const region = new Path2D();
    region.rect(model.padding, model.padding, canvas.scaledWidth, canvas.scaledHeight);
    ctx.clip(region);
    ctx.imageSmoothingEnabled = true;
  
    // draw brushview on top of cells/annotations
    brush.draw(ctx, canvas);
  
    ctx.restore();
  }

  /**
   * Renders raw image.
   * @param {*} ctx canvas context to render on
   */
  render_raw_image(ctx) {
    this.model.canvas.drawImage(ctx, this.model.adjuster.contrastedRaw, this.model.padding);
  }
  
  /**
   * Renders labeled image.
   * @param {*} ctx canvas context to render on
   */
  render_annotation_image(ctx) {
    if (this.model.rgb && !this.model.display_labels) {
      this.model.canvas.drawImage(ctx, this.model.adjuster.postCompImg, this.model.padding);
    } else {
      this.model.canvas.drawImage(ctx, this.model.adjuster.preCompSeg, this.model.padding);
    }
  }
}