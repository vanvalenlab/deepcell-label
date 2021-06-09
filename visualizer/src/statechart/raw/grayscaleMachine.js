import { Machine, assign, send, sendParent, spawn, actions, forwardTo } from 'xstate';

const { pure, respond } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading', // idle?
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { target: 'loaded', cond: 'isLoadingFrame', actions: 'sendLoaded' },
        // when the channel changes, load the frame for the new channel
        CHANNEL: { actions: 'loadFrame' },
      },
    },
    loaded: {
      on: {
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToChannel'] },
        CHANNEL: { target: 'loading', actions: 'loadFrame' },
      }
    }
  },
  on: {
    LOADFRAME: {
      target: '.loading',
      cond: 'diffLoadingFrame',
      actions: ['assignLoadingFrame', 'loadFrame'],
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
        FRAME: { actions: 'loadChannel' },
      }
    },
  },
  on: {
    LOADCHANNEL: {
      target: '.loading',
      cond: 'newChannel', 
      actions: 'loadChannel',
    },
  }
};

const createRawMachine = ({ channels }) => Machine( // projectId, numChannels, numFrames
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
    }
  },
  {
    guards: {
      isLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame === frame,
      diffLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      isLoadingChannel: ({ loadingChannel }, { channel }) => loadingChannel === channel,
      diffLoadingChannel: ({ loadingChannel }, { channel }) => loadingChannel !== channel,
    },
    actions: {
      assignLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
      /** Load frame for all the visible channels. */
      loadFrame: send(
        ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
        { to: ({ channels, channel }) => channels[channel] }
      ),
      loadChannel: send(
        ({ frame }) => ({ type: 'LOADFRAME', frame }),
        { to: ({ channels, loadingChannel }) => channels[loadingChannel] },
      ),
      sendLoaded: sendParent('FRAMELOADED'),
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
      forwardToLoadedChannels: pure(
        ({ channels, loadedChannels }) => 
          [...loadedChannels.keys()].map(channel => forwardTo(channels[channel]))
      ),
      forwardToChannel: forwardTo(({ features, feature }) => features[feature]),
    }
  }
);

export default createRawMachine;