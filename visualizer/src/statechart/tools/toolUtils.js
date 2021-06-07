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
  updateMove: assign({
    moveX: ({ moveX }, event) => moveX + event.movementX,
    moveY: ({ moveY }, event) => moveY + event.movementY,
  }),
  resetMove: assign({ moveX: 0, moveY: 0}),
};

export const toolGuards = {
  moved: ({ moveX, moveY }) => Math.abs(moveX) > 10 || Math.abs(moveY) > 10,
  shift: (_, event) => event.shiftKey,
  doubleClick: (_, event) => event.detail === 2,
  onBackground: ({ label, background }) => label === background,
  onForeground: ({ label, foreground }) => label === foreground,
  onNoLabel: ({ label }) => label === 0,
};

export const toolServices = {
  listenForMouseUp: () => (send) => {
    const listener = (e) => send(e);
    window.addEventListener('mouseup', listener);
    return () => window.removeEventListener('mouseup', listener);
  },
};
