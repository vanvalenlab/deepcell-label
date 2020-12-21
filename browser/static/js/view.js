class View {
  constructor(model) {

    let adjuster = new ImageAdjuster(model);

    adjuster.rawImage.onload = () => adjuster.contrastRaw();
    adjuster.segImage.onload = () => adjuster.preCompAdjust();
    if (rgb) {
      adjuster.contrastedRaw.onload = () => adjuster.rawAdjust();
      adjuster.preCompSeg.onload = () => adjuster.segAdjust(canvas.segArray, current_highlight, edit_mode, brush, mode);
    } else {
      adjuster.contrastedRaw.onload = () => adjuster.preCompRawAdjust();
      adjuster.preCompRaw.onload = () => adjuster.rawAdjust(canvas.segArray, current_highlight, edit_mode, brush, mode);
      adjuster.preCompSeg.onload = () => adjuster.segAdjust(canvas.segArray, current_highlight, edit_mode, brush, mode);
      adjuster.compositedImg.onload = () => adjuster.postCompAdjust(canvas.segArray, edit_mode, brush, current_highlight);
    }

    adjuster.postCompImg.onload = this.render_image_display;

    this.adjuster = adjuster;
    // TODO: should the view own the model? or instead have the model notify the view with the info it needs?
    // possible pressure point: onload cascade
    // TODO: can the cascade trigger without the model knowing? if yes, then the view might always need model access
    this.model = model;
    
  }

  displayUndoRedo() {
    let canvasElement = document.getElementById('canvas');
    let undoButton = document.getElementById('undo');
    undoButton.hidden = false;
    undoButton.style.width = canvasElement.width / 2 + 'px';
  
    let redoButton = document.getElementById('redo');
    redoButton.hidden = false;
    redoButton.style.width = canvasElement.width / 2 + 'px';
  }

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
  
  render_cell_info() {
    const model = this.model;
    const canvas = model.canvas;
    if (canvas.label !== 0) {
      document.getElementById('label').innerHTML = canvas.label;
      const track = model.tracks[mode.feature][canvas.label.toString()];
      document.getElementById('slices').textContent = track.slices.toString();
    } else {
      document.getElementById('label').innerHTML = '';
      document.getElementById('slices').textContent = '';
    }
  }
  
  // updates html display of side info panel
  render_info_display() {
    const model = this.model;
    const canvas = model.canvas;
    // always show current frame, feature, channel
    document.getElementById('frame').innerHTML = model.frame;
    document.getElementById('feature').innerHTML = model.feature;
    document.getElementById('channel').innerHTML = model.channel;
    document.getElementById('zoom').innerHTML = `${canvas.zoom}%`;
  
    const displayedX = `${Math.floor(canvas.sx)}-${Math.ceil(canvas.sx + canvas.sWidth)}`;
    document.getElementById('displayedX').innerHTML = displayedX;
  
    const displayedY = `${Math.floor(canvas.sy)}-${Math.ceil(canvas.sy + canvas.sHeight)}`
    document.getElementById('displayedY').innerHTML = displayedY;
  
    render_highlight_info();
  
    render_edit_info();
  
    render_cell_info();
  
    // always show 'state'
    document.getElementById('mode').innerHTML = this.renderMode();
  }

  // shows up in info display as text for "state:"
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

  render_image_display() {
    const model = this.model;
    const canvas = model.canvas;
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // TODO: is there a corresponding ctx.restore to match this ctx.save?
    ctx.save();
    ctx.clearRect(
      0, 0,
      2 * padding + canvas.scaledWidth,
      2 * padding + canvas.scaledHeight
    );
  
    if (model.edit_mode) {
      // edit mode (annotations overlaid on raw + brush preview)
      render_edit_image(ctx);
    } else if (model.rendering_raw) {
      // draw raw image
      render_raw_image(ctx);
    } else {
      // draw annotations
      render_annotation_image(ctx);
    }
    canvas.drawBorders(ctx);
  }

  render_edit_image(ctx) {
    const model = this.model;
    const brush = model.brush;
    const canvas = model.canvas;
    if (model.rgb && model.rendering_raw) {
      render_raw_image(ctx);
    } else if (!rgb && !display_labels) {
      canvas.drawImage(ctx, adjuster.preCompRaw, padding);
    } else {
      canvas.drawImage(ctx, adjuster.postCompImg, padding);
    }
    ctx.save();
    const region = new Path2D();
    region.rect(padding, padding, canvas.scaledWidth, canvas.scaledHeight);
    ctx.clip(region);
    ctx.imageSmoothingEnabled = true;
  
    // draw brushview on top of cells/annotations
    brush.draw(ctx, canvas);
  
    ctx.restore();
  }

  render_raw_image(ctx) {
    this.model.canvas.drawImage(ctx, this.adjuster.contrastedRaw, padding);
  }
  
  render_annotation_image(ctx) {
    if (rgb && !display_labels) {
      this.model.canvas.drawImage(ctx, this.adjuster.postCompImg, padding);
    } else {
      this.model.canvas.drawImage(ctx, this.adjuster.preCompSeg, padding);
    }
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