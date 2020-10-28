class ToggleEdit {

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

class ToggleHighlight {

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
class ChangeFrame {
  constructor(mode, frame) {
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
class ChangeFeature {
  constructor(mode, feature) {
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
class ChangeChannel {
  constructor(mode, adjuster, channel) {
    this.mode = mode;
    this.adjuster = adjuster;
    this.oldValue = mode.channel;
    // channel mode channelMax
    this.newValue = ((channel % channel_max) + channel_max) % channel_max;
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
    adjuster.brightnessMap.set(oldValue, adjuster.brightness);
    adjuster.contrastMap.set(oldValue, adjuster.contrast);
    adjuster.invertMap.set(oldValue, adjuster.displayInvert);
    this.mode.clear();
    // get brightness/contrast vals for new channel
    adjuster.brightness = adjuster.brightnessMap.get(newValue);
    adjuster.contrast = adjuster.contrastMap.get(newValue);
    adjuster.displayInvert = adjuster.invertMap.get(newValue);
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
    type: 'GET',
    url: `${document.location.origin}/changedisplay/${project_id}/${displayAttr}/${value}`,
    success: handlePayload,
    async: false
  });
}

// TODO: adapt this class to only handle label editing actions
class BackendAction {

  constructor(action, info) {
    this.action = action;
    this.info = info;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/edit/${project_id}/${this.action}`,
      data: this.info,
      success: handlePayload,
      async: false
    });
  }

  undo() {
    backendUndo();
  }

  redo() {
    backendRedo();
  }
}

