import { assign } from 'xstate';

// actions to save data from events in context
export const toolActions = {
  setLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
  setCoordinates: assign((_, { x, y }) => ({ x, y })),
  setLabel: assign((_, { label }) => ({ label })),
  setForeground: assign((_, { foreground }) => ({ foreground })),
  setBackground: assign((_, { background }) => ({ background })),
  setFrame: assign((_, { frame }) => ({ frame })),
  setFeature: assign((_, { feature }) => ({ feature })),
  setChannel: assign((_, { channel }) => ({ channel })),
};

export const toolGuards = {
  shift: (context, event) => event.shiftKey,
  doubleClick: (context, event) => event.detail === 2,
  onBackground: (context) => context.label === context.background,
  onForeground: (context) => context.label === context.foreground,
  onNoLabel: (context) => context.label === 0,
};
