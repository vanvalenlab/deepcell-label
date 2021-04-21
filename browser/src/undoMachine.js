import { Machine, assign, sendParent } from 'xstate';

const undoMachine = Machine(
  {
    initial: 'idle',
    states: { idle: {} },
    context: {
      past: [],
      future: [],
    },
    on: {
      UNDO: [
        { cond: 'cannotUndo' },
        { cond: 'differentPast', actions: 'restorePast' },
        { actions: ['backendUndo', 'movePastToFuture'] }
      ],
      REDO: [
        { cond: 'cannotRedo' },
        { cond: 'differentNext', actions: 'restoreNext' },
        { actions: ['backendRedo', 'moveFutureToPast'] }
      ],
      STORE: { actions: 'storeState' },
    }
  },
  {
    guards: {
      cannotUndo: (context) => context.past.length === 0,
      cannotRedo: (context) => context.future.length === 0,
      differentPast: (context, event) => {
        const { context: currentContext } = event;
        const pastContext = context.past[context.past.length - 1];
        for (const [key, value] of Object.entries(pastContext)) {
          if (value !== currentContext[key]) return true;
        }
        return false;
      },
      differentNext: (context, event) => {
        const { context: currentContext } = event;
        const nextContext = context.future[context.future.length - 1];
        for (const [key, value] of Object.entries(nextContext)) {
          if (value !== currentContext[key]) return true;
        }
        return false;
      }
    },
    actions: {
      backendUndo: sendParent('BACKENDUNDO'),
      backendRedo: sendParent('BACKENDREDO'),
      restorePast: sendParent((context, event) => ({ type: 'RESTORE', context: context.past[context.past.length - 1] })),
      restoreNext: sendParent((context, event) => ({ type: 'RESTORE', context: context.future[context.future.length - 1] })),
      movePastToFuture: assign({
        past: (context) => context.past.slice(0, context.past.length - 1),
        future: (context) => [...context.future, context.past[context.past.length - 1]],
      }),
      moveFutureToPast: assign({
        past: (context) => [...context.past, context.future[context.future.length - 1]],
        future: (context) => context.future.slice(0, context.future.length - 1),
      }),
      storeState: assign({
        past: (context, event) => [...context.past, event.context],
        future: [],
      })
    }
  }
);

// const stored2 = { zoom: 2, sx: 1, sy: 1 }
// const stored1 = { zoom: 2, sx: 0, sy: 0}
// const current1 = { zoom: 2, sx: 0, sy: 0, scale: 1}
// const current2 = { zoom: 2, sx: 1, sy: 1, scale: 1.3}


// const equivalentStates = (stored, current) => {
// 	for (const [key, value] of Object.entries(stored)) {
//   	if (value !== current[key]) return false;
//   }
//   return true;
// }

// const differentStates = (context, event) => {
//   const { stored } = event;
//   for (const [key, value] of Object.entries(stored)) {
//   	if (value !== context[key]) return true;
//   }
//   return false;
// }

// // restores state in parent machine
// const restoreState = assign((context, event) => event.stored);
// // TODO: how to communicate changes in parent context to children after restoring state

// const stored = {
//   sx: 0,
//   sy: 0,
//   frame: 0,
// };

// const childContext = { sx: 0, sy: 0, scale: 0 };

// const inContext = (stored, context) => {
//   return Object.keys(stored)
//     .filter(key => key in context)
//     .reduce((obj, key) => {
//       obj[key] = stored[key];
//       return obj;
//     }, {});
// };

// inContext(stored, childContext);

// const storedForChildContext = Object.keys(stored)
//   .filter(key => key in childContext)
//   .reduce((obj, key) => {
//     obj[key] = stored[key];
//     return obj;
//   }, {});


// console.log(differentStates(stored1, current1));
// console.log(differentStates(stored1, current2));

// console.log(differentStates(stored2, current1));
// console.log(differentStates(stored2, current2));

// console.log({ ...current1, ...stored2 });

export default undoMachine;
