/* eslint-disable comma-dangle */
/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign, forwardTo, send } from 'xstate';
import $ from 'jquery';
import backendMachine from './backendMachine';
import adjustMachine from './adjusterMachine';

import {
  ToggleHighlight, ChangeFrame, ChangeFeature, ChangeChannel, BackendAction, Pan, Zoom,
  ChangeContrast, ChangeBrightness, ResetBrightnessContrast,
  ToggleInvert, SelectForeground, SelectBackground, SwapForegroundBackground,
  SetForeground, SetBackground, ResetLabels
} from './actions.js';

const { choose } = actions;
const getModel = () => window.model;
const getCanvas = () => window.model.canvas;

// guards
const leftMouse = (context, event) => event.button === 0;
const rightMouse = (context, event) => event.button === 2;
const shiftLeftMouse = (context, event) => event.button === 0 && event.shiftKey;
const shiftRightMouse = (context, event) => event.button === 2 && event.shiftKey;
const twoLabels = (context, event) => true;

// actions
const updateCanvas = (context, event) => {
  getModel().notifyImageChange();
};

const pan = (context, event) => {
  const zoom = 100 / (getCanvas().zoom * getCanvas().scale);
  window.controller.history.addAction(new Pan(getModel(), event.movementX * zoom, event.movementY * zoom));
};

const editLabels = (context, event) => {
  return $.ajax({
    type: 'POST',
    url: `${document.location.origin}/api/edit/${getModel().projectID}/${event.action}`,
    data: event.args,
    async: true
  })
};

const addToTrace = assign({ trace: context => [...context.trace, [getCanvas().imgY, getCanvas().imgX]] });

const resetTrace = assign({ trace: [] });

const draw = (context) => {
  const args = {
    trace: JSON.stringify(context.trace),
    brush_value: getModel().selected.label,
    target_value: getModel().selected.secondLabel,
    brush_size: getModel().brush.size,
    frame: getModel().frame,
    erase: false
  };
  const action = new BackendAction(getModel(), 'handle_draw', args);
  window.controller.history.addFencedAction(action);
};

const selectLabel = choose([
  {
    cond: (context, event) => event.shiftKey && event.button === 0,
    actions: () => window.controller.history.addAction(new SelectForeground(getModel()))
  },
  {
    cond: (context, event) => event.shiftKey && event.button === 2,
    actions: () => window.controller.history.addAction(new SelectBackground(getModel()))
  }
]);

const swapLabels = () => window.controller.history.addAction(new SwapForegroundBackground(getModel()));

const storeClick = assign({
  storedLabel: () => getCanvas().label,
  storedX: () => getCanvas().imgX,
  storedY: () => getCanvas().imgY
});

const threshold = (context, event) => {
  const args = {
    y1: context.storedY,
    x1: context.storedX,
    y2: getCanvas().imgY,
    x2: getCanvas().imgX,
    frame: getModel().frame,
    label: getModel().selected.label
  };
  const action = new BackendAction(getModel(), 'threshold', args);
  window.controller.history.addFencedAction(action);
};

const flood = () => {
  const args = {
    label: getModel().selected.label,
    x_location: getCanvas().imgX,
    y_location: getCanvas().imgY
  };
  const action = new BackendAction(getModel(), 'flood', args);
  window.controller.history.addFencedAction(action);
};

const trim = () => {
  const args = {
    label: getCanvas().label,
    frame: getModel().frame,
    x_location: getCanvas().imgX,
    y_location: getCanvas().imgY
  };
  const action = new BackendAction(getModel(), 'trim_pixels', args);
  window.controller.history.addFencedAction(action);
};

const erode = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction(getModel(), 'erode', args);
  window.controller.history.addFencedAction(action);
};

const dilate = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction(getModel(), 'dilate', args);
  window.controller.history.addFencedAction(action);
};

const autofit = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction(getModel(), 'active_contour', args);
  window.controller.history.addFencedAction(action);
};

