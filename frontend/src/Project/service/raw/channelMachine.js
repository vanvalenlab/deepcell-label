/** Manages the controls for a channel, including
 * the dynamic range, brightness, contrast, and whether to invert the channel.
 */
import quickselect from 'quickselect';
import { assign, Machine } from 'xstate';

const createChannelMachine = (channel) =>
  Machine(
    {
      id: `channel${channel}`,
      context: {
        // layer settings for grayscale mode
        invert: false,
        range: [0, 255],
        brightness: 0,
        contrast: 0,
      },
      on: {
        TOGGLE_INVERT: { actions: 'toggleInvert' },
        SET_RANGE: { actions: 'setRange' },
        SET_BRIGHTNESS: { actions: 'setBrightness' },
        SET_CONTRAST: { actions: 'setContrast' },
        RESET: { actions: 'reset' },
      },
    },
    {
      actions: {
        toggleInvert: assign({ invert: ({ invert }) => !invert }),
        setRange: assign({
          range: (_, { range }) => [
            Math.max(0, Math.min(255, range[0])),
            Math.max(0, Math.min(255, range[1])),
          ],
        }),
        setBrightness: assign({
          brightness: (_, { brightness }) => Math.max(-1, Math.min(1, brightness)),
        }),
        setContrast: assign({
          contrast: (_, { contrast }) => Math.max(-1, Math.min(1, contrast)),
        }),
        reset: assign({
          range: [0, 255],
          brightness: 0,
          contrast: 0,
        }),
        // TODO: update to look across all times
        setAutoRange: assign({
          range: ({ rawImage: img }) => {
            // modified from https://github.com/hms-dbmi/viv
            // get ImageData from rawImage
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const array = imageData.data
              .filter((v, i) => i % 4 === 1) // take only the first channel
              .filter((v) => v > 0); // ignore the background
            const cutoffPercentile = 0.01;
            const topCutoffLocation = Math.floor(array.length * (1 - cutoffPercentile));
            const bottomCutoffLocation = Math.floor(array.length * cutoffPercentile);
            quickselect(array, topCutoffLocation);
            quickselect(array, bottomCutoffLocation, 0, topCutoffLocation);
            return [array[bottomCutoffLocation] || 0, array[topCutoffLocation] || 255];
          },
        }),
      },
    }
  );

export default createChannelMachine;
