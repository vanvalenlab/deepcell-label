import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createChannelMachine from './channelMachine';
import createFeatureMachine from './featureMachine';
import { respond } from 'xstate/lib/actions';

const { pure } = actions;

const frameState = {
  entry: ['loadRawFrame', 'loadLabeledFrame'],
  initial: 'loading',
  states: {
    idle: {
      entry: ['preloadRawFrame', 'preloadLabeledFrame', 'preloadFeatures', 'preloadChannels'],
      on: {
        RAWLOADED: { actions: 'preloadRawFrame' },
        LABELEDLOADED: { actions: 'preloadLabeledFrame' },
      },
    },
    loading: {
      on: {
        RAWLOADED: { target: 'rawLoaded', cond: 'loadedFrame' },
        LABELEDLOADED: { target: 'labeledLoaded', cond: 'loadedFrame' },
        CHANNEL: { actions: 'loadRawFrame' },
        FEATURE: { actions: 'loadLabeledFrame' },
      },
    },
    labeledLoaded: {
      on: {
        RAWLOADED: { target: 'idle', cond: 'loadedFrame', actions: 'useFrame' },
        FEATURE: { target: 'loading', actions: 'loadLabeledFrame' },
      },
    },
    rawLoaded: {
      on: {
        LABELEDLOADED: { target: 'idle', cond: 'loadedFrame', actions: 'useFrame' },
        CHANNEL: { target: 'loading', actions: 'loadRawFrame' },
      },
    },
  },
  on: {
    LOADFRAME: { target: '.loading', cond: 'newLoadingFrame', actions: ['assignLoadingFrame', 'loadRawFrame', 'loadLabeledFrame'] },
  }
};

const featureState = {
  initial: 'idle',
  states: {
    idle: {},
    loading: {
      on: {
        LABELEDLOADED: { target: 'idle', cond: 'loadedFeature', actions: 'useFeature' },
        FRAME: { actions: 'loadFeature' },
      }
    },
  },
  on: {
    LOADFEATURE: { target: '.loading', actions: ['assignLoadingFeature', 'loadFeature'] },
    LABELEDARRAY: { actions: forwardTo(({ toolRef }) => toolRef) },
  }
};

const channelState = {
  initial: 'idle',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: [
          { target: 'idle', cond: 'loadedChannel', actions: 'useChannel' },
          { actions: (c, e) => console.log(e)}],
        FRAME: { actions: 'loadChannel' },
      }
    },
  },
  on: {
    LOADCHANNEL: { target: '.loading', actions: ['assignLoadingChannel','loadChannel'] },
  }
};

const restoringState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        RESTORE: [
          // { cond: 'canRestore', target: 'restoring', actions: ['saveHistoryRef', 'restore'] },
          { actions: respond('SAMECONTEXT') },
        ]
      }
    },
    // restoring: {
    //     on: {
    //       RAWLOADED: { target: 'checkRestored', actions: assign({ loadedFrame: (_, evt) => evt.frame }) },
    //       LABELEDLOADED: { target: 'checkRestored', actions: assign({ loadedFeature: (_, evt) => evt.frame }) },
    //       CHANNEL: { target: 'checkRestored', actions: assign({ loadedChannel: (_, evt) => evt.frame }) },
    //     },
    // },
    // restoringFrame: {},
    // restoringFeature: {},
    // restoringChannel: {
    //   on: {
    //     RAWLOADED: { target: 'idle', cond: ({ restoringChannel, restoringFrame }, { channel, frame}) => }
    //   }
    // },
    // checkRestored: {
    //   entry: (context, event) => console.log(event),
    //   always: [
    //     { cond: 'restored', target: 'idle', actions: 'restored' },
    //     'restoring',
    //   ]
    // },
  }
}

