import { Machine, assign, send, sendParent, spawn, actions, forwardTo } from 'xstate';
import createLayerMachine from './layerMachine';

const { pure, respond } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading', // idle?
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { target: 'checkLoaded', cond: 'isLoadingFrame', actions: 'updateLoaded' },
        // when the channel changes before the frame does, 
        // we need to load the frame for the new channel
        // CHANNEL: { actions: 'addChannelToLoading' },
      },
    },
    checkLoaded: {
      always: [
        { cond: 'loaded', target: 'loaded', actions: 'sendLoaded' },
        { target: 'loading' }
      ],
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToLoadedChannels'] },
        // CHANNEL: { target: 'loading', actions: 'addChannelToLoading' },
      }
    }
  },
  on: {
    LOADFRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['assignLoadingFrame', 'loadFrame']
    },
  }
};

const channelState = {
  initial: 'idle',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { target: 'idle', cond: 'isLoadingChannel', actions: 'useChannel' },
         // when frame changes, load that frame instead
        FRAME: { actions: 'reloadLoadingChannels' },
      }
    },
  },
  on: {
    LOADCHANNEL: {
      target: '.loading',
      cond: 'diffLoadingChannel', 
      actions: 'loadChannel',
    },
  }
};

const createRawMachine = ({ channels }) => Machine( // projectId, numChannels, numFrames
  {
    context: {
      channels, // all channels that can be used in layers
      numChannels: channels.length,
      layers: [], // channels displayed in the controller
      // loadingLayers: [], // layers requested by user that we are loading data for
      frame: 0, // needed ??
      loadingFrame: 0, // needed ??
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
    }
  },
  {
    guards: {
      /** Check if all channels in layers are loaded. */
      loaded: ({ loadedChannels }) => [...loadedChannels.values()].every(v => v),
      /** Check if the data is for the loading frame. */
      isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
      diffLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      isLoadingChannel: ({ loadingChannels }, { channel }) => loadingChannels.has(channel),
      diffLoadingChannel: ({ loadedChannels, loadingChannels }, { channel }) => !loadedChannels.has(channel) && !loadingChannels.has(channel),
    },
    actions: {
      spawnLayers: assign({
        layers: ({ numChannels }) => {
          const numLayers = Math.min(3, numChannels);
          return [...Array(numLayers).keys()]
            .map(index => spawn(createLayerMachine(index, index), `layer ${index}`));
        },
        loadedChannels: ({ numChannels }) => {
          const numLayers = Math.min(3, numChannels);
          return [...Array(numLayers).keys()].reduce(function(map, channel) {
              map.set(channel, false);
              return map;
          }, new Map());
        },
      }),
      /** Record that a channel is loaded. */
      updateLoaded: assign({
        loadedChannels: ({ loadedChannels }, { channel }) => {
          return loadedChannels.set(channel, true);
        }
      }),
      assignLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
      /** Load frame for all the visible channels. */
      loadFrame: pure(({ loadingFrame, channels, loadedChannels }) => {
        return [
          assign({
            loadedChannels: ({ loadedChannels }) => {
              loadedChannels.forEach((val, key, map) => map.set(key, false));
              return loadedChannels;
            }
          }),
          // load frame in each visible
          ...channels
          .filter((channel, index) => loadedChannels.has(index))
          .map(channel => send(
            { type: 'LOADFRAME', frame: loadingFrame },
            { to: channel }
          ))
        ];
      }),
      loadChannel: pure(({ frame, channels }, { channel }) => {
        return [
          assign({
            loadingChannels: ({ loadingChannels }) => loadingChannels.add(channel)
          }),
          send({ type: 'LOADFRAME', frame }, { to: channels[channel] })
        ];
      }),
      /** Load a different frame in the loading channels. */
      reloadLoadingChannels: pure(({ frame, channels, loadingChannels }) => {
        const frameEvent = { type: 'LOADFRAME', frame };
        return [...loadingChannels].map(channel => send(frameEvent, channels[channel]));
      }),
      sendLoaded: sendParent('FRAMELOADED'),
      useFrame: assign((_, { frame }) => ({ frame })),
      useChannel: pure(({ loadingChannels, loadedChannels, channels }, { channel, frame }) => {
        const channelEvent = { type: 'CHANNEL', channel };
        return [
          assign({
            loadingChannels: loadingChannels.delete(channel),
            loadedChannels: loadedChannels.set(channel, true),
          }),
          send(channelEvent),
          send({ type: 'FRAME', frame }, { to: channels[channel] } ),
        ]
      }),
      forwardToLoadedChannels: pure(
        ({ channels, loadedChannels }) => 
          [...loadedChannels.keys()].map(channel => forwardTo(channels[channel]))
      ),
      addLayer: assign({ layers: ({ layers }) => [...layers, spawn(createLayerMachine(layers.length), `layer ${layers.length}`)] }),
      removeLayer: assign({ layers: ({ layers }, { layer }) => [...layers.filter(val => val !== layer )] }),
    }
  }
);

export default createRawMachine;