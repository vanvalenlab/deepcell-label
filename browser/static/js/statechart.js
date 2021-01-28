/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign } from 'xstate';
import $ from 'jquery';

import {
  ToggleHighlight, ChangeFrame, ChangeFeature, ChangeChannel, BackendAction, Pan, Zoom,
  ChangeContrast, ChangeBrightness, ResetBrightnessContrast,
  ToggleInvert, SelectForeground, SelectBackground, SwapForegroundBackground,
  SetForeground, SetBackground, ResetLabels
} from './actions.js';

const { choose } = actions;
const model = window.model;
const canvas = window.canvas;

// TODO:
// undo/redo with backend promises
// ChangeFrame/Feature/Channel

// KEYBINDS
// watershed
// replace/swap after current frame

// guards
const leftMouse = (context, event) => event.button === 0;
const rightMouse = (context, event) => event.button === 2;
const shiftLeftMouse = (context, event) => event.button === 0 && event.shiftKey;
const shiftRightMouse = (context, event) => event.button === 2 && event.shiftKey;
const twoLabels = (context, event) => true;

// actions
const updateCanvas = (context, event) => {
  model.notifyImageChange();
};

const pan = (context, event) => {
  const zoom = 100 / (canvas.zoom * canvas.scale);
  window.controller.history.addAction(new Pan(model, event.movementX * zoom, event.movementY * zoom));
};

const editLabels = (context, event) => {
  return $.ajax({
    type: 'POST',
    url: `${document.location.origin}/api/edit/${model.projectID}/${event.action}`,
    data: event.args,
    async: true
  })
};

const addToTrace = assign({ trace: context => [...context.trace, [canvas.imgY, canvas.imgX]] });

const resetTrace = assign({ trace: [] });

const draw = (context) => {
  const args = {
    trace: JSON.stringify(context.trace),
    brush_value: model.selected.label,
    target_value: model.selected.secondLabel,
    brush_size: model.brush.size,
    frame: model.frame,
    erase: false
  };
  const action = new BackendAction(model, 'handle_draw', args);
  window.controller.history.addFencedAction(action);
};

const selectLabel = choose([
  {
    cond: (context, event) => event.shiftKey && event.button === 0,
    actions: () => window.controller.history.addAction(new SelectForeground(model))
  },
  {
    cond: (context, event) => event.shiftKey && event.button === 2,
    actions: () => window.controller.history.addAction(new SelectBackground(model))
  }
]);

const swapLabels = () => window.controller.history.addAction(new SwapForegroundBackground(model));

const storeClick = assign({
  storedLabel: () => model.canvas.label,
  storedX: () => model.canvas.imgX,
  storedY: () => model.canvas.imgY
});

const threshold = (context, event) => {
  const args = {
    y1: context.storedY,
    x1: context.storedX,
    y2: model.canvas.imgY,
    x2: model.canvas.imgX,
    frame: model.frame,
    label: model.selected.label
  };
  const action = new BackendAction(model, 'threshold', args);
  window.controller.history.addFencedAction(action);
};

const flood = () => {
  const args = {
    label: model.selected.label,
    x_location: model.canvas.imgX,
    y_location: model.canvas.imgY
  };
  const action = new BackendAction(model, 'flood', args);
  window.controller.history.addFencedAction(action);
};

const trim = () => {
  const args = {
    label: model.canvas.label,
    frame: model.frame,
    x_location: model.canvas.imgX,
    y_location: model.canvas.imgY
  };
  const action = new BackendAction(model, 'trim_pixels', args);
  window.controller.history.addFencedAction(action);
};

const erode = () => {
  const args = {
    label: model.canvas.label
  };
  const action = new BackendAction(model, 'erode', args);
  window.controller.history.addFencedAction(action);
};

const dilate = () => {
  const args = {
    label: model.canvas.label
  };
  const action = new BackendAction(model, 'dilate', args);
  window.controller.history.addFencedAction(action);
};

const autofit = () => {
  const args = {
    label: model.canvas.label
  };
  const action = new BackendAction(model, 'active_contour', args);
  window.controller.history.addFencedAction(action);
};

