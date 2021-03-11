import { Machine, assign, send } from 'xstate';

/**
 * Handles selecting labels as the foreground or background.
 */
const selectMachine = Machine(
  {
    initial: 'idle',
    context: {
      foreground: 1,
      background: 0,
      newLabel: 1,
    },
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
      // selectForeground: send(() => ({ type: 'SETFOREGROUND', label: window.model.canvas.label })),
      // selectBackground: send(() => ({ type: 'SETBACKGROUND', label: window.model.canvas.label })),
      // resetForeground: send(() => ({ type: 'SETFOREGROUND', label: 0 })),
      // resetBackground: send(() => ({ type: 'SETBACKGROUND', label: 0 })),
      // newForeground: send(() => ({ type: 'SETFOREGROUND', label: window.model.maxLabel + 1 })),
      // newBackground: send(() => ({ type: 'SETBACKGROUND', label: window.model.maxLabel + 1 })),
      // incrementForeground: send(() => {
      //   const numLabels = window.model.maxLabel + 1;
      //   const nextLabel = (window.model.foreground + 1) % numLabels;
      //   return { type: 'SETFOREGROUND', label: nextLabel };
      // }),
      // incrementBackground: send(() => {
      //   const numLabels = window.model.maxLabel + 1;
      //   const nextLabel = (window.model.background + 1) % numLabels;
      //   return { type: 'SETBACKGROUND', label: nextLabel };
      // }),
      // decrementForeground: send(() => {
      //   const numLabels = window.model.maxLabel + 1;
      //   const prevLabel = ((window.model.foreground - 1) + numLabels) % numLabels;
      //   return { type: 'SETFOREGROUND', label: prevLabel };
      // }),
      // decrementBackground: send(() => {
      //   const numLabels = window.model.maxLabel + 1;
      //   const prevLabel = ((window.model.background - 1) + numLabels) % numLabels;
      //   return { type: 'SETBACKGROUND', label: prevLabel };
      // }),
      // swapLabels: send(() => ({ type: 'SETFOREGROUND', label: window.model.background })),
    }
  }
);

export default selectMachine;