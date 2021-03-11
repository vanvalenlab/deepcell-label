import { Machine, assign } from 'xstate';

const labelAdjustMachine = Machine(
  {
    initial: 'idle',
    states: { idle: {} },
    context: {
      transparentBackground: false,
      highlight: true,
      opacity: 0.3,
    },
    on: {
      TOGGLETRANSPARENTBACKGROUND: { actions: 'toggleTransparentBackground' },
      TOGGLEHIGHLIGHT: { actions: 'toggleHighlight' },
      SETOPACITY: { actions: 'setOpacity' },
    }
  },
  {
    actions: {
      toggleTransparentBackground: assign({ transparentBackground: (context) => !context.transparentBackground }),
      toggleHighlight: assign({ highlight: (context) => !context.highlight }),
      setOpacity: assign({ opacity: (_, event) => Math.min(1, Math.max(0, event.opacity)) }),
    }
  }
);

export default labelAdjustMachine;