import { assign, Machine } from 'xstate';

const createGrayscaleMachine = ({ numChannels }) =>
  Machine(
    {
      context: {
        numChannels,
        channel: 0,
      },
      on: {
        SET_CHANNEL: { cond: 'differentChannel', actions: 'setChannel' },
      },
    },
    {
      guards: {
        differentChannel: (context, event) => context.channel !== event.channel,
      },
      actions: {
        setChannel: assign({ channel: (_, { channel }) => channel }),
      },
    }
  );

export default createGrayscaleMachine;
