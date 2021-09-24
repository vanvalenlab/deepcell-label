import { assign } from 'xstate';

// actions to save data from events in context
export const toolActions = {
  setCoordinates: assign((_, { x, y }) => ({ x, y })),
  setLabel: assign((_, { label }) => ({ label })),
  setForeground: assign({ foreground: (_, { foreground }) => foreground }),
  setBackground: assign({ background: (_, { background }) => background }),
  setSelected: assign({ selected: (_, { selected }) => selected }),
};

export const toolGuards = {
  shift: (_, event) => event.shiftKey,
  doubleClick: (_, event) => event.detail === 2,
  onBackground: ({ label, background }) => label === background,
  onForeground: ({ label, foreground }) => label === foreground,
  onNoLabel: ({ label }) => label === 0,
};
