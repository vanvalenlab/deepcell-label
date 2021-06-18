import { assign, Machine, sendParent } from 'xstate';

const CHANNEL_COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#00FFFF',
  '#FF00FF',
  '#FFFF00',
];

const createLayerMachine = (layer, channel) =>
  Machine(
    {
      context: {
        layer,
        channel: channel || 0,
        on: true,
        color: CHANNEL_COLORS[layer] || '#FF0000',
        range: [0, 255],
      },
      on: {
        CHANGE_CHANNEL: { actions: ['changeChannel', 'loadChannel'] },
        SETCOLOR: { actions: 'setColor' },
        TOGGLE_ON: { actions: 'toggleOn' },
        SET_RANGE: { actions: 'setRange' },
      },
    },
    {
      actions: {
        loadChannel: sendParent(({ channel }) => ({
          type: 'LOAD_CHANNEL',
          channel,
        })),
        changeChannel: assign({ channel: (_, { channel }) => channel }),
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
