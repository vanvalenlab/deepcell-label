import { assign } from 'xstate';

// actions to save data from events in context
export const toolActions = {
  setCoordinates: assign((_, { x, y }) => ({ x, y })),
  setHovering: assign((_, { hovering }) => ({ hovering })),
  setForeground: assign((_, { foreground }) => ({ foreground })),
  setBackground: assign((_, { background }) => ({ background })),
  setSelected: assign((_, { selected }) => ({ selected })),
};

export const toolGuards = {
  shift: (_, event) => event.shiftKey,
  doubleClick: (_, event) => event.detail === 2,
  onBackground: ({ hovering, background }) => hovering === background,
  onForeground: ({ hovering, foreground }) => hovering === foreground,
  onNoLabel: ({ hovering }) => hovering === 0,
};
