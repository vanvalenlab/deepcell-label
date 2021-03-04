import { Machine, assign } from 'xstate';

const rawAdjustMachine = Machine(
  {
    initial: 'idle',
    states: { idle: {} },
    context: {
      invert: true,
      grayscale: true,
      brightness: 0,
      contrast: 0,
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
      log: (context, event) => console.log(context.brightness),
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default rawAdjustMachine;