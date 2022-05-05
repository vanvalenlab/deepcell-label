import { actions, assign, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from '../eventBus';
import createChannelMachine from './channelMachine';
import createLayerMachine from './layerMachine';

const { pure, respond } = actions;

const createRawMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      invoke: [
        { id: 'eventBus', src: fromEventBus('raw', () => eventBuses.raw) },
        { src: fromEventBus('raw', () => eventBuses.load) },
      ],
      context: {
        projectId,
        numChannels: 1,
        channel: 0,
        channels: [], // channel machines
        channelNames: ['channel 0'],
        layers: [],
        isGrayscale: true,
      },
      entry: ['spawnLayers', 'spawnChannels'],
      initial: 'checkDisplay',
      states: {
        checkDisplay: {
          always: [{ cond: 'isGrayscale', target: 'grayscale' }, { target: 'color' }],
        },
        color: {
          entry: [send('COLOR', { to: 'eventBus' }), assign({ isGrayscale: false })],
          on: {
            TOGGLE_COLOR_MODE: 'grayscale',
            // Need propagate event to root actor to rerender canvas
            ADD_LAYER: { actions: ['addLayer', sendParent((c, e) => e)] },
            REMOVE_LAYER: { actions: ['removeLayer', sendParent((c, e) => e), 'setLayers'] },
          },
        },
        grayscale: {
          entry: [send('GRAYSCALE', { to: 'eventBus' }), assign({ isGrayscale: true })],
          on: {
            TOGGLE_COLOR_MODE: 'color',
            RESET: { actions: 'forwardToChannel' },
            SET_CHANNEL: { actions: ['setChannel', 'sendToEventBus'] },
          },
        },
      },
      on: {
        DIMENSIONS: {
          target: '.checkDisplay',
          actions: ['setNumChannels', 'spawnLayers', 'spawnChannels'],
        },
        TOGGLE_INVERT: { actions: 'forwardToChannel' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      guards: {
        isGrayscale: ({ isGrayscale }) => isGrayscale,
      },
      actions: {
        setNumChannels: assign({
          numChannels: (context, event) => event.numChannels,
          isGrayscale: (context, event) => event.numChannels === 1,
        }),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
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
          layers: ({ layers }, { layer }) => [...layers.filter((val) => val !== layer)],
        }),
        setLayers: pure((context) =>
          context.layers.map((layer, i) => send({ type: 'SET_LAYER', layer: i }, { to: layer }))
        ),
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
