/** Manages the controls for the raw image, including
 * whether color is on and what channel to show in grayscale mode.
 *
 * Spawns layerMachines and channelMachines for controlling each channel in color and grayscale mode respectively.
 */

import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from '../eventBus';
import createChannelMachine from './channelMachine';
import createLayerMachine from './layerMachine';

const { pure, respond } = actions;

const createRawMachine = ({ projectId, eventBuses, undoRef }) =>
  Machine(
    {
      invoke: [
        { id: 'eventBus', src: fromEventBus('raw', () => eventBuses.raw) },
        { src: fromEventBus('raw', () => eventBuses.load, 'LOADED') },
        { src: fromEventBus('raw', () => eventBuses.load, 'DIMENSIONS') },
      ],
      context: {
        projectId,
        numChannels: 1,
        channel: 0,
        channels: [], // channel machines
        channelNames: ['channel 0'],
        layersOpen: [],
        layers: [],
        isGrayscale: true,
      },
      entry: [send('REGISTER_UI', { to: undoRef }), 'spawnLayers', 'spawnChannels'],
      initial: 'loading',
      states: {
        loading: {
          type: 'parallel',
          states: {
            getChannelNames: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    LOADED: { actions: ['setChannelNames'], target: 'done' },
                  },
                },
                done: { type: 'final' },
              },
            },
            getDimensions: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    DIMENSIONS: {
                      actions: ['setNumChannels', 'spawnLayers', 'spawnChannels'],
                      target: 'done',
                    },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: { actions: 'checkChannels', target: 'loaded' },
        },
        loaded: {
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
                ADD_LAYER: {
                  actions: ['addLayer', sendParent((c, e) => e)],
                },
                FETCH_LAYERS: {
                  actions: ['fetchLayers', 'resetColors', 'setLayers', sendParent((c, e) => e)],
                },
                REMOVE_LAYER: {
                  actions: ['removeLayer', sendParent((c, e) => e), 'setLayers'],
                },
                EDIT_CHANNEL: {
                  actions: ['editLayer'],
                },
                EDIT_NAME: { actions: ['editChannelName', 'sendChannelNames'] },
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
            GET_CHANNELS: { actions: 'sendChannels' },
            TOGGLE_INVERT: { actions: 'forwardToChannel' },
            SAVE: { actions: 'save' },
            RESTORE: { actions: ['restore', respond('RESTORED')] },
          },
        },
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
        setChannelNames: assign({
          channelNames: (ctx, evt) => evt.channels,
        }),
        editChannelName: assign({
          channelNames: (ctx, evt) => {
            let channelNames = [...ctx.channelNames];
            channelNames[evt.channel] = evt.name;
            return channelNames;
          },
        }),
        // Send an event to event bus that channel names have been edited
        sendChannelNames: send(
          (ctx) => ({ type: 'CHANNEL_NAMES', channelNames: ctx.channelNames }),
          {
            to: 'eventBus',
          }
        ),
        editLayer: assign({
          layersOpen: ({ channelNames, layersOpen }, { channel, index }) => [
            ...layersOpen.map((c, i) => (i === index ? channelNames[channel] : c)),
          ],
        }),
        checkChannels: assign({
          channelNames: (ctx) => {
            let channelNames = ctx.channelNames;
            channelNames = channelNames.map((name, i) => (name ? name : `channel ${i}`));
            return channelNames;
          },
          layersOpen: ({ numChannels, channelNames }) => {
            const layers = [];
            for (let i = 0; i < Math.min(6, numChannels); i++) {
              layers.push(channelNames[i]);
            }
            return layers;
          },
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
        }),
        sendChannels: respond((ctx) => ({
          type: 'CHANNELS',
          channels: ctx.channelNames, // Send the channel names list for export
        })),
        forwardToChannel: forwardTo((ctx) => `channel${ctx.channel}`),
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
          layersOpen: ({ layersOpen, channelNames }) => [
            ...layersOpen,
            channelNames[layersOpen.length],
          ],
        }),
        fetchLayers: assign({
          layers: ({ numChannels }, evt) => {
            const layers = [];
            for (let i = 0; i < evt.channels.length; i++) {
              const layer = spawn(createLayerMachine(evt.channels[i], numChannels), `layer ${i}`);
              layers.push(layer);
            }
            return layers;
          },
          layersOpen: ({ channelNames }, evt) => {
            const layers = [];
            for (let i = 0; i < evt.channels.length; i++) {
              layers.push(channelNames[evt.channels[i]]);
            }
            return layers;
          },
        }),
        removeLayer: assign({
          layers: ({ layers }, { layer }) => [...layers.filter((val) => val !== layer)],
          layersOpen: ({ layersOpen }, { index }) => [...layersOpen.filter((_, i) => i !== index)],
        }),
        setLayers: pure((context) =>
          context.layers.map((layer, i) => send({ type: 'SET_LAYER', layer: i }, { to: layer }))
        ),
        resetColors: pure((context) =>
          context.layers.map((layer, i) => send({ type: 'RESET_COLORS', layer: i }, { to: layer }))
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
