import { Machine, assign, sendParent, spawn, send, forwardTo } from 'xstate';


// tool states

const brushState = {
  initial: 'idle',
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
        COORDINATES: { actions: ['updateCoordinates', 'addToTrace'] },
        mouseup: { target: 'idle', actions: 'paint' }
      }
    },
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

// OLDER

const selectForegroundState = {
  on: {
    mousedown: [
      { cond: 'doubleClick', actions: ['setBackground', 'resetForeground'] },
      { cond: 'onForeground', actions: 'setBackground', },
      { actions: 'setForeground' },
    ]
  },
};

const selectBackgroundState = {
  on: {
    mousedown: [
      { cond: 'doubleClick', actions: ['setForeground', 'resetBackground'] },
      { cond: 'onBackground', actions: 'setForeground', },
      { actions: 'setBackground' },
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
    entry: (context) => console.log(context.brushSize),
    initial: 'brush',
    states: {
      selectForeground: selectForegroundState,
      selectBackground: selectBackgroundState,
      brush: brushState,
      //   flood: floodState,
      //   trim: trimState,
      //   erodeDilate: erodeDilateState,
      //   autofit: autofitState,
      //   threshold: thresholdState,
      //   watershed: watershedState,
      //   history: { type: 'history.deep' } // allows us to return to the current step of an action when selecting in between
      // }, 
    },
    on: {
      'keydown.b': '.brush',
      'keydown.v': '.selectForeground',
      PAINT: { actions: 'paint' },
      THRESHOLD: { actions: 'threshold' },

      // 'keydown.t': '.threshold',
      // 'keydown.g': '.flood',
      // 'keydown.k': '.trim',
      // 'keydown.q': '.erodeDilate',
      // 'keydown.t': '.threshold',
      // 'keydown.m': '.autofit',
      // 'keydown.w': '.watershed',

      COORDINATES: { actions: 'updateCoordinates' },
      LABELEDARRAY: { actions: 'updateLabeled' },
      FRAME: { actions: assign((context, event) => ({ frame: event.frame })) },
      CHANNEL: { actions: assign((context, event) => ({ channel: event.channel })) },
      FEATURE: { actions: assign((context, event) => ({ feature: event.channel })) },
      
      
      SETFOREGROUND: { actions: 'setForeground' },
      SETBACKGROUND: { actions: 'setBackground' },
      'keydown.n': { actions: 'newForeground' },
      'keydown.Escape': { actions: 'resetBackground' },
      'keydown.x': { actions: 'swapLabels' },
      'keydown.[': { actions: 'decrementForeground' },
      'keydown.]': { actions: 'incrementForeground' },
      'keydown.{': { actions: 'decrementBackground' },
      'keydown.}': { actions: 'incrementBackground' },
      'keydown.up': { actions: assign({ brushSize: (context) => context.brushSize + 1 }) },
      'keydown.down': { actions: assign({ brushSize: (context) => Math.max(1, context.brushSize - 1) })},

      SHIFTCLICK: [
        { cond: 'onBackground'}
      ],
    }
  },
  {
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
          trace: JSON.stringify(event.trace),
          brush_value: context.foreground,
          target_value: context.background,
          brush_size: event.size,
          frame: context.frame,
          erase: false,
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
      updateLabeled: assign((context, event) => ({
        labeledArray: event.labeledArray,
        label: event.labeledArray[context.y][context.x],
      })),
      updateCoordinates: assign((context, event) => ({
        x: event.x,
        y: event.y,
        label: Math.abs(context.labeledArray[event.y][event.x]),
      })),
      addToTrace: assign({ trace: (context, event) => [...context.trace, [context.x, context.y]] }),
      setForeground: assign({
        foreground: (ctx, evt) => ctx.label,
        background: (ctx, evt) => ctx.label === ctx.background ? ctx.foreground : ctx.background,
      }),
      setBackground: assign({
        foreground: (ctx, evt) => ctx.label === ctx.foreground ? ctx.background : ctx.foreground,
        background: (ctx, evt) => ctx.label,
      }),
      swapLabels: assign({
        foreground: (ctx) => ctx.background,
        background: (ctx) => ctx.foreground,
      }),
      newForeground: assign({ foreground: (ctx) => ctx.newLabel }),
      newBackground: assign({ background: (ctx) => ctx.newLabel }),
      resetForeground: assign({ foreground: 0 }),
      resetBackground: assign({ background: 0 }),
      incrementForeground: assign({ foreground: (ctx) => (ctx.foreground + 1) % ctx.newLabel }),
      incrementBackground: assign({ background: (ctx) => (ctx.background + 1) % ctx.newLabel }),
      decrementForeground: assign({ background: (ctx) => (ctx.foreground - 1 + ctx.newLabel) % ctx.newLabel }),
      decrementBackground: assign({ background: (ctx) => (ctx.background + 1 + ctx.newLabel) % ctx.newLabel }),
    }
  }
);

export default toolMachine;