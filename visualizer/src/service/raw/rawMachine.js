import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createChannelMachine from './channelMachine';
import createColorMachine from './colorMachine';
import createGrayscaleMachine from './grayscaleMachine';

const { pure, respond } = actions;

const preloadState = {
  entry: 'startPreload',
  on: {
    CHANNEL_LOADED: { actions: 'preload' },
  },
};

const frameState = {
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        CHANNEL_LOADED: {
          cond: 'isLoadingFrame',
          actions: 'forwardToDisplay',
        },
        FRAME_LOADED: { target: 'loaded', actions: 'sendLoaded' },
      },
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['setFrame', 'forwardToDisplay'] },
        CHANNEL: { target: 'loading' },
      },
    },
  },
  on: {
    LOAD_FRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['setLoadingFrame', 'forwardToDisplay'],
    },
  },
};

const channelState = {
  on: {
    CHANNEL: { actions: sendParent((c, e) => e) },
    LOAD_CHANNEL: { actions: 'forwardToDisplay' },
    CHANNEL_LOADED: { actions: 'forwardToDisplay' },
  },
};

const colorState = {
  entry: [sendParent('COLOR'), assign({ isGrayscale: false })],
  on: { TOGGLE_COLOR_MODE: 'grayscale' },
};

const grayscaleState = {
  entry: [sendParent('GRAYSCALE'), assign({ isGrayscale: true })],
  on: {
    TOGGLE_COLOR_MODE: 'color',
    RESET: { actions: 'forwardToChannel' },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        // restart channel hotkey
        CHANNEL: { target: 'idle', actions: 'setChannel', internal: false },
      },
    },
  },
};

const displayState = {
  initial: 'initial',
  states: {
    initial: {
      always: [
        { cond: ({ isGrayscale }) => isGrayscale, target: 'grayscale' },
        { target: 'color' },
      ],
    },
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
        grayscaleMode: null,
        isGrayscale: Number(numChannels) === 1,
      },
      entry: ['spawnChannels', 'spawnColorModes'],
      type: 'parallel',
      states: {
        preload: preloadState,
        frame: frameState,
        channel: channelState,
        display: displayState,
        restore: restoreState,
      },
      on: {
        TOGGLE_INVERT: { actions: 'forwardToChannel' },
      },
    },
    {
      guards: {
        isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
        diffLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      },
      actions: {
        /** Create a channel actor for each channel */
        spawnChannels: assign({
          channels: ({ projectId, numChannels, numFrames }) => {
            return Array(numChannels)
              .fill(0)
              .map((val, index) =>
                spawn(createChannelMachine(projectId, index, numFrames), `channel${index}`)
              );
          },
          channelNames: ({ numChannels }) =>
            [...Array(numChannels).keys()].map((i) => `channel ${i}`),
        }),
        spawnColorModes: assign({
          grayscaleMode: (context) => spawn(createGrayscaleMachine(context), 'grayscaleMode'),
          colorMode: (context) => spawn(createColorMachine(context), 'colorMode'),
        }),
        startPreload: pure(({ channels }) =>
          channels.map((channel) => send('PRELOAD', { to: channel }))
        ),
        preload: respond('PRELOAD'),
        sendLoaded: sendParent('RAW_LOADED'),
        setLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
        setFrame: assign((_, { frame }) => ({ frame })),
        setChannel: assign((_, { channel }) => ({ channel })),
        forwardToDisplay: forwardTo(({ isGrayscale }) =>
          isGrayscale ? 'grayscaleMode' : 'colorMode'
        ),
        forwardToChannel: forwardTo(({ channel, channels }) => channels[channel]),
        save: respond(({ channel, isGrayscale }) => ({ type: 'RESTORE', channel, isGrayscale })),
        restore: pure((context, event) => {
          const actions = [];
          actions.push(send({ type: 'LOAD_CHANNEL', channel: event.channel }));
          if (context.isGrayscale !== event.isGrayscale) {
            actions.push(send({ type: 'TOGGLE_COLOR_MODE' }));
          }
          return actions;
        }),
      },
    }
  );

export default createRawMachine;