const imageGuards = {
  newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
  newLoadingChannel: (context, event) => context.loadingChannel !== event.channel,
  newLoadingFeature: (context, event) => context.loadingFeature !== event.feature,
  loadedFrame: (context, event) => {
    return (context.loadingFrame === event.frame &&
      (context.channel === event.channel || context.feature === event.feature));
  },
  loadedChannel: (context, event) => context.frame === event.frame && context.loadingChannel === event.channel,
  loadedFeature: (context, event) => context.frame === event.frame && context.loadingFeature === event.feature,
  // restored: (context, event) => ( // just a guess, not sure about this approach
  //   context.restoredFrame === event.restoringFrame
  //   && context.restoredFeature === event.restoringFeature
  //   && context.restoredChannel === event.restoringChannel
  // ),
  // canRestore: ({ frame, feature, channel }, event) => (
  //   frame !== event.frame
  //   || feature !== event.feature
  //   || channel !== event.channel
  // ),
  // restored: ({ frame, feature, channel, loadedFrame, loadedFeature, loadedChannel, nextFrame, nextFeature, nextChannel }) => (
  //   (frame === nextFrame || loadedFrame === nextFrame)
  //   && (feature === nextFeature || loadedFeature === nextFeature)
  //   && (channel === nextChannel || loadedChannel === nextChannel)
  // ),
};

const imageActions = {
  handleProject: assign(
    (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
      return {
        frame, feature, channel,
        numFrames, numFeatures, numChannels,
        loadingFrame: frame,
      };
    }
  ),
  spawnActors: assign({
    channels: ({ projectId, numChannels, numFrames, channels }) => {
      if (Object.keys(channels).length !== 0) return channels;
      channels = {};
      for (let channel = 0; channel < numChannels; channel++) {
        channels[channel] = spawn(createChannelMachine(projectId, channel, numFrames), `channel${channel}`);
      }
      return channels;
    },
    features: ({ projectId, numFeatures, numFrames, features}) => {
      if (Object.keys(features).length !== 0) return features;
      features = {};
      for (let feature = 0; feature < numFeatures; feature++) {
        features[feature] = spawn(createFeatureMachine(projectId, feature, numFrames), `feature${feature}`);
      }
      return features;
    },
  }),
  assignLoadingFrame: assign({ loadingFrame: (context, { frame }) => frame }),
  assignLoadingChannel: assign({ loadingChannel: (context, { channel }) => channel }),
  assignLoadingFeature: assign({ loadingFeature: (context, { feature }) => feature }),
  loadLabeledFrame: send(
    ({ loadingFrame}) => ({ type: 'LOADFRAME', frame: loadingFrame }),
    { to: ({ features, feature }) => features[feature] }
  ),
  loadRawFrame: send(
    ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
    { to: ({ channels, channel }) => channels[channel] }
  ),
  loadFeature: send(
    ({ frame }) => ({ type: 'LOADFRAME', frame }),
    { to: ({ features, loadingFeature }) => features[loadingFeature] },
  ),
  loadChannel: send(
    ({ frame }) => ({ type: 'LOADFRAME', frame }),
    { to: ({ channels, loadingChannel }) => channels[loadingChannel] }
  ),
  preloadRawFrame: send('PRELOAD', { to: ({ channels, channel }) => channels[channel] }),
  preloadLabeledFrame: send('PRELOAD', { to: ({ features, feature }) => features[feature] }),
  preloadFeatures: pure(({ frame, feature, features }) => {
    const loadFrame = { type: 'LOADFRAME', frame };
    return Object.entries(features)
      .filter(([key, val]) => Number(key) !== feature)
      // .filter(([key, val]) => Math.abs(Number(key) - feature) < 3)
      .map(([key, val]) => send(loadFrame, { to: val }));
  }),
  preloadChannels: pure(({ frame, channel, channels }) => {
    const loadFrame = { type: 'LOADFRAME', frame };
    return Object.entries(channels)
      .filter(([key, val]) => Number(key) !== channel)
      // .filter(([key, val]) => Math.abs(Number(key) - channel) < 3)
      .map(([key, val]) => send(loadFrame, { to: val }));
  }),
  useFrame: pure(({ channel, channels, feature, features, toolRef }, { frame }) => {
    const frameEvent = { type: 'FRAME', frame };
    return [
      assign({ frame }),
      send(frameEvent),
      send(frameEvent, { to: channels[channel] }),
      send(frameEvent, { to: features[feature] }),
      send(frameEvent, { to: toolRef }),
    ];
  }),
  useFeature: pure(({ features, toolRef }, { feature, frame }) => {
    const featureEvent = { type: 'FEATURE', feature, frame };
    return [
      assign({ feature }),
      send(featureEvent),
      send(featureEvent, { to: features[feature] }),
      send(featureEvent, { to: toolRef }),
    ];
  }),
  useChannel: pure(({ channels, toolRef }, { channel, frame }) => {
    const channelEvent = { type: 'CHANNEL', channel, frame };
    return [
      assign({ channel }),
      send(channelEvent),
      send(channelEvent, { to: channels[channel] }),
      send(channelEvent, { to: toolRef }),
    ];
  }),
  toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
  toggleShowNoLabel: assign({ showNoLabel: ({ showNoLabel }) => !showNoLabel }),
  setOpacity: assign({ opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)) }),
  setOutline: assign({ outline: (_, { outline }) => outline }),
  toggleInvert: assign({ invert: (context) => !context.invert }),
  toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
};

