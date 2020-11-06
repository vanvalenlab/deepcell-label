class ToggleEdit extends Action {

    do() {
      edit_mode = !edit_mode;
    }

    undo() {
      this.do()
    }

    redo() {
      this.do()
    }
  }

class ToggleHighlight extends Action {

  do() {
    current_highlight = !current_highlight;
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
  constructor(mode, frame) {
    super();
    this.mode = mode;
    this.oldValue = current_frame;
    // frame mod max_frames
    this.newValue = ((frame % max_frames) + max_frames) % max_frames;
  }

  do() {
    setDisplay('frame', this.newValue);
    current_frame = this.newValue;
    if (this.mode.action !== '') { this.mode.clear() };
    render_info_display();
  }


  undo() {
    setDisplay('frame', this.oldValue);
    current_frame = this.oldValue;
    if (this.mode.action !== '') { this.mode.clear() };
    render_info_display();
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed feature. */
class ChangeFeature extends Action {
  constructor(mode, feature) {
    super();
    this.mode = mode;
    this.oldValue = mode.feature;
    // feature mod feature_max
    this.newValue = ((feature % feature_max) + feature_max) % feature_max;
  }

  do() {
    setDisplay('feature', this.newValue);
    this.mode.feature = this.newValue;
    this.mode.clear();
    render_info_display();
  }

  undo() {
    setDisplay('feature', this.oldValue);
    this.mode.feature = this.oldValue;
    this.mode.clear();
    render_info_display();
  }

  redo() {
    this.do();
  }
}

/** Action to change the viewed channel. */
class ChangeChannel extends Action {
  constructor(mode, adjuster, channel) {
    super();
    this.mode = mode;
    this.adjuster = adjuster;
    this.oldValue = mode.channel;
    // channel mod channelMax
    this.newValue = ((channel % channelMax) + channelMax) % channelMax;
  }

  do() {
    setDisplay('channel', this.newValue);
    this.adjust(this.oldValue, this.newValue);
    // render_info_display();
  }

  undo() {
    setDisplay('channel', this.oldValue);
    this.adjust(this.newValue, this.oldValue);
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

    this.mode.clear();
    this.mode.channel = this.newValue;
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
  $.ajax({
    type: 'POST',
    url: `${document.location.origin}/changedisplay/${project_id}/${displayAttr}/${value}`,
    async: true
  }).done(handlePayload);
}

class BackendAction extends Action {

  constructor(action, info) {
    super();
    this.action = action;
    this.info = info;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/edit/${project_id}/${this.action}`,
      data: this.info,
      async: true
    }).done(handlePayload);
  }

  undo() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/undo/${project_id}`,
      async: true
    }).done(handlePayload);
  }

  redo() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/redo/${project_id}`,
      async: true
    }).done(handlePayload);
  }
}

