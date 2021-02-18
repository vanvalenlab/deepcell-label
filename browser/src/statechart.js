/**
 * Defines the statechart for Label in XState.
 */

import { Machine, actions, assign, forwardTo, send } from 'xstate';
import backendMachine from './backendMachine';

import {
  BackendAction, ChangeFrame, ChangeFeature, ChangeChannel,
  Pan, Zoom, ToggleHighlight, ToggleInvert,
  ChangeContrast, ChangeBrightness, ResetBrightnessContrast,
  SetForeground, SetBackground, SwapForegroundBackground, ResetLabels,
} from './actions.js';

const { choose } = actions;

// access to other DeepCell Label classes (Model, Canvas, and History)
const getModel = () => window.model;
const getCanvas = () => window.model.canvas;
const addAction = action => { window.controller.history.addAction(action) };
const addFencedAction = action => { window.controller.history.addFencedAction(action) };

// label editing actions
const draw = (context) => {
  const args = {
    trace: JSON.stringify(context.trace),
    brush_value: getModel().foreground,
    target_value: getModel().background,
    brush_size: getModel().size,
    frame: getModel().frame,
    erase: false,
  };
  const action = new BackendAction('handle_draw', args);
  addFencedAction(action);
};

const threshold = (context) => {
  const args = {
    y1: context.storedY,
    x1: context.storedX,
    y2: getCanvas().imgY,
    x2: getCanvas().imgX,
    frame: getModel().frame,
    label: getModel().foreground,
  };
  const action = new BackendAction('threshold', args);
  addFencedAction(action);
};

const flood = () => {
  const args = {
    label: getModel().foreground,
    x_location: getCanvas().imgX,
    y_location: getCanvas().imgY,
  };
  const action = new BackendAction('flood', args);
  addFencedAction(action);
};

const trim = () => {
  const args = {
    label: getCanvas().label,
    frame: getModel().frame,
    x_location: getCanvas().imgX,
    y_location: getCanvas().imgY,
  };
  const action = new BackendAction('trim_pixels', args);
  addFencedAction(action);
};

const erode = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction('erode', args);
  addFencedAction(action);
};

const dilate = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction('dilate', args);
  addFencedAction(action);
};

const autofit = () => {
  const args = {
    label: getCanvas().label
  };
  const action = new BackendAction('active_contour', args);
  addFencedAction(action);
};

const predictFrame = () => {
  const args = {
    frame: getModel().frame
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
    label_1: getModel().foreground,
    label_2: getModel().background,
    frame: getModel().frame
  };
  const action = new BackendAction('swap_single_frame', args);
  addFencedAction(action);
};

const replaceFrame = () => {
  const args = {
    label_1: getModel().foreground,
    label_2: getModel().background,
    // frame: getModel().frame? may need to add if we no longer store frame on backend
  };
  const action = new BackendAction('replace_single', args);
  addFencedAction(action);
};

const replaceAll = () => {
  const args = {
    label_1: getModel().foreground,
    label_2: getModel().background
  };
  const action = new BackendAction('replace', args);
  addFencedAction(action);
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
  const action = new BackendAction('watershed', args);
  addFencedAction(action);
};

