class ToggleEdit extends Action {
  constructor(model) {
    super();
    this.model = model;
  }

    do() {
      this.model.edit_mode = !this.model.edit_mode;
    }

    undo() {
      this.do()
    }

    redo() {
      this.do()
    }
  }

class ToggleHighlight extends Action {
  constructor(model) {
    super();
    this.model = model;
  }

  do() {
    this.model.highlight = !this.model.highlights;
  }

  undo() {
    this.do()
  }

  redo() {
    this.do()
  }
}

/** Action to change the viewed frame. */
class ChangeFrame extends Action {
  constructor(model, frame) {
    super();
    this.model = model;
    this.oldValue = model.frame;
    this.newValue = frame.mod(numFrames);
  }

  do() {
    this.model.frame = this.newValue;
    if (this.model.action !== '') { this.model.clear() };
    setDisplay('frame', this.newValue);
  }


  undo() {
    this.model.frame = this.oldValue;
    if (this.model.action !== '') { this.model.clear() };
    setDisplay('frame', this.oldValue);
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed feature. */
class ChangeFeature extends Action {
  constructor(model, feature) {
    super();
    this.model = model;
    this.oldValue = model.feature;
    this.newValue = feature.mod(numFeatures);
  }

  do() {
    this.model.feature = this.newValue;
    this.model.clear();
    setDisplay('feature', this.newValue);
  }

  undo() {
    this.model.feature = this.oldValue;
    this.model.clear();
    setDisplay('feature', this.oldValue);
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed channel. */
class ChangeChannel extends Action {
  constructor(model, adjuster, channel) {
    super();
    this.model = model;
    this.adjuster = adjuster;
    this.oldValue = model.channel;
    this.newValue = channel.mod(numChannels);
  }

  do() {
    const promise = setDisplay('channel', this.newValue);
    promise.done( () => {
      this.adjust(this.oldValue, this.newValue);
    });
    // render_info_display();
  }

  undo() {
    const promise = setDisplay('channel', this.oldValue);
    promise.done( () => {
      this.adjust(this.newValue, this.oldValue);
    });
  }

  redo() {
    this.do();
  }

  adjust(oldValue, newValue) {
    // save current display settings before changing
    this.adjuster.brightnessMap.set(oldValue, this.adjuster.brightness);
    this.adjuster.contrastMap.set(oldValue, this.adjuster.contrast);
    this.adjuster.invertMap.set(oldValue, this.adjuster.displayInvert);
    // get brightness/contrast vals for new channel
    this.adjuster.brightness = this.adjuster.brightnessMap.get(newValue);
    this.adjuster.contrast = this.adjuster.contrastMap.get(newValue);
    this.adjuster.displayInvert = this.adjuster.invertMap.get(newValue);

    this.model.clear();
    this.model.channel = newValue;
  }
}

/**
 * Sends a POST request to change the current frame, feature, or channel.
 * Handles the image data in the response.
 *
 * @param {string} displayAttr which attribute to change (e.g. frame, feature, or channel)
 * @param {int} value value to set to attribute
 */
function setDisplay(displayAttr, value) {
  const promise = $.ajax({
    type: 'POST',
    url: `${document.location.origin}/api/changedisplay/${project_id}/${displayAttr}/${value}`,
    async: true
  })
  return promise.done(handlePayload);
}

class BackendAction extends Action {

  constructor(model, action, info) {
    super();
    this.model = model;
    this.action = action;
    this.info = info;
  }

  do() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/edit/${project_id}/${this.action}`,
      data: this.info,
      async: false
    });
    promise.done(this.model.handlePayload);
  }

  undo() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/undo/${project_id}`,
      async: false
    })
    promise.done(this.model.handlePayload);
  }

  redo() {
    const promise = $.ajax({
      type: 'POST',
      url: `${document.location.origin}/api/redo/${project_id}`,
      async: false
    })
    promise.done(this.model.handlePayload);
  }
}

