import { Machine, assign, sendParent, actions, spawn, send, forwardTo } from 'xstate';

const { pure } = actions;

// tool states

const brushState = {
  initial: 'idle',
  invoke: {
    src: 'listenForBrushHotkeys',
  },
  states: {
    idle: {
      entry: assign({ trace: [] }),
      on: {
        mousedown: [
          { cond: 'shift' },
          { target: 'dragging', actions: 'addToTrace' },
        ],
      }
    },
    dragging: {
      on: {
        COORDINATES: { actions: ['updateCoordinates', 'updateLabel', 'addToTrace'] },
        mouseup: { target: 'done', actions: 'paint' }
      }
    },
    done: {
      always: 'idle',
    }
  },
  on: {
    INCREASE_BRUSH_SIZE: { actions: assign({ brushSize: (context) => context.brushSize + 1 }) },
    DECREASE_BRUSH_SIZE: { actions: assign({ brushSize: (context) => Math.max(1, context.brushSize - 1) }) },
  },
};

const thresholdMachine = Machine(
  {
    initial: 'idle',
    context: {
      firstPoint: (0, 0),
      x: 0,
      y: 0,
    },
    states: {
      idle: {
        on: {
          mousedown: { target: 'dragging', actions: 'storeClick' },
        }
      },
      dragging: {
        on: {
          mouseup: 'done',
        }
      },
      done: {
        type: 'final',
        entry: 'sendThreshold',
        always: 'idle',
      }
    },
    on: {
      UPDATE: { actions: 'updatePoint' },
    }
  },
  {
    actions: {
      'storePoint': assign({ firstPoint: (context) => (context.x, context.y) }),
      'updatePoint': assign({ x: (context, event) => event.x, y: (context, event) => event.y }),
      'sendThreshold': sendParent((context) => ({
        type: 'THRESHOLD',
        firstPoint: context.firstPoint,
        secondPoint: (context.x, context.y),
      })),
    }
  }
);

// const floodMachine = Machine({
//   initial: 'idle',
//   context: {
//     background: 0,
//   }
//   states: {
//     idle: {
//       on: {
//         click: [
//           { cond: 'onBackground', actions: 'flood' },
//           { actions: 'selectBackground' },
//         ]
//       },
//     ],
//     },
//     done: {
//       type: 'final',
//       always: 'idle',
//     }
//   }
//   on: {
//     click: [
//       { cond: 'shift' },
//       { cond: 'onBackground', actions: 'flood' },
//       { actions: 'selectBackground' },
//     ],
//   }
// },
//   {
  
// });

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

// const watershedMachine = Machine(
//   {
//     initial: 'idle',
//     context: {
//       storedPoint: (0, 0),
//     }
//     states: {
//       idle: {
//         on: {
//           mousedown: [
//             { cond: 'onNoLabel' },
//             { cond: 'shift' },
//             { target: 'clicked', actions: ['selectForeground', 'storeClick'] }
//           ]
//         }
//       },
//       clicked: {
//         on: {
//           click: [
//             { cond: 'shift' },
//             { cond: 'validSecondSeed', target: 'idle', actions: ['watershed', 'newBackground'] },
//           ]
//         }
//       }
//     },
//     on: {
//       TOGGLERGB: 'select',
//     }
//   },
//   {
  
//   }
// );

// to use for visualizer where we can only select the foreground
const tempSelectState = {
  on: {
    mousedown: [
      { cond: 'onForeground', actions: send({ type: 'SETFOREGROUND', foreground: 0 }) },
      { actions: send(({ label }) => ({ type: 'SETFOREGROUND', foreground: label })) },
    ]
  }
};


