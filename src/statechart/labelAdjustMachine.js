import { Machine, assign } from 'xstate';

const labelAdjustMachine = Machine(
  {
    initial: 'idle',
    states: { idle: {} },
    context: {
      opacity: 0.3,
    },
    on: {
      SETOPACITY: { actions: 'setOpacity' },
    }
  },
  {
    actions: {
      setOpacity: assign({ opacity: (_, event) => Math.min(1, Math.max(0, event.opacity)) }),
    }
  }
);

export default labelAdjustMachine;