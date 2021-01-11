class Brush {
  constructor(model) {
    this.model = model;
    // center of brush (scaled)
    this.x = 0;
    this.y = 0;
    // size of brush in pixels
    this._size = 5;

    // status of eraser
    this._erase = false;

    // normal brush attributes
    this._regTarget = 0;
    this._regValue = 1;

    // conversion brush attributes
    this._convTarget = -1;
    this._convValue = -1;

    // status of conversion brush mode
    this._conv = false;

    // attributes needed to match visible canvas
    this._height = model.height;
    this._width = model.width;
    this._padding = model.padding;


    // threshold/box attributes
    // -2*pad will always be out of range for annotators
    // anchored corner of bounding box
    this._threshX = -2 * model.padding;
    this._threshY = -2 * model.padding;
    this._showBox = false;
    this._thresholding = false;
  }

  get size() {
    return this._size;
  }

  // set bounds on size of brush, update brushview appropriately
  set size(newSize) {
    // don't need brush to take up whole frame
    if (newSize > 0 && newSize < this._height / 2 &&
        newSize < this._width / 2 && newSize !== this._size) {
      // size is size in pixels, used to modify source array
      this._size = newSize;
      // // update brush preview with new size
      // this.refreshView();
    }
    this.model.notifyImageChange();
  }

  get erase() {
    return this._erase && !this.conv;
  }

  set erase(bool) {
    // eraser is either true or false
    if (typeof bool === 'boolean') {
      this._erase = bool;
      this.model.notifyImageChange();
    }
  }

  // target = value of array that backend will overwrite
  get target() {
    if (this._conv) {
      return this._convTarget;
    } else {
      // always 0
      return this._regTarget;
    }
  }

  // only conversion brush target can change
  set target(val) {
    // never set conversion brush to modify background
    if (this._conv && val !== 0) {
      this._convTarget = val;
    }
  }

  // value = label that gets added to annotation array in backend
  get value() {
    if (this._conv) {
      return this._convValue;
    } else {
      return this._regValue;
    }
  }

  // can change brush label or conversion brush label
  set value(val) {
    // never set conversion brush to modify background
    // logic for val != target is elsewhere to prevent
    // value picking from finishing early
    if (this._conv && val !== 0) {
      this._convValue = val;
    } else if (!this._conv) {
      // regular brush never has value less than 1
      // and never has value more than first unused label
      val = Math.max(val, 1); 
      val = Math.min(val, this.model.maxLabelsMap.get(this.model.feature) + 1);
      this._regValue = val;
    }
    if (this.model.highlight) this.model.notifyImageChange();
    this.model.notifyInfoChange();
    this.model.notifyImageFormattingChange();
  }

  // whether or not conversion brush is on
  get conv() {
    return this._conv;
  }

  set conv(bool) {
    this._conv = bool;
    // if turning off conv brush, reset conv values
    if (!bool) {
      this._convValue = -1;
      this._convTarget = -1;
    }
    this.model.notifyImageChange();
  }

  get threshX() {
    return this._threshX;
  }

  set threshX(x) {
    this._threshX = x;
    this._showBox = x !== -2 * this._padding;
    this.model.notifyImageChange();
  }

  get threshY() {
    return this._threshY;
  }

  set threshY(y) {
    this._threshY= y;
    this._showBox = y !== -2 * this._padding;
    this.model.notifyImageChange();
  }

  get thresholding() {
    return this._thresholding;
  }

  set thresholding(bool) {
    this._thresholding = bool;
    this.model.notifyImageChange();
  }

  get showCircle() {
    return !this.thresholding;
  }

  get showBox() {
    return this.threshX !== -2 * this._padding && this.threshY !== -2 * this._padding;
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.model.notifyImageChange();
  }

  // reset thresholding box anchor corner
  clearThresh() {
    this.threshX = -2 * this._padding;
    this.threshY = -2 * this._padding;
  }
}
