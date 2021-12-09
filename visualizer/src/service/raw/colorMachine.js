import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createLayerMachine from './layerMachine';

const { pure } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading', // idle?
  states: {
    idle: {},
    loading: {
      on: {
        CHANNEL_LOADED: {
          target: 'checkLoaded',
          cond: 'isLoadingFrame',
          actions: 'updateLoaded',
        },
        // when the channel changes before the frame does,
        // we need to load the frame for the new channel
        CHANNEL: { actions: 'addChannelToLoading' },
      },
    },
    checkLoaded: {
      always: [{ cond: 'loaded', target: 'loaded', actions: 'sendLoaded' }, { target: 'loading' }],
    },
    loaded: {
      on: {
        FRAME: {
          target: 'idle',
          actions: ['setFrame', 'forwardToLoadedChannels'],
        },
        CHANNEL: { target: 'loading', actions: 'addChannelToLoading' },
      },
    },
  },
  on: {
    LOAD_FRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['setLoadingFrame', 'loadFrame'],
    },
  },
};

const channelState = {
  initial: 'idle',
  states: {
    idle: {},
    loading: {
      on: {
        CHANNEL_LOADED: {
          target: 'idle',
          cond: 'isLoadingChannel',
          actions: 'useChannel',
        },
        // when frame changes, load that frame instead
        FRAME: { actions: 'reloadLoadingChannels' },
      },
    },
  },
  on: {
    LOAD_CHANNEL: {
      target: '.loading',
      cond: 'newChannel',
      actions: ['loadChannel', 'addChannelToLoading'],
    },
  },
};

const createColorMachine = ({ channels }) =>
  Machine(
    // projectId, numChannels, numFrames
    {
      context: {
        channels, // all channels that can be used in layers
        numChannels: channels.length,
        layers: [], // channels displayed in the controller
        // loadingLayers: [], // layers requested by user that we are loading data for
        frame: 0,
        loadingFrame: 0,
        loadedChannels: new Map(),
        loadingChannels: new Set(),
      },
      entry: 'spawnLayers',
      type: 'parallel',
      states: {
        frame: frameState,
        channel: channelState,
      },
      on: {
        ADD_LAYER: { actions: 'addLayer' },
        REMOVE_LAYER: { actions: 'removeLayer' },
        LAYER_CHANNEL_CHANGE: { actions: 'addToLoading' },
      },
    },
    {
      guards: {
        /** Check if all channels in layers are loaded. */
        loaded: ({ loadedChannels }) => [...loadedChannels.values()].every((v) => v),
        /** Check if the data is for the loading frame. */
        isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
        diffLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
        isLoadingChannel: ({ loadingChannels }, { channel }) => loadingChannels.has(channel),
        newChannel: ({ loadedChannels, loadingChannels }, { channel }) =>
          !loadedChannels.has(channel) && !loadingChannels.has(channel),
      },
      actions: {
        spawnLayers: assign({
          layers: ({ numChannels }) => {
            const numLayers = Math.min(3, numChannels);
            return [...Array(numLayers).keys()].map((index) =>
              spawn(createLayerMachine(index, index), `layer ${index}`)
            );
          },
          loadedChannels: ({ numChannels, loadedChannels }) => {
            const numLayers = Math.min(3, numChannels);
            return [...Array(numLayers).keys()].reduce(
              (loadedChannels, channel) => loadedChannels.set(channel, false),
              loadedChannels
            );
          },
        }),
        /** Record that a channel is loaded. */
        updateLoaded: assign({
          loadedChannels: ({ loadedChannels }, { channel }) => loadedChannels.set(channel, true),
        }),
        setLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
        /** Load frame for all the loaded channels. */
        loadFrame: pure(({ loadingFrame, channels, loadedChannels }) => {
          return [
            assign({
              loadedChannels: ({ loadedChannels }) => {
                loadedChannels.forEach((val, key, map) => map.set(key, false));
                return loadedChannels;
              },
            }),
            // load frame in each loaded channel
            ...channels
              .filter((channel, index) => loadedChannels.has(index))
              .map((channel) => send({ type: 'LOAD_FRAME', frame: loadingFrame }, { to: channel })),
          ];
        }),
        loadChannel: send(({ frame }) => ({ type: 'LOAD_FRAME', frame }), {
          to: ({ channels }, { channel }) => channels[channel],
        }),
        addChannelToLoading: assign({
          loadingChannels: ({ loadingChannels }, { channel }) => loadingChannels.add(channel),
        }),
        /** Load a different frame in the loading channels. */
        reloadLoadingChannels: pure(({ frame, channels, loadingChannels }) => {
          const frameEvent = { type: 'LOAD_FRAME', frame };
          return [...loadingChannels].map((channel) => send(frameEvent, channels[channel]));
        }),
        sendLoaded: sendParent('FRAME_LOADED'),
        setFrame: assign((_, { frame }) => ({ frame })),
        useChannel: pure(({ loadingChannels, loadedChannels, channels }, { channel, frame }) => {
          const channelEvent = { type: 'CHANNEL', channel };
          return [
            assign({
              loadingChannels: () => {
                loadingChannels.delete(channel);
                return loadingChannels;
              },
              loadedChannels: loadedChannels.set(channel, true),
            }),
            send(channelEvent),
            send({ type: 'FRAME', frame }, { to: channels[channel] }),
          ];
        }),
        forwardToLoadedChannels: pure(({ channels, loadedChannels }) =>
          [...loadedChannels.keys()].map((channel) => forwardTo(channels[channel]))
        ),
        addLayer: assign({
          layers: ({ layers }) => [
            ...layers,
            spawn(createLayerMachine(layers.length), `layer ${layers.length}`),
          ],
        }),
        removeLayer: assign({
          layers: ({ layers }, { layer }) => [...layers.filter((val) => val !== layer)],
        }),
      },
    }
  );

export default createColorMachine;
