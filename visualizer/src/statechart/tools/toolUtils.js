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
  shift: (_, event) => event.shiftKey,
  doubleClick: (_, event) => event.detail === 2,
  onBackground: ({ label, background }) => label === background,
  onForeground: ({ label, foreground }) => label === foreground,
  onNoLabel: ({ label }) => label === 0,
};