const predictFrame = () => {
  const args = {
    frame: model.frame
  };
  const action = new BackendAction(model, 'predict_single', args);
  window.controller.history.addFencedAction(action);
};

const predictAll = () => {
  const args = {};
  const action = new BackendAction(model, 'predict_zstack', args);
  window.controller.history.addFencedAction(action);
};

const swapFrame = () => {
  const args = {
    label_1: model.selected.label,
    label_2: model.selected.secondLabel,
    frame: model.frame
  };
  const action = new BackendAction(model, 'swap_single_frame', args);
  window.controller.history.addFencedAction(action);
};

const replaceFrame = () => {
  const args = {
    label_1: model.selected.label,
    label_2: model.selected.secondLabel
    // frame: model.frame ???
  };
  const action = new BackendAction(model, 'replace_single', args);
  window.controller.history.addFencedAction(action);
};

const replaceAll = () => {
  const args = {
    label_1: model.selected.label,
    label_2: model.selected.secondLabel
  };
  const action = new BackendAction(model, 'replace', args);
  window.controller.history.addFencedAction(action);
};

const watershed = (context) => {
  const args = {
    frame: model.frame,
    label: context.storedLabel,
    x1_location: context.storedX,
    y1_location: context.storedY,
    x2_location: model.canvas.imgX,
    y2_location: model.canvas.imgY
  };
  const action = new BackendAction(model, 'watershed', args);
  window.controller.history.addFencedAction(action);
};

const changeContrast = (context, event) => window.controller.history.addAction(new ChangeContrast(model, event.change));
const changeBrightness = (context, event) => window.controller.history.addAction(new ChangeBrightness(model, event.change));
const toggleHighlight = () => window.controller.history.addAction(new ToggleHighlight(model));
const resetBrightnessContrast = () => window.controller.history.addAction(new ResetBrightnessContrast(model));
const toggleInvert = () => window.controller.history.addAction(new ToggleInvert(model));

const zoom = (context, event) => window.controller.history.addAction(new Zoom(model, event.change));
const updateMousePos = (context, event) => model.updateMousePos(event.offsetX, event.offsetY);

const setBrushSize = (context, event) => { model.brush.size = event.size };

const panState = {
  initial: 'idle',
  states: {
    idle: {
      on: { mousedown: 'panning' }
    },
    panning: {
      on: {
        mouseup: 'idle',
        mousemove: {
          actions: 'pan'
        }
      }
    }
  },
  on: {
    'keyup.space': {
      target: 'edit.hist'
    }
  }
};

const loadEditState = {
  invoke: {
    id: 'backend',
    src: (context, event) => {
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/edit/${model.projectID}/${event.action}`,
        data: event.args,
        async: true
      })
    },
    onDone: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event),
        (_, event) => model.handlePayload(event.data)
        // () => window.controller.history.addFence(),
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data)
      ]
    }
  }
};

const loadFrameState = {
  invoke: {
    id: 'loadFrame',
    src: (context, event) => {
      model[event.dimension] = event.value;
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/changedisplay/${model.projectID}/${event.dimension}/${event.value}`,
        async: true
      })
    },
    onDone: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event),
        (_, event) => model.handlePayload(event.data)
        // () => window.controller.history.addFence(),
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data)
      ]
    }
  }
};

const undoState = {
  invoke: {
    id: 'undo',
    src: (context, event) => {
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/undo/${model.projectID}`,
        async: true
      })
    },
    onDone: {
      target: 'edit.hist',
      actions: [
        // () => window.controller.history.undo(),
        (_, event) => console.log(event),
        (_, event) => model.handlePayload(event.data)
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data)
      ]
    }
  }
};

const redoState = {
  invoke: {
    id: 'redo',
    src: (context, event) => {
      return $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/redo/${model.projectID}`,
        async: true
      })
    },
    onDone: {
      target: 'edit.hist',
      actions: [
        // () => window.controller.history.redo(),
        (_, event) => console.log(event),
        (_, event) => model.handlePayload(event.data)
      ]
    },
    onError: {
      target: 'edit.hist',
      actions: [
        (_, event) => console.log(event.data)
      ]
    }
  }
};

