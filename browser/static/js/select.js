class SelectedLabels {
  constructor(model) {
    this.model = model;

    this._label = 1;
    this._frame;
    this._x;
    this._y;

    this._secondLabel = 0;
    this._secondFrame;
    this._secondX;
    this._secondY;
  }

  get label() {
    return this._label;
  }

  set label(value) {
    this._label = value;
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }

  get frame() {
    return this._frame;
  }

  get x() {
    return this._x;
  }

  get y() {
    return this._y;
  }

  get secondLabel() {
    return this._secondLabel;
  }

  set secondLabel(value) {
    this._secondLabel = value;
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }

  get secondFrame() {
    return this._secondFrame;
  }

  get secondX() {
    return this._secondX;
  }

  get secondY() {
    return this._secondY;
  }

  pickLabel() {
    this._label = this.model.canvas.label;
    this._frame = this.model.frame;
    this._x = this.model.canvas.imgX;
    this._y = this.model.canvas.imgY;
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }

  pickSecondLabel() {
    this._secondLabel = this.model.canvas.label;
    this._secondFrame = this.model.frame;
    this._secondX = this.model.canvas.imgX;
    this._secondY = this.model.canvas.imgY;
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }

  clear() {
    this._label = this.model.maxLabelsMap.get(this.model.feature) + 1;
    this._secondLabel = 0;
    // TODO: clear selection positions?
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }
}