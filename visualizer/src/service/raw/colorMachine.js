import { assign, Machine, spawn } from 'xstate';
import createLayerMachine from './layerMachine';

const createColorMachine = ({ numChannels }) =>
  Machine(
    // projectId, numChannels, numFrames
    {
      context: {
        numChannels,
        layers: [], // channels displayed in the controller
      },
      entry: 'spawnLayers',
      on: {
        ADD_LAYER: { actions: 'addLayer' },
        REMOVE_LAYER: { actions: 'removeLayer' },
        LAYER_CHANNEL_CHANGE: { actions: 'addToChannels' },
      },
    },
    {
      actions: {
        spawnLayers: assign({
          layers: ({ numChannels }) => {
            const layers = [];
            for (let i = 0; i < Math.min(6, numChannels); i++) {
              const layer = spawn(createLayerMachine(i, numChannels), `layer ${i}`);
              layers.push(layer);
            }
            return layers;
          },
        }),
        addLayer: assign({
          layers: ({ layers, channels }) => [
            ...layers,
            spawn(createLayerMachine(layers.length, channels), `layer ${layers.length}`),
          ],
        }),
        removeLayer: assign({
          layers: ({ layers }, { layer }) => [...layers.filter(val => val !== layer)],
        }),
      },
    }
  );

export default createColorMachine;
