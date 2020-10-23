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

class ChangeFrame {
  constructor(dFrame) {
    this.prev_frame = current_frame;
    this.frame = (current_frame + dFrame) % max_frames;
  }
  
  do() {
    $.ajax({
      type: 'GET',
      url: `${document.location.origin}/frame/${this.frame}/${project_id}`,
      success: function(payload) {
        adjuster.rawLoaded = false;
        adjuster.segLoaded = false;
  
        // load new value of seg_array
        // array of arrays, contains annotation data for frame
        state.segArray = payload.seg_arr;
        adjuster.segImage.src = payload.segmented;
        adjuster.rawImage.src = payload.raw;
  
        // actions must start and end on the same frame
        if (mode.action !== '') { mode.clear() };
      },
      async: false
    });
    current_frame = this.frame;
    render_info_display();
  }

  undo() {
    backendUndo();
    current_frame = this.prev_frame;
    render_info_display();
  }

  redo() {
    backendRedo();
    current_frame = this.frame;
    render_info_display();
  }
}

// TODO: implement change view route
// TODO: finish change view class
class ChangeView {

  constructor(view, current, change) {
    this.view = view;
    // this.prev_value = current;
    // this.value
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/action/${project_id}/${this.action}/${this.frame}`,
      data: this.info,
      success: handlePayload,
      async: false
    });
  }

  undo() {
    backendUndo()
  }

  redo() {
    backendRedo()
  }
}

// TODO: adapt this class to only handle label editing actions
class BackendAction {

  constructor(action, info, frame = current_frame) {
    this.action = action;
    this.info = info;
    this.frame = frame;
  }

  do() {
    $.ajax({
      type: 'POST',
      url: `${document.location.origin}/action/${project_id}/${this.action}/${this.frame}`,
      data: this.info,
      success: handlePayload,
      async: false
    });
  }

  undo() {
    backendUndo()
  }

  redo() {
    backendRedo()
  }
}

