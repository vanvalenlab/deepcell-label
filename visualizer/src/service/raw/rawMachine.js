import { actions, assign, Machine, send, sendParent, spawn } from 'xstate';
import createChannelMachine from './channelMachine';
import createLayerMachine from './layerMachine';

const { pure, respond } = actions;

const checkDisplay = {
  always: [{ cond: ({ isGrayscale }) => isGrayscale, target: 'grayscale' }, { target: 'color' }],
};

const color = {
  entry: [sendParent('COLOR'), assign({ isGrayscale: false })],
  on: {
    TOGGLE_COLOR_MODE: 'grayscale',
    ADD_LAYER: { actions: 'addLayer' },
    REMOVE_LAYER: { actions: 'removeLayer' },
  },
};

const grayscale = {
  entry: [sendParent('GRAYSCALE'), assign({ isGrayscale: true })],
  on: {
    TOGGLE_COLOR_MODE: 'color',
    RESET: { actions: 'forwardToChannel' },
    SET_CHANNEL: { cond: 'differentChannel', actions: 'setChannel' },
  },
};

const createRawMachine = (projectId, numChannels, numFrames) =>
  Machine(
    {
      context: {
        projectId,
        numChannels,
        numFrames,
        channel: 0,
        channels: [], // channel machines
        channelNames: [],
        layers: [],
        isGrayscale: Number(numChannels) === 1,
      },
      entry: ['spawnLayers', 'spawnChannels'],
      initial: 'checkDisplay',
      states: {
        checkDisplay,
        grayscale,
        color,
      },
      on: {
        TOGGLE_INVERT: { actions: 'forwardToChannel' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      guards: {
        differentChannel: (context, event) => context.channel !== event.channel,
      },
      actions: {
        setChannel: assign({ channel: (_, { channel }) => channel }),
        /** Creates a channel machines and names */
        spawnChannels: assign({
          channels: ({ numChannels }, event) => {
            const channels = [];
            for (let i = 0; i < numChannels; i++) {
              const channel = spawn(createChannelMachine(i), `channel${i}`);
              channels.push(channel);
            }
            return channels;
          },
          channelNames: ({ numChannels }) => {
            const names = [];
            for (let i = 0; i < numChannels; i++) {
              names.push(`channel ${i}`);
            }
            return names;
          },
        }),
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
          layers: ({ layers, numChannels }) => [
            ...layers,
            spawn(createLayerMachine(layers.length, numChannels), `layer ${layers.length}`),
          ],
        }),
        removeLayer: assign({
          layers: ({ layers }, { layer }) => [...layers.filter(val => val !== layer)],
        }),
        save: respond(({ channel, isGrayscale }) => ({ type: 'RESTORE', isGrayscale, channel })),
        restore: pure((context, event) =>
          context.isGrayscale === event.isGrayscale
            ? [send({ type: 'SET_CHANNEL', channel: event.channel })]
            : [
                send({ type: 'SET_CHANNEL', channel: event.channel }),
                send({ type: 'TOGGLE_COLOR_MODE' }),
              ]
        ),
      },
    }
  );

export default createRawMachine;