const selectState = {
  on: {
    mousedown: [
      { cond: 'doubleClick', actions: ['selectBackground', send('SETFOREGROUND', { foreground: 0 })] },
      { cond: 'onForeground', actions: 'selectBackground', },
      { actions: 'selectForeground' },
    ]
  },
};

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
      // tool: null,
      // tools: {},
      foreground: 1,
      background: 0,
      x: 0,
      y: 0,
      label: 0,
      frame: 0,
      feature: 0,
      channel: 0,
      brushSize: 5,
      trace: [],
    },
    // entry: assign(() => {
    //   const brushActor = spawn(brushMachine, 'brush');
    //   return {
    //     tools: {
    //       paint: brushActor,
    //     },
    //     tool: brushActor,
    //   }
    // }),
    invoke: {
      src: 'listenForToolHotkeys',
    },
    initial: 'brush',
    states: {
      // select: tempSelectState,
      select: selectState,
      brush: brushState,
      // flood: floodState,
      trim: trimState,
      erodeDilate: erodeDilateState,
      autofit: autofitState,
      // threshold: thresholdState,
      // watershed: watershedState,
      // history: { type: 'history.deep' } // allows us to return to the current step of an action when selecting in between
    },
    on: {
      USE_BRUSH: '.brush',
      USE_SELECT: '.select',
      // USE_THRESHOLD: '.threshold',
      // USE_FLOOD: '.flood',
      USE_TRIM: '.trim',
      USE_ERODE_DILATE: '.erodeDilate',
      USE_AUTOFIT: '.autofit',
      // USE_WATERSHED: '.watershed',
      
      // updates from other actors
      COORDINATES: { actions: ['updateCoordinates', 'updateLabel'] },
      LABELEDARRAY: { actions: ['updateLabeledArray', 'updateLabel'] },
      FRAME: { actions: assign((context, event) => ({ frame: event.frame })) },
      CHANNEL: { actions: assign((context, event) => ({ channel: event.channel })) },
      FEATURE: { actions: assign((context, event) => ({ feature: event.feature })) },
      
      // events sent by tool actor (this actor)
      PAINT: { actions: 'paint' },
      THRESHOLD: { actions: 'threshold' },
      SETFOREGROUND: { actions: 'setForeground' },
      SETBACKGROUND: { actions: 'setBackground' },
      INCREASE_BRUSH_SIZE: { actions: assign({ brushSize: (context) => context.brushSize + 1 }) },
      DECREASE_BRUSH_SIZE: { actions: assign({ brushSize: (context) => Math.max(1, context.brushSize - 1) }) },

      // special shift click event 
      SHIFTCLICK: [
        { cond: 'doubleClick', actions: ['selectForeground', send('SETBACKGROUND', { background: 0 })] },
        { cond: 'onBackground', actions: 'selectForeground', },
        { actions: 'selectBackground' },
      ],
    }
  },
  {
    services: {
      listenForToolHotkeys: () => (send) => {
        const lookup = {
          b: 'USE_BRUSH',
          v: 'USE_SELECT',
          t: 'USE_THRESHOLD',
          k: 'USE_TRIM',
          g: 'USE_FLOOD',
          q: 'USE_ERODE_DILATE',
          m: 'USE_AUTOFIT',
          w: 'USE_WATERSHED',
        };

        const listener = (e) => {
          if (e.key in lookup) {
            send(lookup[e.key]);
          }
        };

        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
      listenForBrushHotkeys: () => (send) => {
        const lookup = { 
          ArrowUp: 'INCREASE_BRUSH_SIZE',
          ArrowDown: 'DECREASE_BRUSH_SIZE',
        };
        const listener = (e) => {
          if (e.key in lookup) {
            e.preventDefault();
            send(lookup[e.key]);
          }
        };
        window.addEventListener('keydown', listener); 
        return () => window.removeEventListener('keydown', listener);
      }
    },
    guards: {
      shift: (context, event) => event.shiftKey,
      doubleClick: (context, event) => event.detail === 2,
      onBackground: (context) => context.label === context.background,
      onForeground: (context) => context.label === context.foreground,
    },
    actions: {
      // forwardToTool: forwardTo((context) => context.tool),
      paint: sendParent((context, event) => ({
        type: 'EDIT',
        action: 'handle_draw',
        args: {
          trace: JSON.stringify(context.trace),
          foreground: context.foreground,
          background: context.background,
          brush_size: context.brushSize,
          frame: context.frame,
          feature: context.feature,
          channel: context.channel,
        },
        tool: 'brush',
      })),
      threshold: sendParent((context, event) => ({
        type: 'EDIT',
        action: 'threshold',
        args: {
          x1: event.firstPoint[0],
          y1: event.firstPoint[1],
          x2: event.secondPoint[0],
          y2: event.secondPoint[1],
          frame: context.frame,
          label: context.foreground,
        },
        tool: 'threshold',
      })),
      updateLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
      updateCoordinates: assign((_, { x, y }) => ({ x, y })),
      updateLabel: assign({ label: ({ labeledArray: array, x, y}) => array ? Math.abs(array[y][x]) : 0 }),
      addToTrace: assign({ trace: (context) => [...context.trace, [context.x, context.y]] }),
      setForeground: assign((_, { foreground }) => ({ foreground })),
      setBackground: assign((_, { background }) => ({ background })),
      selectForeground: pure(({ label, foreground, background }) => {
        return [
          send({ type: 'SETFOREGROUND', foreground: label }),
          send({ type: 'SETBACKGROUND', background: label === background ? foreground : background }),
        ];
      }),
      selectBackground: pure(({ label, foreground, background }) => {
        return [
          send({ type: 'SETBACKGROUND', background: label }),
          send({ type: 'SETFOREGROUND', foreground: label === foreground ? background : foreground }),
        ];
      }),
    }
  }
);

export default toolMachine;