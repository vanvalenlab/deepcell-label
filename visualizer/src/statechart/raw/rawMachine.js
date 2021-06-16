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
        CHANNEL: { target: 'loading' },
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
    LOADCHANNEL: { actions: 'forwardToColorMode', },
    RAWLOADED: { actions: 'forwardToColorMode' },
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

const restoreState = {
  on: { 
    RESTORE: [
      { 
        cond: (context, event) => context.channel === event.channel, 
        actions: respond('SAMECONTEXT') ,
      },
      { 
        target: '.restoring',
        internal: false,
        actions: respond('RESTORED'),
      },
    ],
    SAVE: { actions: respond(({ channel }) => ({ type: 'RESTORE', channel })) },
  },
  initial: 'idle',
  states: {
    idle: {},
    restoring: {
      entry: send((_, { channel }) => ({ type: 'LOADCHANNEL', channel })),
    },
  }
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
      restore: restoreState,
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
      forwardToColorMode: forwardTo(({ colorMode }) => colorMode),
    }
  }
);

export default createRawMachine;