const paintState = {
  initial: 'idle',
  entry: 'resetTrace',
  states: {
    idle: {
      on: {
        mousedown: {
          cond: (context, event) => event.button === 0 && !event.shiftKey,
          target: 'dragging',
          actions: 'addToTrace'
        }
      }
    },
    dragging: {
      on: {
        mousemove: {
          actions: 'addToTrace'
        },
        mouseup: {
          actions: 'draw'
        }
      }
    }
  }
};

const selectState = {
  on: {
    mousedown: {
      actions: 'selectLabel'
    },
    'keydown.x': {
      actions: 'swapLabels'
    }
  }
};

const thresholdState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: {
          target: 'dragging',
          actions: 'storeClick'
        }
      }
    },
    dragging: {
      on: {
        mouseup: {
          actions: 'threshold'
        }
      }
    }
  }
};

const floodState = {
  on: {
    click: {
      actions: 'flood'
    }
  }
};

const trimState = {
  on: {
    click: {
      actions: 'trim'
    }
  }
};

const erodeDilateState = {
  on: {
    mousedown: {
      actions: choose([
        {
          cond: (context, event) => event.button === 0,
          actions: 'erode'
        },
        {
          cond: (context, event) => event.button === 2,
          actions: 'dilate'
        }
      ])
    }
  }
};

const autofitState = {
  on: {
    click: {
      actions: 'autofit'
    }
  }
};

const watershedState = {
  entry: 'storeClick',
  initial: 'idle',
  states: {
    idle: {
      on: {
        click: {
          cond: () => canvas.label !== 0,
          target: 'clicked',
          actions: 'storeClick'
        }
      }
    },
    clicked: {
      on: {
        click: {
          cond: (context) => canvas.label === context.storedLabel,
          actions: 'watershed'
        }
      }
    }
  }
};

const editState = {
  initial: 'paint',
  states: {
    paint: paintState,
    threshold: thresholdState,
    flood: floodState,
    trim: trimState,
    erodeDilate: erodeDilateState,
    autofit: autofitState,
    watershed: watershedState,
    hist: { type: 'history' }
  },
  on: {
    'keydown.o': {
      actions: 'predictFrame'
    },
    'keydown.O': {
      actions: 'predictAll'
    },
    'keydown.s': {
      // cond: () => true, // two different labels selected
      actions: 'swapFrame'
    },
    'keydown.r': {
      // cond: () => true, // two different labels selected
      actions: 'replaceFrame'
    },
    'keydown.R': {
      // cond: () => true, // two different labels selected
      actions: 'replaceAll'
    },
    'keydown.a': {
      actions: () => window.controller.history.addFencedAction(new ChangeFrame(model, model.frame - 1))
    },
    'keydown.left': {
      actions: () => window.controller.history.addFencedAction(new ChangeFrame(model, model.frame - 1))
    },
    'keydown.d': {
      actions: () => window.controller.history.addFencedAction(new ChangeFrame(model, model.frame + 1))
    },
    'keydown.right': {
      actions: () => window.controller.history.addFencedAction(new ChangeFrame(model, model.frame + 1))
    },
    'keydown.c': {
      actions: () => window.controller.history.addFencedAction(new ChangeChannel(model, model.channel + 1))
    },
    'keydown.C': {
      actions: () => window.controller.history.addFencedAction(new ChangeChannel(model, model.channel - 1))
    },
    'keydown.f': {
      actions: () => window.controller.history.addFencedAction(new ChangeFeature(model, model.feature + 1))
    },
    'keydown.F': {
      actions: () => window.controller.history.addFencedAction(new ChangeFeature(model, model.feature - 1))
    },
    'keydown.n': {
      actions: () => window.controller.history.addAction(new ResetLabels(model))
    },
    'keydown.[': {
      actions: () => window.controller.history.addAction(new SetForeground(model, model.selected.label - 1))
    },
    'keydown.]': {
      actions: () => window.controller.history.addAction(new SetForeground(model, model.selected.label + 1))
    },
    'keydown.{': {
      actions: () => window.controller.history.addAction(new SetBackground(model, model.selected.secondLabel - 1))
    },
    'keydown.}': {
      actions: () => window.controller.history.addAction(new SetBackground(model, model.selected.secondLabel + 1))
    },
    UNDO: { actions: () => window.controller.history.undo() },
    REDO: { actions: () => window.controller.history.redo() },
    // internal transitions
    'keydown.b': '.paint',
    'keydown.t': '.threshold',
    'keydown.g': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
    'keydown.m': '.autofit',
    'keydown.w': '.watershed',
    // external transitions
    'keydown.space': 'pan',
    EDIT: 'loadEdit',
    SETFRAME: 'loadFrame',
    UNDO: 'undo',
    REDO: 'redo'
  }
};

