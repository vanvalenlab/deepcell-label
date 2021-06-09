import { Machine, assign, send, sendParent, spawn, actions, forwardTo } from 'xstate';
import { bind, unbind } from 'mousetrap';
import createChannelMachine from './channelMachine';
import createColorMachine from './colorMachine';
import createGrayscaleMachine from './grayscaleMachine';

const { pure, respond } = actions;

const preloadState = {
  entry: 'startPreload',
  on: {
    RAWLOADED: { actions: 'preload' },
  }
};

const frameState = {
  entry: 'loadFrame',
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { cond: 'isLoadingFrame', actions: 'forwardToColorMode' },
        FRAMELOADED: { target: 'loaded', actions: 'sendLoaded' },
      },
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['setFrame', 'forwardToColorMode'] },
        // CHANNEL: { target: 'loading', actions: 'addChannelToLoading' },
      }
    }
  },
  on: {
    LOADFRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['setLoadingFrame', 'forwardToColorMode'],
    },
  }
};

const channelState = {
  on: {
    CHANNEL: { actions: sendParent((c, e) => e) },
    LOADCHANNEL: { actions: ['setLoadingChannel', 'forwardToColorMode'], },
    RAWLOADED: { cond: 'isLoadingChannel', actions: 'forwardToColorMode' },
  }
};

const colorState = {
  entry: [sendParent('COLOR'), assign({ colorMode: ({ color }) => color })],
  on: { TOGGLE_COLOR_MODE: 'grayscale' },
};

const grayscaleState = {
  entry: [sendParent('GRAYSCALE'), assign({ colorMode: ({ grayscale }) => grayscale })],
  invoke: { src: 'listenForInvertHotkey' },
  on: { TOGGLE_COLOR_MODE: 'color' },
  initial: 'idle',
  states: {
    idle: {
      invoke: {
        src: 'listenForChannelHotkeys',
      },
      on: {
        // restart channel hotkey
        CHANNEL: { target: 'idle', actions: 'setChannel', internal: false },
      }
    },
  },
};

const colorModeState = {
  invoke: {
    src: 'listenForColorModeHotkey',
  },
  initial: 'color',
  states: {
    grayscale: grayscaleState,
    color: colorState,
  },
};

// const restoreState = {
//   on: { 
//     RESTORE: [
//       { 
//         cond: (context, event) => context.channel === event.channel, 
//         actions: respond('SAMECONTEXT') ,
//       },
//       { 
//         target: '.restoring',
//         internal: false,
//         actions: respond('RESTORED'),
//       },
//     ],
//     SAVE: { actions: respond(({ feature }) => ({ type: 'RESTORE', feature })) },
//   },
//   initial: 'idle',
//   states: {
//     idle: {},
//     restoring: {
//       entry: send((_, { feature }) => ({ type: 'LOADFEATURE', feature })),
//     },
//   }
// };

const restoreState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        RESTORE: [
          { cond: 'sameContext', actions: respond('SAME_CONTEXT') },
          { target: 'restoring', actions: 'restore' },
        ]
      }
    },
    restoring: {
      on: {
        RAW_LOADED: { cond: 'restoring', target: 'restored', actions: 'updateRestored' },
      },
    },
    checkRestored: {
      always: [
        { cond: 'restored', target: 'restored', actions: 'sendRestored' },
        'restoring',
      ]
    },
    restored: {
      on: {
        USE_RESTORED: { actions: 'useRestored', target: 'idle' },
      },
    },
  }
};

const restoreGuards = {
  sameContext: (context, event) => 
    context.frame === event.frame,
  restoring: ({ restoringFrame }, { frame }) =>
    restoringFrame === frame,
  restored: ({ restoredChannels }) =>
    [...restoredChannels.values()].every(v => v),
};

