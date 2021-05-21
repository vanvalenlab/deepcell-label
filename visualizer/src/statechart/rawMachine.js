import { Machine, assign, send, sendParent, spawn, actions, forwardTo } from 'xstate';
import createChannelMachine from './channelMachine';
import createLayerMachine from './layerMachine';

const { pure, respond } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading',
  states: {
    idle: {
      entry: 'startPreload',
      on: {
        RAWLOADED: { actions: 'preload' },
      },
    },
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
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToChannels'] },
        // CHANNEL: { target: 'loading', actions: 'addChannelToLoading' },
      }
    }
  },
  on: {
    LOADFRAME: {
      target: '.loading',
      cond: 'newLoadingFrame',
      actions: ['assignLoadingFrame', 'loadFrame']
    },
  }
};

// const channelState = {
//   initial: 'idle',
//   states: {
//     idle: {},
//     loading: {
//       on: {
//         RAWLOADED: { target: 'idle', cond: 'loadedChannel', actions: 'useChannel' },
//         FRAME: { actions: 'loadChannel' }, // when frame changes, load that frame instead
//       }
//     },
//   },
//   on: {
//     LOADCHANNEL: { target: '.loading', cond: 'newLoadingChannel', actions: 'loadChannel' },
//   }
// };

const createRawMachine = (projectId, numChannels, numFrames) => Machine(
  {
    context: {
      projectId,
      numChannels,
      numFrames,
      layers: [], // channels displayed in the controller
      channels: [], // all channels that can be used in layers
      channelNames: [], // names of all channels
      // loadingLayers: [], // layers requested by user that we are loading data for
      frame: 0, // needed ??
      loadingFrame: 0, // needed ??
      loadedLayers: [],
      channelsInLayers: [],
      // invert: false,
      // grayscale: true,
    },
    entry: ['spawnChannels', 'spawnLayers'],
    type: 'parallel',
    states: {
      frame: frameState,
      // channel: channelState,
    },
    on: {
      ADD_LAYER: { actions: 'addLayer' },
      REMOVE_LAYER: { actions: 'removeLayer' },
      CHANNEL_IN_LAYER: {},
    }
  },
  {
    guards: {
      /** Check if all channels in layers are loaded. */
      loaded: ({ loadedChannels }) => [...loadedChannels.values()].every(v => v),
      /** Check if the data is for the loading frame. */
      isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
      newLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      isLoadingChannel: ({ loadingChannels }, { channel }) => loadingChannels.has(channel),
      newLoadingChannel: ({ loadingChannels }, { channel }) => !loadingChannels.has(channel),
    },
    actions: {
      /** Create a channel actor for each channel */
      spawnChannels: assign({
        channels: ({ projectId, numChannels, numFrames }) => {
          return Array(numChannels)
            .fill(0)
            .map((val, index) => spawn(
              createChannelMachine(projectId, index, numFrames), `channel${index}`
            ));
        },
        channelNames: ['nuclear', 'membrane'],
      }),
      spawnLayers: assign({
        layers: ({ numChannels }) => {
          const numLayers = Math.min(3, numChannels);
          return [...Array(numLayers).keys()]
            .map(index => spawn(createLayerMachine(index, index)))
        },
        loadedChannels: ({ numChannels }) => {
          const numLayers = Math.min(3, numChannels);
          return [...Array(numLayers).keys()].reduce(function(map, channel) {
              map.set(channel, false);
              return map;
          }, new Map());
        }
      }),
      /** Record that a channel is loaded. */
      updateLoaded: assign({
        loadedChannels: ({ loadedChannels }, { channel }) => {
          return loadedChannels.set(channel, true);
        }
      }),
      assignLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
      /** Load a frame for all the channels. */
      loadFrame: pure(({ loadingFrame, channels, loadedChannels }) => {
        return [
          assign({
            loadedChannels: ({ loadedChannels }) => {
              loadedChannels.forEach((val, key, map) => map.set(key, false));
              return loadedChannels;
            }
          }),
          ...channels
          .filter((channel, index) => loadedChannels.has(index))
          .map(channel => send(
            { type: 'LOADFRAME', frame: loadingFrame },
            { to: channel }
          ))
        ];
      }),
      loadChannel: pure(({ loadingFrame, channels }, { channel }) => {
        return [
          assign({
            loadingChannels: ({ loadingChannels }) => [...loadingChannels, channel]
          }),
          send({ type: 'LOADFRAME', frame: loadingFrame }, { to: channels[channel] })
        ];
      }),
      /** Start preloading in all channels. */
      startPreload: pure(
        ({ channels }) => channels.map(channel => send('PRELOAD', { to: channel }))
      ),
      /** Preload another frame after a channel preloads the last one. */
      preload: respond('PRELOAD'),
      /** Tell imageMachine that all channels in layers are loaded. */
      sendLoaded: sendParent('RAWLOADED'),
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      useFrame: assign((_, { frame }) => ({ frame })),
      useChannel: pure(({ loadingChannels, loadedChannels, channels }, { channel, frame }) => {
        const channelEvent = { type: 'CHANNEL', channel };
        return [
          assign({
            loadingChannels: loadingChannels.filter(val => val !== channel),
            loadedChannels: loadedChannels.set(channel, true),
          }),
          send(channelEvent),
          sendParent(channelEvent),
          send({ type: 'FRAME', frame }, { to: channels[channel] } ),
        ]
      }),
      addChannelToLoading: () => { },
      forwardToChannels: pure(({ channels }) => channels.map(channel => forwardTo(channel))),
      addLayer: assign({ layers: ({ layers }) => [...layers, spawn(createLayerMachine(layers.length))] }),
      removeLayer: assign({ layers: ({ layers }, { layer }) => [...layers.filter(val => val !== layer )] }),
      // loadFrameForNewChannel: pure(({ loadedLayers, loadingFrame, channels }, { channel }) => {
      //   const addToLoaded = assign({ loadedLayers: { ...loaded, raw: { ...loaded.raw, [channel]: false } } });
      //   const sendLoad = send(
      //     { type: 'LOADFRAME', frame: loadingFrame },
      //     { to: channels[channel] }
      //   );
      //   return [addToLoaded, sendLoad];
      // }),
          
      // }),
    }
  }
);

export default createRawMachine;