const adjusterState = {
  on: {
    SCROLLCONTRAST: {
      actions: 'changeContrast'
    },
    SCROLLBRIGHTNESS: {
      actions: 'changeBrightness'
    },
    'keydown.h': {
      actions: 'toggleHighlight'
    },
    'keydown.0': {
      actions: 'resetBrightnessContrast'
    },
    'keydown.i': {
      actions: 'toggleInvert'
    }
  }
};

const canvasState = {
  on: {
    ZOOM: {
      actions: 'zoom'
    },
    mousemove: {
      actions: 'updateMousePos'
    }
  }
};

const brushState = {
  on: {
    SETSIZE: {
      actions: 'setBrushSize'
    }
  }
};

const displayState = {
  initial: 'overlay',
  states: {
    overlay: {
      on: {
        'keydown.z': {
          target: 'labels',
          actions: 'updateCanvas'
        }
      }
    },
    labels: {
      on: {
        'keydown.z': {
          target: 'raw',
          actions: 'updateCanvas'
        }
      }
    },
    raw: {
      on: {
        'keydown.z': {
          target: 'overlay',
          actions: 'updateCanvas'
        }
      }
    }
  }
}

const labelState = {
  initial: 'edit',
  states: {
    edit: editState,
    pan: panState,
    loadEdit: loadEditState,
    loadFrame: loadFrameState,
    undo: undoState,
    redo: redoState
  }
};

export const deepcellLabelMachine = Machine(
  {
    id: 'deepcellLabel',
    type: 'parallel',
    context: {
      trace: [],
      storedLabel: 0,
      storedX: 0,
      storedY: 0,
      frame: 0,
      channel: 0,
      feature: 0
    },
    states: {
      label: labelState,
      display: displayState,
      adjuster: adjusterState,
      canvas: canvasState,
      select: selectState,
      brush: brushState
    }
  },
  {
    actions: {
      updateCanvas: updateCanvas,
      pan: pan,
      editLabels: editLabels,
      addToTrace: addToTrace,
      resetTrace: resetTrace,
      draw: draw,
      selectLabel: selectLabel,
      swapLabels: swapLabels,
      storeClick: storeClick,
      threshold: threshold,
      flood: flood,
      erode: erode,
      dilate: dilate,
      autofit: autofit,
      trim: trim,
      predictFrame: predictFrame,
      predictAll: predictAll,
      swapFrame: swapFrame,
      replaceFrame: replaceFrame,
      replaceAll: replaceAll,
      watershed: watershed,
      changeContrast: changeContrast,
      changeBrightness: changeBrightness,
      toggleHighlight: toggleHighlight,
      resetBrightnessContrast: resetBrightnessContrast,
      toggleInvert: toggleInvert,
      zoom: zoom,
      updateMousePos: updateMousePos,
      setBrushSize: setBrushSize
    },
    guards: {
      leftMouse: leftMouse,
      rightMouse: rightMouse,
      shiftLeftMouse: shiftLeftMouse,
      shiftRightMouse: shiftRightMouse,
      twoLabels: twoLabels
    }
  }
);
