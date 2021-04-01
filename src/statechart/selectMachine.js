import { Machine, actions, assign, forwardTo, send, sendParent, pure } from 'xstate';

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
      subscribers: [],
    },
    initial: 'awaitLabeled',
    states: {
      awaitLabeled: {
        LABELEDARRAY: { actions: 'updateLabeled', target: 'send' },
      },
      idle: {
        SETFOREGROUND: { actions: 'setForeground', target: 'sendSelected' },
        SETBACKGROUND: { actions: 'setBackground', target: 'sendSelected' },
        'keydown.n': { actions: 'newForeground', target: 'sendSelected' },
        'keydown.Escape': { actions: 'resetBackground', target: 'sendSelected' },
        'keydown.x': { actions: 'swapLabels', target: 'sendSelected' },
        'keydown.[': { actions: 'decrementForeground', target: 'sendSelected' },
        'keydown.]': { actions: 'incrementForeground', target: 'sendSelected' },
        'keydown.{': { actions: 'decrementBackground', target: 'sendSelected' },
        'keydown.}': { actions: 'incrementBackground', target: 'sendSelected' },
      },
      sendSelected: {
        always: { actions: 'sendSelected', target: 'idle' }
      },
    },
    on: {
      SUBSCRIBE: { actions: 'addSubscriber' },
      COORDINATES: { actions: 'updateCoordinates' },
      LABELEDARRAY: { actions: 'updateLabeled' },
    }
  },
  {
    actions: {
      addSubscriber: assign({
        subscribers: (context, event) => [...context.subscribers, event.subscriber]
      }),
      sendSelected: pure((context, event) => context.subscribers.map(
        (subscriber) => send(
          { type: 'SELECTED', foreground: context.foreground, background: context.background, },
          { to: subscriber }
        )
      )),
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
    },
  },
);

export default selectMachine;