const predictFrame = () => {
  const args = {
    frame: getModel().frame
  };
  const action = new BackendAction(getModel(), 'predict_single', args);
  window.controller.history.addFencedAction(action);
};

const predictAll = () => {
  const args = {};
  const action = new BackendAction(getModel(), 'predict_zstack', args);
  window.controller.history.addFencedAction(action);
};

const swapFrame = () => {
  const args = {
    label_1: getModel().selected.label,
    label_2: getModel().selected.secondLabel,
    frame: getModel().frame
  };
  const action = new BackendAction(getModel(), 'swap_single_frame', args);
  window.controller.history.addFencedAction(action);
};

const replaceFrame = () => {
  const args = {
    label_1: getModel().selected.label,
    label_2: getModel().selected.secondLabel
    // frame: getModel().frame ???
  };
  const action = new BackendAction(getModel(), 'replace_single', args);
  window.controller.history.addFencedAction(action);
};

const replaceAll = () => {
  const args = {
    label_1: getModel().selected.label,
    label_2: getModel().selected.secondLabel
  };
  const action = new BackendAction(getModel(), 'replace', args);
  window.controller.history.addFencedAction(action);
};

const watershed = (context) => {
  const args = {
    frame: getModel().frame,
    label: context.storedLabel,
    x1_location: context.storedX,
    y1_location: context.storedY,
    x2_location: getCanvas().imgX,
    y2_location: getCanvas().imgY
  };
  const action = new BackendAction(getModel(), 'watershed', args);
  window.controller.history.addFencedAction(action);
};

const changeContrast = (context, event) => window.controller.history.addAction(new ChangeContrast(getModel(), event.change));
const changeBrightness = (context, event) => window.controller.history.addAction(new ChangeBrightness(getModel(), event.change));
const toggleHighlight = () => window.controller.history.addAction(new ToggleHighlight(getModel()));
const resetBrightnessContrast = () => window.controller.history.addAction(new ResetBrightnessContrast(getModel()));
const toggleInvert = () => window.controller.history.addAction(new ToggleInvert(getModel()));
const zoom = (context, event) => window.controller.history.addAction(new Zoom(getModel(), event.change));
const updateMousePos = (context, event) => getModel().updateMousePos(event.offsetX, event.offsetY);
const setBrushSize = (context, event) => { getModel().brush.size = event.size };

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
    },
    'keydown.n': {
      actions: () => window.controller.history.addAction(new ResetLabels(getModel()))
    },
    'keydown.[': {
      actions: () => window.controller.history.addAction(new SetForeground(getModel(), getModel().selected.label - 1))
    },
    'keydown.]': {
      actions: () => window.controller.history.addAction(new SetForeground(getModel(), getModel().selected.label + 1))
    },
    'keydown.{': {
      actions: () => window.controller.history.addAction(new SetBackground(getModel(), getModel().selected.secondLabel - 1))
    },
    'keydown.}': {
      actions: () => window.controller.history.addAction(new SetBackground(getModel(), getModel().selected.secondLabel + 1))
    },
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
          cond: () => getCanvas().label !== 0,
          target: 'clicked',
          actions: 'storeClick'
        }
      }
    },
    clicked: {
      on: {
        click: {
          cond: (context) => getCanvas().label === context.storedLabel,
          actions: 'watershed'
        }
      }
    }
  }
};

/**
 * Handles tools to edit the labeling.
 */
