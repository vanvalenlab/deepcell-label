import { actions, assign, forwardTo, Machine, send, sendParent } from 'xstate';

const { pure, respond } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading', // idle?
  states: {
    idle: {},
    loading: {
      on: {
        CHANNEL_LOADED: {
          target: 'loaded',
          cond: 'isLoadingFrame',
          actions: 'sendLoaded',
        },
        // when the channel changes, load the frame for the new channel
        CHANNEL: { actions: 'loadFrame' },
      },
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToChannel'] },
        CHANNEL: { target: 'loading', actions: 'loadFrame' },
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
  initial: 'loading',
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
        FRAME: { actions: 'loadChannel' },
      },
    },
  },
  on: {
    LOAD_CHANNEL: {
      target: '.loading',
      cond: 'diffLoadingChannel',
      actions: ['setLoadingChannel', 'loadChannel'],
    },
  },
};

const createGrayscaleMachine = ({ channels }) =>
  Machine(
    // projectId, numChannels, numFrames
    {
      context: {
        channels, // all channels that can be used in layers
        numChannels: channels.length,
        frame: 0, // needed ??
        loadingFrame: 0, // needed ??
        channel: 0,
        loadingChannel: 0,
      },
      type: 'parallel',
      states: {
        frame: frameState,
        channel: channelState,
      },
      on: {
        TOGGLE_INVERT: { actions: 'toggleInvert' },
      },
    },
    {
      guards: {
        isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
        diffLoadingFrame: ({ loadingFrame }, { frame }) =>
          loadingFrame !== frame,
        isLoadingChannel: ({ loadingChannel }, { channel }) =>
          loadingChannel === channel,
        diffLoadingChannel: ({ loadingChannel }, { channel }) =>
          loadingChannel !== channel,
      },
      actions: {
        setLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
        setLoadingChannel: assign({
          loadingChannel: (_, { channel }) => channel,
        }),
        /** Load frame for all the visible channels. */
        loadFrame: send(
          ({ loadingFrame }) => ({ type: 'LOAD_FRAME', frame: loadingFrame }),
          { to: ({ channels, channel }) => channels[channel] }
        ),
        loadChannel: send(({ frame }) => ({ type: 'LOAD_FRAME', frame }), {
          to: ({ channels, loadingChannel }) => channels[loadingChannel],
        }),
        sendLoaded: sendParent('FRAME_LOADED'),
        useFrame: assign((_, { frame }) => ({ frame })),
        /** Switch to a new channel. */
        useChannel: pure(({ channels }, { channel, frame }) => {
          const channelEvent = { type: 'CHANNEL', channel };
          return [
            assign({ channel }),
            send(channelEvent),
            sendParent(channelEvent),
            send({ type: 'FRAME', frame }, { to: channels[channel] }),
          ];
        }),
        forwardToChannel: forwardTo(
          ({ channels, channel }) => channels[channel]
        ),
      },
    }
  );

export default createGrayscaleMachine;
