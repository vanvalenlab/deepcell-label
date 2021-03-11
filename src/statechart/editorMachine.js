import { Machine, assign, spawn } from 'xstate';

const draw = (context) => {
  const args = {
    trace: JSON.stringify(context.trace),
    brush_value: window.model.foreground,
    target_value: window.model.background,
    brush_size: window.model.size, // TODO: where to pull from
    frame: window.model.frame,
    erase: false,
  };
  const action = new BackendAction('handle_draw', args);
  addFencedAction(action);
};

const threshold = (context) => {
  const args = {
    y1: context.storedY,
    x1: context.storedX,
    y2: window.model.canvas.imgY,
    x2: window.model.canvas.imgX,
    frame: window.model.frame,
    label: window.model.foreground,
  };
  const action = new BackendAction('threshold', args);
  addFencedAction(action);
};

const flood = () => {
  const args = {
    label: window.model.foreground,
    x_location: window.model.canvas.imgX,
    y_location: window.model.canvas.imgY,
  };
  const action = new BackendAction('flood', args);
  addFencedAction(action);
};

const trim = () => {
  const args = {
    label: window.model.canvas.label,
    frame: window.model.frame,
    x_location: window.model.canvas.imgX,
    y_location: window.model.canvas.imgY,
  };
  const action = new BackendAction('trim_pixels', args);
  addFencedAction(action);
};

const erode = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('erode', args);
  addFencedAction(action);
};

const dilate = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('dilate', args);
  addFencedAction(action);
};

const autofit = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('active_contour', args);
  addFencedAction(action);
};

const predictFrame = () => {
  const args = {
    frame: window.model.frame
  };
  const action = new BackendAction('predict_single', args);
  addFencedAction(action);
};

const predictAll = () => {
  const args = {};
  const action = new BackendAction('predict_zstack', args);
  addFencedAction(action);
};

const swapFrame = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background,
    frame: window.model.frame
  };
  const action = new BackendAction('swap_single_frame', args);
  addFencedAction(action);
};

const replaceFrame = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background,
    // frame: window.model.frame? may need to add if we no longer store frame on backend
  };
  const action = new BackendAction('replace_single', args);
  addFencedAction(action);
};

const replaceAll = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background
  };
  const action = new BackendAction('replace', args);
  addFencedAction(action);
};

const watershed = (context) => {
  const args = {
    frame: window.model.frame,
    label: context.storedLabel,
    x1_location: context.storedX,
    y1_location: context.storedY,
    x2_location: window.model.canvas.imgX,
    y2_location: window.model.canvas.imgY
  };
  const action = new BackendAction('watershed', args);
  addFencedAction(action);
};

const editMachine = Machine(
  {
    id: 'backend',
    initial: 'idle',
    context: {
      data: null,
      error: null,
      sliceRef: spawn(),
      selectedRef: spawn(),
      cursorRef: spawn(),
      actionRef: null,
    },
    states: { idle: {} },
    on: {
      paint:
    }
  },
  {
    actions:
  }
