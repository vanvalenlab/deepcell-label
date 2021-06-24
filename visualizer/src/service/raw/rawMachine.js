import { bind, unbind } from 'mousetrap';
import {
  actions,
  assign,
  forwardTo,
  Machine,
  send,
  sendParent,
  spawn,
} from 'xstate';
import createChannelMachine from './channelMachine';
import createColorMachine from './colorMachine';
import createGrayscaleMachine from './grayscaleMachine';

const { pure, respond } = actions;

const preloadState = {
  entry: 'startPreload',
  on: {
    RAW_LOADED: { actions: 'preload' },
  },
};

const frameState = {
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        RAW_LOADED: { cond: 'isLoadingFrame', actions: 'forwardToColorMode' },
        FRAME_LOADED: { target: 'loaded', actions: 'sendLoaded' },
      },
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['setFrame', 'forwardToColorMode'] },
        CHANNEL: { target: 'loading' },
      },
    },
  },
  on: {
    LOAD_FRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['setLoadingFrame', 'forwardToColorMode'],
    },
  },
};

const channelState = {
  on: {
    CHANNEL: { actions: sendParent((c, e) => e) },
    LOAD_CHANNEL: { actions: 'forwardToColorMode' },
    RAW_LOADED: { actions: 'forwardToColorMode' },
  },
};

const colorState = {
  entry: [sendParent('COLOR'), assign({ colorMode: ({ color }) => color })],
  on: { TOGGLE_COLOR_MODE: 'grayscale' },
};

const grayscaleState = {
  entry: [
    sendParent('GRAYSCALE'),
    assign({ colorMode: ({ grayscale }) => grayscale }),
  ],
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
      },
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
    RESTORE: {
      actions: ['restore', respond('RESTORED')],
    },
    SAVE: { actions: 'save' },
  },
};

const createRawMachine = (projectId, numChannels, numFrames) =>
  Machine(
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
        TOGGLE_INVERT: {
          actions: forwardTo(({ channel, channels }) => channels[channel]),
        },
      },
    },
    {
      services: {
        listenForColorModeHotkey: () => send => {
          bind('s', () => send('TOGGLE_COLOR_MODE'));
          return () => unbind('s');
        },
        listenForChannelHotkeys:
          ({ channel, numChannels }) =>
          send => {
            const prevChannel = (channel - 1 + numChannels) % numChannels;
            const nextChannel = (channel + 1) % numChannels;
            bind('shift+c', () =>
              send({ type: 'LOAD_CHANNEL', channel: prevChannel })
            );
            bind('c', () =>
              send({ type: 'LOAD_CHANNEL', channel: nextChannel })
            );
            return () => {
              unbind('shift+c');
              unbind('c');
            };
          },
        listenForInvertHotkey: () => send => {
          bind('i', () => send('TOGGLE_INVERT'));
          return () => unbind('i');
        },
      },
      guards: {
        isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
        diffLoadingFrame: ({ loadingFrame }, { frame }) =>
          loadingFrame !== frame,
      },
      actions: {
        /** Create a channel actor for each channel */
        spawnChannels: assign({
          channels: ({ projectId, numChannels, numFrames }) => {
            return Array(numChannels)
              .fill(0)
              .map((val, index) =>
                spawn(
                  createChannelMachine(projectId, index, numFrames),
                  `channel${index}`
                )
              );
          },
          channelNames: ({ numChannels }) =>
            [...Array(numChannels).keys()].map(i => `channel ${i}`),
        }),
        spawnColorModes: assign({
          grayscale: context =>
            spawn(createGrayscaleMachine(context), 'grayscale'),
          color: context => spawn(createColorMachine(context), 'color'),
        }),
        startPreload: pure(({ channels }) =>
          channels.map(channel => send('PRELOAD', { to: channel }))
        ),
        preload: respond('PRELOAD'),
        sendLoaded: sendParent('RAW_LOADED'),
        setLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
        setFrame: assign((_, { frame }) => ({ frame })),
        setChannel: assign((_, { channel }) => ({ channel })),
        forwardToColorMode: forwardTo(({ colorMode }) => colorMode),
        save: respond(({ channel }) => ({ type: 'RESTORE', channel })),
        restore: send((_, { channel }) => ({ type: 'LOAD_CHANNEL', channel })),
      },
    }
  );

export default createRawMachine;
