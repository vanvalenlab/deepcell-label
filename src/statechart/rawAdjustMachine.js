import { Machine, assign } from 'xstate';

const rawAdjustMachine = Machine(
  {
    initial: 'idle',
    states: { idle: {} },
    context: {
      invert: true,
      grayscale: true,
      brightness: true,
      contrast: true,
    },
    on: {
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      SETBRIGHTNESS: { actions: 'setBrightness' },
      SETCONTRAST: { actions: 'setContrast' },
    }
  },
  {
    actions: {
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ greyscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(0, event.brightness)) }),
      setContrast: assign({ brightness: (_, event) => Math.min(1, Math.max(0, event.brightness)) }),
    }
  }
);

export default rawAdjustMachine;