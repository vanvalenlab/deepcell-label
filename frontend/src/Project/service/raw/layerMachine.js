/** Manages the controls for a layer in color mode, including
 * which channel to show, the dynamic range, whether to show the layer, and the color.
 */
import { assign, Machine } from 'xstate';

const CHANNEL_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00'];

const createLayerMachine = (layer, numChannels) =>
  Machine(
    {
      context: {
        layer,
        channel: layer % numChannels,
        on: true,
        color: CHANNEL_COLORS[layer] || '#FF0000',
        range: [0, 255],
      },
      on: {
        SET_LAYER: { actions: 'setLayer' },
        SET_CHANNEL: { actions: 'setChannel' },
        SET_COLOR: { actions: 'setColor' },
        RESET_COLORS: { actions: 'resetColors' },
        TOGGLE_ON: { actions: 'toggleOn' },
        SET_RANGE: { actions: 'setRange' },
      },
    },
    {
      actions: {
        setLayer: assign({ layer: (_, event) => event.layer }),
        setChannel: assign({ channel: (_, { channel }) => channel }),
        setColor: assign({ color: (_, { color }) => color }),
        resetColors: assign({
          color: (_, evt) => CHANNEL_COLORS[evt.layer] || '#FF0000',
        }),
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