const createImageMachine = ({ projectId }) => Machine(
  {
    id: 'image',
    context: {
      projectId,
      frame: 0,
      feature: 0,
      channel: 0,
      loadingFrame: 0,
      loadingFeature: 0,
      loadingChannel: 0,
      numFrames: 1,
      numFeatures: 1,
      numChannels: 1,
      channels: {},
      features: {},
      opacity: 0.3,
      highlight: true,
      showNoLabel: true,
      outline: 'all',
      invert: true,
      grayscale: true,
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: { target: 'setUpActors', actions: 'handleProject' },
        },
      },
      setUpActors: {
        always: { target: 'idle', actions: 'spawnActors' },
      },
      idle: {
        type: 'parallel',
        states: {
          frame: frameState,
          feature: featureState,
          channel: channelState,
        },
      },
      restoring: restoringState,
    },
    on: {
      LOADED: { actions: forwardTo((context, event) => context.features[event.data.feature]) },
      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
      SAVE: { actions: 'save' },
      // image adjustment
      TOGGLEHIGHLIGHT: { actions: 'toggleHighlight' },
      SETOUTLINE: { actions: 'setOutline' },
      SETOPACITY: { actions: 'setOpacity' },
      TOGGLESHOWNOLABEL: { actions: 'toggleShowNoLabel' },
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      SETBRIGHTNESS: { actions: forwardTo(({ channels, channel }) => channels[channel]) },
      SETCONTRAST: { actions: forwardTo(({ channels, channel }) => channels[channel]) },
    },
  },
  {
    guards: { ...imageGuards },
    actions: {
      ...imageActions,
      saveHistoryRef: assign({ historyRef: (_, __, { _event: { origin } }) => origin }),
      save: respond(({ frame, feature, channel }) => ({ type: 'RESTORE', frame, feature, channel })),
      restore: pure((context, event) => {
        return [
          send({ type: 'LOADFRAME', frame: event.frame }),
          send({ type: 'LOADCHANNEL', channel: event.channel }),
          send({ type: 'LOADFEATURE', feature: event.feature }),
        ];
      }),
      restored: pure((context, event) => {
        const { toolRef, historyRef, nextFrame: frame, nextChannel: channel, nextFeature: feature } = context;
        return [
          assign({ frame, channel, feature }),
          send({ type: 'FRAME', frame }, { to: toolRef }),
          send({ type: 'CHANNEL', channel }, { to: toolRef }),
          send({ type: 'FEATURE', feature }, { to: toolRef }),
          send('RESTORED', { to: historyRef }),
        ];
      }),
    }
  });

export default createImageMachine;