// tool states
const paintState = {
  initial: 'idle',
  entry: assign({ trace: [] }),
  states: {
    idle: {
      on: {
        mousedown: {
          // prevents select and paint at the same time
          cond: (_, event) => !event.shiftKey,
          target: 'dragging',
          actions: 'addToTrace'
        }
      }
    },
    dragging: {
      on: {
        mousemove: { actions: 'addToTrace' },
        mouseup: { target: 'idle', actions: 'draw' },
      }
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
        mouseup: [
          {
            target: 'idle',
            cond: 'nonemptyBox',
            actions: 'threshold'
          },
          { target: 'idle' },
        ]
      }
    }
  },
  on: {
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

const floodState = {
  on: {
    click: { actions: 'flood' }
  }
};

const trimState = {
  on: {
    click: { actions: 'trim' }
  }
};

const erodeDilateState = {
  on: {
    mousedown: {
      actions: choose([
        {
          cond: 'leftMouse',
          actions: 'erode'
        },
        {
          cond: 'rightMouse',
          actions: 'dilate'
        }
      ])
    }
  }
};

const autofitState = {
  on: {
    click: { actions: 'autofit' },
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

const watershedState = {
  entry: 'storeClick',
  initial: 'idle',
  states: {
    idle: {
      on: {
        click: {
          cond: 'validSeed',
          target: 'clicked',
          actions: 'storeClick'
        }
      }
    },
    clicked: {
      on: {
        click: {
          cond: 'validSecondSeed',
          actions: 'watershed'
        }
      }
    }
  },
  on: {
    TOGGLERGB: {
      target: 'paint',
      in: '#deepcellLabel.rgb.oneChannel'
    },
  }
};

/**
 * Handles which current tool for mouse behavior.
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
    hist: { type: 'history' }
  },
  on: {
    LOADING: 'loading',
    'keydown.b': '.paint',
    'keydown.g': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
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
 * Handles tool behavior with a loading state.
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
    EDIT: { actions: forwardTo('backend') },
    UNDO: { actions: forwardTo('backend') },
    REDO: { actions: forwardTo('backend') },
  }
};

/**
 * Handles adjustments to the images displayed on the canvas.
 */
const adjusterState = {
  on: {
    SCROLLCONTRAST: { actions: 'changeContrast' },
    SCROLLBRIGHTNESS: { actions: 'changeBrightness' },
    'keydown.h': { actions: 'toggleHighlight' },
    'keydown.0': { actions: 'resetBrightnessContrast' },
    'keydown.i': { actions: 'toggleInvert' }
  }
};

/**
 * Handles moving around the canvas.
 */
const canvasState = {
  initial: 'idle',
  states: {
    idle: {
      on: { 'keydown.space': 'pan' },
    },
    pan: {
      on: {
        'keyup.space': 'idle',
        mousemove: { actions: ['pan', 'updateMousePos'] }
      }
    }
  },
  on: {
    'keydown.-': { actions: send({ type: 'ZOOM', change: -1 }) },
    'keydown.=': { actions: send({ type: 'ZOOM', change: 1 }) },
    ZOOM: { actions: 'zoom' },
    mousemove: { actions: 'updateMousePos' }
  }
};

const brushState = {
  on: {
    'keydown.up': { actions: 'incrementBrushSize' },
    'keydown.down': { actions: 'decrementBrushSize' }
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
        'keydown.a': { actions: 'decrementFrame' },
        'keydown.left': { actions: 'decrementFrame' },
        'keydown.d': { actions: 'incrementFrame' },
        'keydown.right': { actions: 'incrementFrame' },
        'keydown.c': { actions: 'incrementChannel' },
        'keydown.C': { actions: 'decrementChannel' },
        'keydown.f': { actions: 'incrementFeature' },
        'keydown.F': { actions: 'decrementFeature' },
        LOADING: 'loading',
      }
    },
    loading: {
      on: { LOADED: 'idle' }
    }
  },
  on: {
    SETFRAME: { actions: forwardTo('backend') },
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
        'keydown.Enter': { actions: 'predictFrame' },
        'keydown.Escape': 'idle',
      }
    },
    predictAll: {
      on: {
        'keydown.Enter': { actions: 'predictAll' },
        'keydown.Escape': 'idle',
      }
    },
    swapFrame: {
      on: {
        'keydown.Enter': { actions: 'swapFrame' },
        'keydown.Escape': 'idle',
      }
    },
    replaceFrame: {
      on: {
        'keydown.Enter': { actions: 'replaceFrame' },
        'keydown.Escape': 'idle',
      }
    },
    replaceAll: {
      on: {
        'keydown.Enter': { actions: 'replaceAll' },
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

/**
 * Handles selecting labels.
 */
const selectState = {
  on: {
    mousedown: { actions: 'selectLabel' },
    'keydown.x': { actions: 'swapLabels' },
    'keydown.n': { actions: 'resetLabels' },
    'keydown.[': { actions: 'decrementForeground' },
    'keydown.]': { actions: 'incrementForeground' },
    'keydown.{': { actions: 'decrementBackground' },
    'keydown.}': { actions: 'incrementBackground' },
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
    },
    invoke: [
      backendMachine,
    ],
    states: {
      rgb: rgbState,
      adjuster: adjusterState,
      canvas: canvasState,
      select: selectState,
      brush: brushState,
      display: displayState,
      mouse: mouseState,
      frame: frameState,
      confirm: confirmState,
    },
  },
  {
    actions: {
      updateCanvas: () => { getModel().notifyImageChange(); },
      // assign to context
      addToTrace: assign({ trace: context => [...context.trace, [getCanvas().imgY, getCanvas().imgX]] }),
      storeClick: assign({
        storedLabel: () => getCanvas().label,
        storedX: () => getCanvas().imgX,
        storedY: () => getCanvas().imgY,
      }),
      // select labels actions
      selectLabel: choose([
        { cond: 'shiftLeftMouse', actions: () => addAction(new SetForeground(getCanvas().label)) },
        { cond: 'shiftRightMouse', actions: () => addAction(new SetBackground(getCanvas().label)) }
      ]),
      swapLabels: () => addAction(new SwapForegroundBackground()),
      resetLabels: () => addAction(new ResetLabels()),
      decrementForeground: () => addAction(new SetForeground(getModel().foreground - 1)),
      incrementForeground: () => addAction(new SetForeground(getModel().foreground + 1)),
      decrementBackground: () => addAction(new SetBackground(getModel().background - 1)),
      incrementBackground: () => addAction(new SetBackground(getModel().background + 1)),
      // edit labels actions
      draw: draw,
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
      // change frame actions
      decrementFrame: () => addFencedAction(new ChangeFrame(getModel().frame - 1)),
      incrementFrame: () => addFencedAction(new ChangeFrame(getModel().frame + 1)),
      decrementChannel: () => addFencedAction(new ChangeChannel(getModel().channel - 1)),
      incrementChannel: () => addFencedAction(new ChangeChannel(getModel().channel - 1)),
      decrementFeature: () => addFencedAction(new ChangeFeature(getModel().feature - 1)),
      incrementFeature: () => addFencedAction(new ChangeFeature(getModel().feature - 1)),
      // adjuster actions
      changeContrast: (_, event) => addAction(new ChangeContrast(event.change)),
      changeBrightness: (_, event) => addAction(new ChangeBrightness(event.change)),
      toggleHighlight: () => addAction(new ToggleHighlight()),
      resetBrightnessContrast: () => addAction(new ResetBrightnessContrast()),
      toggleInvert: () => addAction(new ToggleInvert()),
      // canvas actions
      pan: (_, event) => {
        const zoom = 100 / (getCanvas().zoom * getCanvas().scale);
        addAction(new Pan(event.movementX * zoom, event.movementY * zoom));
      },
      zoom: (_, event) => addAction(new Zoom(event.change)),
      updateMousePos: (_, event) => getModel().updateMousePos(event.offsetX, event.offsetY),
      // brush actions
      incrementBrushSize: () => { getModel().size += 1 },
      decrementBrushSize: () => { getModel().size -= 1 },
      setBrushSize: (_, event) => { getModel().size = event.size },
    },
    guards: {
      leftMouse: (_, event) => event.button === 0,
      rightMouse: (_, event) => event.button === 2,
      shiftLeftMouse: (_, event) => event.button === 0 && event.shiftKey,
      shiftRightMouse: (_, event) => event.button === 2 && event.shiftKey,
      validSeed: () => getCanvas().label !== 0,
      validSecondSeed: (context) => (
        // same label, different point
        getCanvas().label === context.storedLabel &&
        (getCanvas().imgX !== context.storedX || getCanvas().imgY !== context.storedY)
      ),
      nonemptyBox: (context) => context.storedX !== getCanvas().imgX && context.storedY !== getCanvas().imgY,
    }
  }
);
