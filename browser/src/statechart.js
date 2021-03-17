/**
 * Defines the statechart for Label in XState.
 */

import { Machine, assign, forwardTo, send } from 'xstate';
import backendMachine from './backendMachine';

import {
  BackendAction, ChangeFrame, ChangeFeature, ChangeChannel,
  Pan, Zoom, ToggleHighlight, ToggleInvert,
  ChangeContrast, ChangeBrightness, ResetBrightnessContrast,
  SetForeground, SetBackground,
} from './actions.js';
import { Model } from './model';
import { History } from './history';

// tool states

const paintState = {
  initial: 'idle',
  entry: assign({ trace: [] }),
  states: {
    idle: {
      on: {
        mousedown: [
          { cond: 'shift' },
          { target: 'dragging', actions: 'addToTrace' },
        ],
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
  on: {
    'keydown.n': { actions: 'newForeground' },
    'keydown.Escape': { actions: 'resetBackground' },
  },
};

const thresholdState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: { target: 'dragging', actions: 'storeClick' },
      }
    },
    dragging: {
      on: {
        mouseup: { target: 'idle', actions: 'threshold' },
      }
    }
  },
  on: {
    TOGGLERGB: 'select',
  }
};

const floodState = {
  on: {
    click: [
      { cond: 'shift' },
      { cond: 'onBackground', actions: 'flood' },
      { actions: 'selectBackground' },
    ],
  }
};

const trimState = {
  on: {
    click: [
      { cond: 'shift' },
      { cond: 'onNoLabel' },
      { cond: 'onBackground', actions: 'trim' },
      { actions: 'selectBackground' },
    ],
  }
};

const erodeDilateState = {

  on: {
    mousedown: [
      { cond: 'onNoLabel' },
      { cond: 'shift' },
      { cond: 'onBackground', actions: 'erode' },
      { cond: 'onForeground', actions: 'dilate' },
      { actions: 'selectForeground' },
    ],
  },
};

const autofitState = {
  on: {
    mousedown: [
      { cond: 'shift' },
      { cond: 'onNoLabel' },
      { cond: 'onForeground', actions: 'autofit' },
      { actions: 'selectForeground' },
    ],
    TOGGLERGB: 'select',
  }
};

const watershedState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: [
          { cond: 'onNoLabel' },
          { cond: 'shift' },
          { target: 'clicked', actions: ['selectForeground', 'storeClick'] }
        ]
      }
    },
    clicked: {
      on: {
        click: [
          { cond: 'shift' },
          { cond: 'validSecondSeed', target: 'idle', actions: ['watershed', 'newBackground'] },
        ]
      }
    }
  },
  on: {
    TOGGLERGB: 'select',
  }
};

/**
 * Handles which current tool for mouse behavior.
 */
const toolbarState = {
  initial: 'select',
  states: {
    select: {
      on: {
        mousedown: [
          { cond: 'shift' },
          { cond: 'dblclick', actions: ['selectBackground', 'resetForeground'] },
          { cond: 'onForeground', actions: 'selectBackground' },
          { actions: 'selectForeground' },
        ],
      }
    },
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
    'keydown.v': '.select',
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
      on: {
        LOADED: 'toolbar.hist',
        ERROR: 'toolbar.hist',
      }
    },
    pan: {
      on: { 'keyup.Space': 'toolbar.hist' },
    },
  },
  on: {
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
      on: {
        LOADED: 'idle',
        ERROR: 'idle',
      }
    }
  },
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
    ERROR: '.idle',
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
  initial: 'idle',
  states: {
    idle: {
      on: {
        'keydown.Shift': 'select',
      }
    },
    select: {
      on: {
        'keyup.Shift': 'idle',
        mousedown: [
          { cond: 'dblclick', actions: ['selectForeground', 'resetBackground'] },
          { cond: 'onBackground', actions: 'selectForeground', },
          {
            actions: 'selectBackground',
          },
        ]
      },
    },
  },
  on: {
    'keydown.n': { actions: 'newForeground' },
    'keydown.Escape': { actions: 'resetBackground' },
    'keydown.x': { actions: 'swapLabels' },
    'keydown.[': { actions: 'decrementForeground' },
    'keydown.]': { actions: 'incrementForeground' },
    'keydown.{': { actions: 'decrementBackground' },
    'keydown.}': { actions: 'incrementBackground' },
  }
};

