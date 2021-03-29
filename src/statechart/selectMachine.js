import { Machine, actions, assign, forwardTo, send, sendParent } from 'xstate';

const selectMachine = Machine(
  {
    id: 'select',
    context: {
      labeledArray: [[undefined]],
      x: 0,
      y: 0,
      label: undefined,
      foreground: undefined,
      background: undefined,
      newLabel: 10,
    },
    initial: 'idle',
    states: {
      idle: {}
    },
    on: {
      LABELEDARRAY: { actions: ['updateLabeled', (context, event) => console.log(event)] },
      COORDINATES: { actions: ['updateCoordinates', (context, event) => console.log(event)] },
      SETFOREGROUND: { actions: 'setForeground' },
      SETBACKGROUND: { actions: 'setBackground' },
      'keydown.n': { actions: 'newForeground' },
      'keydown.Escape': { actions: 'resetBackground' },
      'keydown.x': { actions: 'swapLabels' },
      'keydown.[': { actions: 'decrementForeground' },
      'keydown.]': { actions: 'incrementForeground' },
      'keydown.{': { actions: 'decrementBackground' },
      'keydown.}': { actions: 'incrementBackground' },
    }
  },
  {
    actions: {
      updateLabeled: assign((context, event) => ({
        labeledArray: event.labeledArray,
        label: event.labeledArray[context.y][context.x],
      })),
      updateCoordinates: assign((context, event) => ({
        x: event.x,
        y: event.y,
        label: context.labeledArray[event.y][event.x],
      })),
      setForeground: assign({
        foreground: (ctx, evt) => evt.label,
        background: (ctx, evt) => evt.label === ctx.background ? ctx.foreground : ctx.background,
      }),
      setBackground: assign({
        foreground: (ctx, evt) => evt.label === ctx.foreground ? ctx.background : ctx.foreground,
        background: (ctx, evt) => evt.label,
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
    },
  },
);

export default selectMachine;