const restoreActions = {
  save: respond(({ frame }) => ({ type: 'RESTORE', frame })),
  restore: pure(({ channels, loadedChannels }, { frame }, { _event: { origin } }) => {
    return [
      assign({ 
        restoringFrame: frame, 
        restoreResponse: origin,
        restoredChannels: new Map(loadedChannels.map(channel => [channel, false])),
      }),
      ...loadedChannels.map(channel => 
        send({ type: 'LOADFRAME', frame }, { to: channels[channel] })
      ),
    ];
  }),
  updateRestored: assign({ 
    restoredChannels: ({ restoredChannels }, { channel }) => 
      restoredChannels.set(channel, true) 
  }),
  sendRestored: send('RESTORED', { to: ({ restoreResponse: ref }) => ref }),
  useRestored: pure((context) => {
    const { channels, loadedChannels, restoringFrame: frame } = context;
    return [
      assign({ frame }),
      ...loadedChannels.map(channel =>
        send({ type: 'FRAME', frame }, { to: channels[channel] })
      ),
    ];
  }),
};

const createRawMachine = (projectId, numChannels, numFrames) => Machine(
  {
    context: {
      projectId,
      numChannels,
      numFrames,
      channels: [], // all channels that can be used in layers
      channelNames: [], // names of all channels
      frame: 0, // needed?
      loadingFrame: 0, // needed?
      channel: 0,
      colorMode: null,
      color: null,
      grayscale: null,
    },
    entry: ['spawnChannels', 'spawnColorModes'],
    type: 'parallel',
    states: {
      preload: preloadState,
      frame: frameState,
      channel: channelState,
      colorMode: colorModeState,
    },
    on: {
      TOGGLE_INVERT: { actions: forwardTo(({ channel, channels }) => channels[channel]) },
    }
  },
  {
    services: {
      listenForColorModeHotkey: () => (send) => {
        bind('z', () => send('TOGGLE_COLOR_MODE'));
        return () => unbind('z');
      },
      listenForChannelHotkeys: ({ channel, numChannels }) => (send) => {
        const prevChannel = (channel - 1 + numChannels) % numChannels;
        const nextChannel = (channel + 1) % numChannels;
        bind('shift+c', () => send({ type: 'LOADCHANNEL', channel: prevChannel }));
        bind('c', () => send({ type: 'LOADCHANNEL', channel: nextChannel }));
        return () => {
          unbind('shift+c');
          unbind('c');
        }
      },
      listenForInvertHotkey: () => (send) => {
        bind('i', () => send('TOGGLE_INVERT'));
        return () => unbind('i');
      }
    },
    guards: {
      isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
      diffLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      isLoadingChannel: ({ loadingChannel }, { channel }) => loadingChannel === channel,
      diffLoadingChannel: ({ loadingChannel }, { channel }) => loadingChannel !== channel,
    },
    actions: {
      /** Create a channel actor for each channel */
      spawnChannels: assign({
        channels: ({ projectId, numChannels, numFrames }) => {
          return Array(numChannels).fill(0)
            .map((val, index) => spawn(
              createChannelMachine(projectId, index, numFrames),
              `channel${index}`
            ));
        },
        channelNames: ({ numChannels }) => [...Array(numChannels).keys()].map(i => `channel ${i}`),
      }),
      spawnColorModes: assign({
        grayscale: (context) => spawn(createGrayscaleMachine(context), 'grayscale'),
        color: (context) => spawn(createColorMachine(context), 'color'),
      }),
      startPreload: pure(({ channels }) => channels.map(channel => send('PRELOAD', { to: channel }))),
      preload: respond('PRELOAD'),
      sendLoaded: sendParent('RAWLOADED'),
      setLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
      setFrame: assign((_, { frame }) => ({ frame })),
      setChannel: assign((_, { channel }) => ({ channel })),
      setLoadingChannel: assign({ loadingChannel: (_, { channel }) => channel }),
      forwardToColorMode: forwardTo(({ colorMode}) => colorMode ),
    }
  }
);

export default createRawMachine;
