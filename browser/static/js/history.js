class History{
  constructor() {
    /** @property {Array<Actions|string>} undoStack actions grouped by fenceposts */
    this.undoStack = [];
    /** @property {Array<Actions|string>} redoStack undone actions grouped by fenceposts */
    this.redoStack = [];
  }

  get canUndo() {
    return !this.undoStack.every(v => v === 'fencepost');
  }

  get canRedo() {
    return !this.redoStack.every(v => v === 'fencepost');
  }

  /**
   * Executes an action,
   * adds it to the current group of actions to be undone,
   * and clears the actions to be redone.
   *
   * @param {Action} action
   */
  addAction(action) {
    this.undoStack.push(action);
    action.do();
    this.redoStack = [];
    this.formatButtons();
  }

  /**
   * Executes an action,
   * fences it in to be undone alone,
   * and clears the actions to be redone.
   *
   * @param {Action} action
   */
  addFencedAction(action) {
    this.addFence();
    this.addAction(action);
    this.addFence();
  }

  /**
   * Separates groups of actions.
   * When a fence is added before an action, the action will be the first in a new group,
   * and when a fense is added after, the action will be the last in the group.
   */
  addFence() {
    this.undoStack.push('fencepost')
  }
  /**
   * Undoes the most recent group of actions, if any.
   */
  undo() {
    if (!this.canUndo) return;
    // Pop until we find an action to ensure undo does something
    let action = this.undoStack.pop();
    // Needed to separate action groups on redo stack
    if (action === 'fencepost') {
      this.redoStack.push('fencepost');
    }
    while(this.canUndo && action === 'fencepost') {
      action = this.undoStack.pop();
    }
    // Undo actions until the end of the group or stack
    while(true) {
      this.redoStack.push(action);
      action.undo();
      if (this.undoStack.length === 0) break;
      action = this.undoStack.pop();
      if (action === 'fencepost') {
        // Keep fencepost on top of undo to separate new actions from last undo
        this.addFence()
        break;
      }
    }
    this.formatButtons();
  }

  /**
   * Redoes the most recent group of undone actions, if any.
   */
  redo() {
    if (!this.canRedo) return;
    // Pop until we find an action to ensure redo does something
    let action = this.redoStack.pop();
    while(this.canRedo && action === 'fencepost') {
      action = this.redoStack.pop();
    }
    // Redo actions until the end of the group or stack
    while (true) {
      this.undoStack.push(action);
      action.redo();
      if (this.redoStack.length === 0) break;
      action = this.redoStack.pop();
      if (action === 'fencepost') {
        // Keep fencepost on top of undo stack
        this.addFence()
        break;
      }
    }
    this.formatButtons();
  }

  /**
   * Initializes the action history using the history stored on the backend
   * @param {*} actionFrames frame of each action performed on the project
   * @param {*} initFrame frame displayed at the bottom of the undoStack
   * @param {*} finalFrame frame displayed at the top of the undoStack
   */
  initializeAction(actionFrames, initFrame = 0, finalFrame = current_frame) {
      // Initialize undoStack to with actions recorded on backend
      let prevFrame = initFrame;
      for (let frame of actionFrames) {
        // Display unedited frame before loading edited frame
        if (frame != prevFrame) {
          let action = new ChangeFrame(mode, frame, prevFrame);
          this.undoStack.push(action);
          this.addFence();
          prevFrame = frame;
        }
        let action = new BackendAction();
        this.undoStack.push(action);
        this.addFence();
      }
      // Change to final project frame
      if (prevFrame != current_frame) {
        let action = new ChangeFrame(mode, current_frame, prevFrame);
        this.undoStack.push(action);
        this.addFence();
      }
      this.formatButtons();
  }

  formatButtons() {
    document.getElementById('undo').disabled = !this.canUndo;
    document.getElementById('redo').disabled = !this.canRedo;
  }
}

/**
 * Interface for undoable actions to store in the action history.
 *
 * @interface Action
 */
class Action {

  /**
   * Do the action before storing in the action history
   *
   * @function
   * @name Action#do
   */
  do() {
    console.warn('do() not implemented');
  }

  /**
   * Undo an action in the action history
   *
   * @function
   * @name Action#undo
   */
  undo() {
    console.warn('do() not implemented');
  }

  /**
   * Redo an undone action in the action history
   *
   * @function
   * @name Action#redo
   */
  redo() {
    console.warn('do() not implemented');
  }
}
