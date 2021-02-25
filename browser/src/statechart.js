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

// easier access to add to action history
const addAction = action => window.controller.history.addAction(action);

// label editing actions
const draw = (context) => {
  const args = {
    trace: JSON.stringify(context.trace),
    brush_value: window.model.foreground,
    target_value: window.model.background,
    brush_size: window.model.size,
    frame: window.model.frame,
    erase: false,
  };
  const action = new BackendAction('handle_draw', args);
  addAction(action);
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
  addAction(action);
};

const flood = () => {
  const args = {
    label: window.model.foreground,
    x_location: window.model.canvas.imgX,
    y_location: window.model.canvas.imgY,
  };
  const action = new BackendAction('flood', args);
  addAction(action);
};

const trim = () => {
  const args = {
    label: window.model.canvas.label,
    frame: window.model.frame,
    x_location: window.model.canvas.imgX,
    y_location: window.model.canvas.imgY,
  };
  const action = new BackendAction('trim_pixels', args);
  addAction(action);
};

const erode = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('erode', args);
  addAction(action);
};

const dilate = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('dilate', args);
  addAction(action);
};

const autofit = () => {
  const args = {
    label: window.model.canvas.label
  };
  const action = new BackendAction('active_contour', args);
  addAction(action);
};

const predictFrame = () => {
  const args = {
    frame: window.model.frame
  };
  const action = new BackendAction('predict_single', args);
  addAction(action);
};

const predictAll = () => {
  const args = {};
  const action = new BackendAction('predict_zstack', args);
  addAction(action);
};

const swapFrame = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background,
    frame: window.model.frame
  };
  const action = new BackendAction('swap_single_frame', args);
  addAction(action);
};

const replaceFrame = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background,
    // frame: window.model.frame? may need to add if we no longer store frame on backend
  };
  const action = new BackendAction('replace_single', args);
  addAction(action);
};

const replaceAll = () => {
  const args = {
    label_1: window.model.foreground,
    label_2: window.model.background
  };
  const action = new BackendAction('replace', args);
  addAction(action);
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
  addAction(action);
};

// tool states

const paintState = {
  initial: 'idle',
  entry: assign({ trace: [] }),
  states: {
    idle: {
      on: {
        mousedown: [
          { target: 'dragging', actions: 'addToTrace' },
        ]
      }
    },
    dragging: {
      on: {
        mousemove: { actions: 'addToTrace' },
        mouseup: { target: 'done', actions: 'draw' },
      }
    },
    done: {
      always: 'idle',
    }
  },
  on: { 'keydown.b': 'none' },
};

const thresholdState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: [
          { target: 'dragging', actions: 'storeClick' },
        ],
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
    TOGGLERGB: 'none',
    'keydown.t': 'none',
  }
};

const floodState = {
  on: {
    click: { cond: 'shift', actions: 'flood' },
    'keydown.g': 'none',
  }
};

const trimState = {
  on: {
    click: [
      { cond: 'background' },
      { actions: 'trim' },
    ],
    'keydown.k': 'none',
  }
};

const erodeDilateState = {
  on: {
    click: [
      { cond: 'background' },
      { cond: 'shift', actions: 'erode' },
      { actions: 'dilate' },
    ],
    'keydown.q': 'none',
  }
};

const autofitState = {
  on: {
    click: [
      { cond: 'background' },
      { actions: 'autofit' }
    ],
    TOGGLERGB: 'none',
    'keydown.m': 'none',
  }
};

const watershedState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        click: [
          { cond: 'background' },
          { cond: 'shift' },
          { target: 'clicked', actions: 'storeClick' }
        ]
      }
    },
    clicked: {
      on: {
        click: [
          { cond: 'shift' },
          { cond: 'validSecondSeed', actions: 'watershed' }
        ]
      }
    }
  },
  on: {
    TOGGLERGB: 'none',
    'keydown.w': 'none',
  }
};

/**
 * Handles which current tool for mouse behavior.
 */
