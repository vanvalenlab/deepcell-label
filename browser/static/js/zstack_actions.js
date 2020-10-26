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

class ChangeFrame {

  constructor(mode, frame) {
    this.mode = mode;
    this.oldValue = current_frame;
    // frame mod max_frames
    this.newValue = ((frame % max_frames) + max_frames) % max_frames;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/changeview/${project_id}/frame/${this.newValue}`,
      success: handlePayload,
      async: false
    });
    current_frame = this.newValue;
    this.reset_action()
  }


  undo() {
    backendUndo();
    current_frame = this.oldValue;
    this.reset_action()
    render_info_display();
  }

  redo() {
    backendRedo();
    current_frame = this.newValue;
    this.reset_action()
    render_info_display();
  }

  reset_action() {
    // actions need to start and end on the same frame
    if (this.mode.action !== '') { this.mode.clear() };
  }
}

class ChangeFeature {
  constructor(mode, feature) {
    this.mode = mode;
    this.oldValue = mode.feature;
    // feature mod feature_max
    this.newValue = ((feature % feature_max) + feature_max) % feature_max;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/changeview/${project_id}/feature/${this.newValue}`,
      success: handlePayload,
      async: false
    });
    this.mode.feature = this.newValue;
    this.mode.clear();
  }

  undo() {
    backendUndo();
    this.mode.feature = this.oldValue;
  }

  redo() {
    backendRedo();
    this.mode.feature = this.newValue;
  }
}

class ChangeChannel {
  constructor(mode, adjuster, channel) {
    this.mode = mode;
    this.adjuster = adjuster;
    this.oldValue = mode.channel;
    // channel mode channelMax
    this.newValue = ((channel % channelMax) + channelMax) % channelMax;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/changeview/${project_id}/channel/${this.newValue}`,
      success: handlePayload,
      async: false
    });
    this.mode.clear();
    this.adjust(this.oldValue, this.newValue);
  }

  undo() {
    backendUndo();
    this.adjust(this.newValue, this.oldValue);
  }

  reddo() {
    backendRedo();
    this.adjust(this.oldValue, this.newValue);
  }

  adjust(oldValue, newValue) {
    // save current display settings before changing
    adjuster.brightnessMap.set(oldValue, adjuster.brightness);
    adjuster.contrastMap.set(oldValue, adjuster.contrast);
    adjuster.invertMap.set(oldValue, adjuster.displayInvert);
    // get brightness/contrast vals for new channel
    adjuster.brightness = adjuster.brightnessMap.get(newValue);
    adjuster.contrast = adjuster.contrastMap.get(newValue);
    adjuster.displayInvert = adjuster.invertMap.get(newValue);
  }
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

