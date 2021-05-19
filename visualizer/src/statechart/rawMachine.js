import { Machine, assign, send, sendParent, spawn, actions, forwardTo } from 'xstate';
import createChannelMachine from './channelMachine';

const { pure, respond } = actions;

const CHANNEL_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00'];


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
        // CHANNEL: { actions: 'loadFrameForNewChannel' },
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
        // CHANNEL: { target: 'loading', actions: 'loadFrameForNewChannel' },
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
//     LOADCHANNEL: { target: '.loading', cond: 'newLoadingChannel', actions: ['assignLoadingChannel','loadChannel'] },
//   }
// };

const createRawMachine = (projectId, numChannels, numFrames) => Machine(
  {
    context: {
      projectId,
      numChannels,
      numFrames,
      layers: [], // channels displayed in the controller
      activeLayers: [], // whether to show channel
      layerColors: [], // color to display channel with
      channelNames: [], // names of all channels
      // loadingLayers: [], // layers requested by user that we are loading data for
      frame: 0, // needed ??
      loadingFrame: 0, // needed ??
      channels: [], // all channels that can be used in layers
      loadedLayers: [],
      // invert: false,
      // grayscale: true,
    },
    entry: 'spawnChannels',
    type: 'parallel',
    states: {
      frame: frameState,
      // channel: channelState,
    },
    on: {
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      // SETBRIGHTNESS: { actions: forwardTo(({ channels, channel }) => channels[channel]) },
      // SETCONTRAST: { actions: forwardTo(({ channels, channel }) => channels[channel]) },
    }
  },
  {
    guards: {
      /** Check if all channels in layers are loaded. */
      loaded: ({ loadedLayers }) => loadedLayers.every(v => v),
      /** Check if the data is for the loading frame. */
      isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
      newLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
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
        layers: ({ numChannels }) => [...Array(numChannels).keys()],
        activeLayers: ({ numChannels }) => Array(numChannels).fill(true),
        layerColors: ({ numChannels }) => CHANNEL_COLORS.slice(0, numChannels),
        channelNames: ['nuclear', 'membrane'],
      }),
      /** Record that a channel in layers is loaded. */
      updateLoaded: assign({
        loadedLayers: ({ loadedLayers, layers }, { channel }) =>
          loadedLayers.map((loaded, index) =>
            layers[index] === channel ? true : loaded,
          ),
      }),
      /** Load a frame for all the channels in layers. */
      loadFrame: pure(({ loadingFrame, channels, layers }) => {
        return channels
          .filter((channel, index) => index in layers)
          .map(channel => send(
            { type: 'LOADFRAME', frame: loadingFrame },
            { to: channel }
          ));
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
      forwardToChannels: pure(({ channels }) => channels.map(channel => forwardTo(channel))),
      // loadFrameForNewChannel: pure(({ loadedLayers, loadingFrame, channels }, { channel }) => {
      //   const addToLoaded = assign({ loadedLayers: { ...loaded, raw: { ...loaded.raw, [channel]: false } } });
      //   const sendLoad = send(
      //     { type: 'LOADFRAME', frame: loadingFrame },
      //     { to: channels[channel] }
      //   );
      //   return [addToLoaded, sendLoad];
      // }),
    }
  }
);

export default createRawMachine;