const toolbarState = {
  initial: 'none',
  states: {
    none: {},
    flood: floodState,
    trim: trimState,
    erodeDilate: erodeDilateState,
    autofit: autofitState,
    paint: paintState,
    threshold: thresholdState,
    watershed: watershedState,
    hist: { type: 'history', history: 'deep' }
  },
  on: {
    'keydown.b': '.paint',
    'keydown.g': '.flood',
    'keydown.k': '.trim',
    'keydown.q': '.erodeDilate',
    // tools not available in RGB mode
    'keydown.t': { target: '.threshold', in: '#label.rgb.oneChannel' },
    'keydown.m': { target: '.autofit', in: '#label.rgb.oneChannel' },
    'keydown.w': { target: '.watershed', in: '#label.rgb.oneChannel' },
    'keydown.Space': 'pan',

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
    },
    pan: {
      on: { 'keyup.Space': 'toolbar.hist' },
    },
  },
  on: {
    EDIT: { actions: [forwardTo('backend'), () => window.controller.history.addFence()] },
    UNDO: { actions: forwardTo('backend') },
    REDO: { actions: forwardTo('backend') },
    LOADING: '.loading',
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
      on: { 'keydown.Space': 'pan' },
    },
    pan: {
      on: {
        'keyup.Space': 'idle',
        mousemove: { actions: ['pan', 'updateMousePos'] }
      }
    }
  },
  on: {
    'keydown.-': { actions: send({ type: 'ZOOM', change: 1 }) },
    'keydown.=': { actions: send({ type: 'ZOOM', change: -1 }) },
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

// TODO: refactor into separate actor machine that receives SETFOREGROUND & SETBACKGROUND events
/**
 * Handles selecting labels.
 */
const selectState = {
  on: {
    mousedown: [
      { in: '#label.mouse.toolbar.watershed.clicked' },
      { cond: 'background', in: '#label.mouse.toolbar.threshold' },
      { in: '#label.mouse.toolbar.threshold', actions: 'setForeground' },
      { cond: 'shift', actions: 'setBackground' },
      { actions: 'setForeground' },
    ],
    'keydown.x': { actions: 'swapLabels' },
    'keydown.n': { actions: 'resetLabels' },
    'keydown.[': { actions: 'decrementForeground' },
    'keydown.]': { actions: 'incrementForeground' },
    'keydown.{': { actions: 'decrementBackground' },
    'keydown.}': { actions: 'incrementBackground' },
  }
};

export const labelMachine = Machine(
  {
    id: 'label',
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
      updateCanvas: () => { window.model.notifyImageChange(); },
      // assign to context
      addToTrace: assign({ trace: context => [...context.trace, [window.model.canvas.imgY, window.model.canvas.imgX]] }),
      storeClick: assign({
        storedLabel: () => window.model.canvas.label,
        storedX: () => window.model.canvas.imgX,
        storedY: () => window.model.canvas.imgY,
      }),
      // select labels actions
      setForeground: () => {
        const label = window.model.canvas.label;
        const foreground = window.model.foreground;
        const background = window.model.background;
        // make foreground and background different labels
        if (label === background) { addAction(new SetBackground(foreground)); }
        addAction(new SetForeground(label));
      },
      setBackground: () => {
        const label = window.model.canvas.label;
        const foreground = window.model.foreground;
        const background = window.model.background;
        // make foreground and background different labels
        if (label === foreground) { addAction(new SetForeground(background)); }
        addAction(new SetBackground(label));
      },
      swapLabels: () => addAction(new SwapForegroundBackground()),
      resetLabels: () => addAction(new ResetLabels()),
      decrementForeground: () => addAction(new SetForeground(window.model.foreground - 1)),
      incrementForeground: () => addAction(new SetForeground(window.model.foreground + 1)),
      decrementBackground: () => addAction(new SetBackground(window.model.background - 1)),
      incrementBackground: () => addAction(new SetBackground(window.model.background + 1)),
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
      decrementFrame: () => addAction(new ChangeFrame(window.model.frame - 1)),
      incrementFrame: () => addAction(new ChangeFrame(window.model.frame + 1)),
      decrementChannel: () => addAction(new ChangeChannel(window.model.channel - 1)),
      incrementChannel: () => addAction(new ChangeChannel(window.model.channel - 1)),
      decrementFeature: () => addAction(new ChangeFeature(window.model.feature - 1)),
      incrementFeature: () => addAction(new ChangeFeature(window.model.feature - 1)),
      // adjuster actions
      changeContrast: (_, event) => addAction(new ChangeContrast(event.change)),
      changeBrightness: (_, event) => addAction(new ChangeBrightness(event.change)),
      toggleHighlight: () => addAction(new ToggleHighlight()),
      resetBrightnessContrast: () => addAction(new ResetBrightnessContrast()),
      toggleInvert: () => addAction(new ToggleInvert()),
      // canvas actions
      pan: (_, event) => {
        const zoom = 100 / (window.model.canvas.zoom * window.model.canvas.scale);
        addAction(new Pan(event.movementX * zoom, event.movementY * zoom));
      },
      zoom: (_, event) => addAction(new Zoom(event.change)),
      updateMousePos: (_, event) => window.model.updateMousePos(event.offsetX, event.offsetY),
      // brush actions
      incrementBrushSize: () => { window.model.size += 1 },
      decrementBrushSize: () => { window.model.size -= 1 },
      setBrushSize: (_, event) => { window.model.size = event.size },
    },
    guards: {
      shift: (_, event) => event.shiftKey,
      background: () => window.model.canvas.label === 0,
      validSecondSeed: (context) => (
        // same label, different point
        window.model.canvas.label === context.storedLabel &&
        (window.model.canvas.imgX !== context.storedX || window.model.canvas.imgY !== context.storedY)
      ),
      nonemptyBox: (context) => context.storedX !== window.model.canvas.imgX && context.storedY !== window.model.canvas.imgY,
    }
  }
);
