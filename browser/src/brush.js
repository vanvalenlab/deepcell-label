export class Brush {
  constructor(model) {
    this.model = model;
    // size of brush in pixels
    this._size = 5;

    // attributes needed to match visible canvas
    this._height = model.height;
    this._width = model.width;
    this._padding = model.padding;
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
}