const toolbarState = {
  initial: 'paint',
  states: {
    flood: floodState,
    trim: trimState,
    erodeDilate: erodeDilateState,
    autofit: autofitState,
    paint: paintState,
    threshold: thresholdState,
    watershed: watershedState,
    // divide: divideState,
    // flag: flagState,
    hist: { type: 'history' }
  },
  on: {
    LOADING: 'loading',
    'keydown.b': '.paint',
    'keydown.g': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
    // // tools only available in tracking mode
    // 'keydown.p': {
    //   target: '.parent',
    //   in: 'track'
    // },
    // 'keydown.?': {
    //   target: '.flag',
    //   in: 'track'
    // }
    // tools not available in RGB mode
    'keydown.t': {
      target: '.threshold',
      in: '#deepcellLabel.rgb.oneChannel'
    },
    'keydown.m': {
      target: '.autofit',
      in: '#deepcellLabel.rgb.oneChannel'
    },
    'keydown.w': {
      target: '.watershed',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

/**
 * Handles eveything that can edit the labeling.
 */
const mouseState = {
  initial: 'toolbar',
  states: {
    toolbar: toolbarState,
    loading: {
      on: { LOADED: 'toolbar.hist' }
    }
  },
  on: {
    EDIT: {
      actions: forwardTo('backend')
    },
    UNDO: {
      actions: forwardTo('backend')
    },
    REDO: {
      actions: forwardTo('backend')
    },
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
  initial: 'idle',
  states: {
    idle: {
      on: { 'keydown.space': 'pan' }
    },
    pan: {
      on: {
        'keyup.space': 'idle',
        mousemove: {
          actions: 'pan'
        }
      }
    }
  },
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

const frameState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        'keydown.a': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFrame(getModel(), getModel().frame - 1))
        },
        'keydown.left': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFrame(getModel(), getModel().frame - 1))
        },
        'keydown.d': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFrame(getModel(), getModel().frame + 1))
        },
        'keydown.right': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFrame(getModel(), getModel().frame + 1))
        },
        'keydown.c': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeChannel(getModel(), getModel().channel + 1))
        },
        'keydown.C': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeChannel(getModel(), getModel().channel - 1))
        },
        'keydown.f': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFeature(getModel(), getModel().feature + 1))
        },
        'keydown.F': {
          actions: () => window.controller.history.addFencedAction(
            new ChangeFeature(getModel(), getModel().feature - 1))
        },
        LOADING: 'loading',
      }
    },
    loading: {
      on: {
        LOADED: 'idle'
      }
    }
  },
  on: {
    SETFRAME: {
      actions: forwardTo('backend')
    },
  }
};

const confirmState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        'keydown.o': 'predictFrame',
        'keydown.O': 'predictAll',
        'keydown.s': 'swapFrame',
        'keydown.r': 'replaceFrame',
        'keydown.R': 'replaceAll',
      },
    },
    predictFrame: {
      on: {
        'keydown.Enter': {
          actions: 'predictFrame',
        },
        'keydown.Escape': 'idle',
      }
    },
    predictAll: {
      on: {
        'keydown.Enter': {
          actions: 'predictAll',
        },
        'keydown.Escape': 'idle',
      }
    },
    swapFrame: {
      on: {
        'keydown.Enter': {
          actions: 'swapFrame',
        },
        'keydown.Escape': 'idle',
      }
    },
    replaceFrame: {
      on: {
        'keydown.Enter': {
          actions: 'replaceFrame',
        },
        'keydown.Escape': 'idle',
      }
    },
    replaceAll: {
      on: {
        'keydown.Enter': {
          actions: 'replaceAll',
        },
        'keydown.Escape': 'idle',
      }
    },
    loading: {},
  },
  on: {
    LOADING: '.loading',
    LOADED: '.idle',
  }
};

const rgbState = {
  initial: 'oneChannel',
  states: {
    oneChannel: {
      on: {
        TOGGLERGB: {
          target: 'rgb',
          actions: send('TOGGLERGB', { to: 'backend' })
        },
      }
    },
    rgb: {
      on: {
        TOGGLERGB: {
          target: 'oneChannel',
          actions: send('TOGGLERGB', { to: 'backend' })
        },
      }
    },
  }
};

const toolState = {
  initial: 'zstack',
  states: {
    zstack: {
      on: {
        TRACK: 'track',
      }
    },
    track: {},
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
      feature: 0,
    },
    invoke: [
      backendMachine,
      adjustMachine,
    ],
    states: {
      rgb: rgbState,
      tool: toolState,
      adjuster: adjusterState,
      canvas: canvasState,
      select: selectState,
      brush: brushState,
      display: displayState,
      mouse: mouseState,
      frame: frameState,
      confirm: confirmState,
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