const errorState = {
  initial: 'idle',
  states: {
    idle: {},
    error: {},
  },
  on: {
    LOADED: '.idle',
    ERROR: {
      target: '.error',
      actions: assign({ error: (context, event) => event.error })
    },
  }
}

const createLabelMachine = (projectID) => {
  const history = new History();
  const addAction = history.addAction.bind(history);
  const addFencedAction = history.addFencedAction.bind(history);
  return Machine(
    {
      id: 'label',
      type: 'parallel',
      context: {
        projectID,
        trace: [],
        storedLabel: 0,
        storedX: 0,
        storedY: 0,
        error: '',
      },
      invoke: {
        id: 'backend',
        src: backendMachine,
        data: {
          projectID: (context) => context.projectID,
        }
      },
      states: {
        error: errorState,
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
      on: {
        SETFOREGROUND: { actions: 'setForeground' },
        SETBACKGROUND: { actions: 'setBackground' },
        EDIT: { actions: forwardTo('backend') },
        BACKENDUNDO: { actions: forwardTo('backend') },
        BACKENDREDO: { actions: forwardTo('backend') },
        SETFRAME: { actions: forwardTo('backend') },
        UNDO: { actions: ['undo', 'updateMousePos'] },
        REDO: { actions: ['redo', 'updateMousePos'] },
        PROJECTLOADED: { actions: [send('LOADED'), 'createProject'] },
      }
    },
    {
      actions: {
        undo: () => history.undo(),
        redo: () => history.redo(),
        createProject: (_, event) => {
          window.model = new Model(event.project);
          history.initializeHistory(event.project.actionFrames);
        },
        updateCanvas: () => { window.model.notifyImageChange(); },
        // assign to context
        addToTrace: assign({ trace: context => [...context.trace, [window.model.canvas.imgY, window.model.canvas.imgX]] }),
        storeClick: assign({
          storedLabel: () => window.model.canvas.label,
          storedX: () => window.model.canvas.imgX,
          storedY: () => window.model.canvas.imgY,
        }),
        setForeground: (_, event) => {
          // swap foreground and background when selecting background
          if (event.label === window.model.background) {
            addAction(new SetBackground(window.model.foreground));
          }
          addAction(new SetForeground(event.label));
        },
        setBackground: (_, event) => {
          // swap foreground and background when selecting foreground
          if (event.label === window.model.foreground) {
            addAction(new SetForeground(window.model.background));
          }
          addAction(new SetBackground(event.label));
        },
        selectForeground: send(() => ({ type: 'SETFOREGROUND', label: window.model.canvas.label })),
        selectBackground: send(() => ({ type: 'SETBACKGROUND', label: window.model.canvas.label })),
        resetForeground: send(() => ({ type: 'SETFOREGROUND', label: 0 })),
        resetBackground: send(() => ({ type: 'SETBACKGROUND', label: 0 })),
        newForeground: send(() => ({ type: 'SETFOREGROUND', label: window.model.maxLabel + 1 })),
        newBackground: send(() => ({ type: 'SETBACKGROUND', label: window.model.maxLabel + 1 })),
        incrementForeground: send(() => {
          const numLabels = window.model.maxLabel + 1;
          const nextLabel = (window.model.foreground + 1) % numLabels;
          return { type: 'SETFOREGROUND', label: nextLabel };
        }),
        incrementBackground: send(() => {
          const numLabels = window.model.maxLabel + 1;
          const nextLabel = (window.model.background + 1) % numLabels;
          return { type: 'SETBACKGROUND', label: nextLabel };
        }),
        decrementForeground: send(() => {
          const numLabels = window.model.maxLabel + 1;
          const prevLabel = ((window.model.foreground - 1) + numLabels) % numLabels;
          return { type: 'SETFOREGROUND', label: prevLabel };
        }),
        decrementBackground: send(() => {
          const numLabels = window.model.maxLabel + 1;
          const prevLabel = ((window.model.background - 1) + numLabels) % numLabels;
          return { type: 'SETBACKGROUND', label: prevLabel };
        }),
        swapLabels: send(() => ({ type: 'SETFOREGROUND', label: window.model.background })),
        // edit labels actions
        draw: (context) => {
          const args = {
            trace: JSON.stringify(context.trace),
            brush_value: window.model.foreground,
            target_value: window.model.background,
            brush_size: window.model.size,
            frame: window.model.frame,
            erase: false,
          };
          const action = new BackendAction('handle_draw', args);
          addFencedAction(action);
        },
        threshold: (context) => {
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
        },
        flood: () => {
          const args = {
            label: window.model.foreground,
            x_location: window.model.canvas.imgX,
            y_location: window.model.canvas.imgY,
          };
          const action = new BackendAction('flood', args);
          addFencedAction(action);
        },
        erode: () => {
          const args = { label: window.model.canvas.label };
          const action = new BackendAction('erode', args);
          addFencedAction(action);
        },
        dilate: () => {
          const args = {
            label: window.model.canvas.label
          };
          const action = new BackendAction('dilate', args);
          addFencedAction(action);
        },
        autofit: () => {
          const args = {
            label: window.model.canvas.label
          };
          const action = new BackendAction('active_contour', args);
          addFencedAction(action);
        },
        trim: () => {
          const args = {
            label: window.model.canvas.label,
            frame: window.model.frame,
            x_location: window.model.canvas.imgX,
            y_location: window.model.canvas.imgY,
          };
          const action = new BackendAction('trim_pixels', args);
          addFencedAction(action);
        },
        predictFrame: () => {
          const args = {
            frame: window.model.frame
          };
          const action = new BackendAction('predict_single', args);
          addFencedAction(action);
        },
        predictAll: () => {
          const args = {};
          const action = new BackendAction('predict_zstack', args);
          addFencedAction(action);
        },
        swapFrame: () => {
          const args = {
            label_1: window.model.foreground,
            label_2: window.model.background,
            frame: window.model.frame
          };
          const action = new BackendAction('swap_single_frame', args);
          addFencedAction(action);
        },
        replaceFrame: () => {
          const args = {
            label_1: window.model.foreground,
            label_2: window.model.background,
            // frame: window.model.frame? may need to add if we no longer store frame on backend
          };
          const action = new BackendAction('replace_single', args);
          addFencedAction(action);
        },
        replaceAll: () => {
          const args = {
            label_1: window.model.foreground,
            label_2: window.model.background
          };
          const action = new BackendAction('replace', args);
          addFencedAction(action);
        },
        watershed: (context) => {
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
        },
        // change frame actions
        decrementFrame: () => addFencedAction(new ChangeFrame(window.model.frame - 1)),
        incrementFrame: () => addFencedAction(new ChangeFrame(window.model.frame + 1)),
        decrementChannel: () => addFencedAction(new ChangeChannel(window.model.channel - 1)),
        incrementChannel: () => addFencedAction(new ChangeChannel(window.model.channel - 1)),
        decrementFeature: () => addFencedAction(new ChangeFeature(window.model.feature - 1)),
        incrementFeature: () => addFencedAction(new ChangeFeature(window.model.feature - 1)),
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
        dblclick: (_, event) => {
          return event.detail === 2;
        },
        onNoLabel: () => window.model.canvas.label === 0,
        onBackground: () => window.model.canvas.label === window.model.background,
        onForeground: () => window.model.canvas.label === window.model.foreground,
        validSecondSeed: (context) => (
          // same label, different point
          window.model.canvas.label === context.storedLabel &&
          (window.model.canvas.imgX !== context.storedX || window.model.canvas.imgY !== context.storedY)
        ),
      }
    }
  );
}

export default createLabelMachine;
