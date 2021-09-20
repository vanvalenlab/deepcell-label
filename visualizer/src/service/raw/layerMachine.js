import { assign, Machine } from 'xstate';

const CHANNEL_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00'];

const createLayerMachine = (layer, numChannels) =>
  Machine(
    {
      context: {
        layer,
        numChannels,
        channel: layer < numChannels ? layer : 0,
        on: true,
        color: CHANNEL_COLORS[layer] || '#FF0000',
        range: [0, 255],
      },
      on: {
        SET_CHANNEL: { actions: 'setChannel' },
        SET_COLOR: { actions: 'setColor' },
        TOGGLE_ON: { actions: 'toggleOn' },
        SET_RANGE: { actions: 'setRange' },
      },
    },
    {
      actions: {
        setChannel: assign({
          channel: (_, { channel }) => Math.max(0, Math.min(numChannels - 1, channel)),
        }),
        setColor: assign({ color: (_, { color }) => color }),
        toggleOn: assign({ on: ({ on }) => !on }),
        setRange: assign({
          range: (_, { range }) => [
            Math.max(0, Math.min(255, range[0])),
            Math.max(0, Math.min(255, range[1])),
          ],
        }),
      },
    }
  );

export default createLayerMachine;
