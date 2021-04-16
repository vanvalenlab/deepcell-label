import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createChannelMachine from './channelMachine';
import createFeatureMachine from './featureMachine';
import { respond } from 'xstate/lib/actions';

const { pure } = actions;

const frameState = {
  entry: ['loadRawFrame', 'loadLabeledFrame'],
  initial: 'loading',
  states: {
    idle: {},
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
        RAWLOADED: { target: 'idle', cond: 'loadedChannel', actions: 'useChannel' },
        FRAME: { actions: 'loadChannel' },
      }
    },
  },
  on: {
    LOADCHANNEL: { target: '.loading', actions: ['assignLoadingChannel','loadChannel'] },
  }
};

const imageGuards = {
  newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
  newLoadingChannel: (context, event) => context.loadingChannel !== event.channel,
  newLoadingFeature: (context, event) => context.loadingFeature !== event.feature,
  loadedFrame: (context, event) => context.loadingFrame === event.frame,
  loadedFeature: (context, event) => context.frame === event.frame && context.loadingChannel === event.channel,
  loadedChannel: (context, event) => context.frame === event.frame && context.loadingFeature === event.feature,
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
  spawnActors: assign((context) => {
    const { projectId, numChannels, numFeatures } = context;
    const channels = {};
    const features = {};
    for (let channel = 0; channel < numChannels; channel++) {
      channels[channel] = spawn(createChannelMachine(projectId, channel), `channel${channel}`);
    }
    for (let feature = 0; feature < numFeatures; feature++) {
      features[feature] = spawn(createFeatureMachine(projectId, feature), `feature${feature}`);
    }
    return { channels, features };
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
  useFeature: pure(({ features, toolRef }, { feature }) => {
    const featureEvent = { type: 'FEATURE', feature };
    return [
      assign({ feature }),
      send(featureEvent),
      send(featureEvent, { to: features[feature] }),
      send(featureEvent, { to: toolRef }),
    ];
  }),
  useChannel: pure(({ channels, toolRef }, { channel }) => {
    const channelEvent = { type: 'CHANNEL', channel };
    return [
      assign({ channel }),
      send(channelEvent),
      send(channelEvent, { to: channels[channel] }),
      send(channelEvent, { to: toolRef }),
    ];
  }),
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
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: { target: 'idle', actions: 'handleProject', },
        },
      },
      idle: {
        entry: 'spawnActors',
        type: 'parallel',
        states: {
          frame: frameState,
          feature: featureState,
          channel: channelState,
        },
      },
      restoring: {
        on: {
          FRAME: { target: 'checkRestored', actions: assign({ loadedFrame: (_, evt) => evt.frame }) },
          FEATURE: { target: 'checkRestored', actions: assign({ loadedFeature: (_, evt) => evt.frame }) },
          CHANNEL: { target: 'checkRestored', actions: assign({ loadedChannel: (_, evt) => evt.frame }) },
        },
      },
      checkRestored: {
        entry: (context, event) => console.log(event),
        always: [
          { cond: 'restored', target: 'idle', actions: 'restored' },
          'restoring',
        ]
      },
    },
    on: {
      LOADED: { actions: forwardTo((context, event) => context.features[event.data.feature]) },
      
      // TOGGLEINVERT: { actions: 'forwardToChannel' },
      // TOGGLEGRAYSCALE: { actions: 'forwardToChannel' },
      // SETBRIGHTNESS: { actions: 'forwardToChannel' },
      // SETCONTRAST: { actions: 'forwardToChannel' },

      // TOGGLEHIGHLIGHT: { actions: 'forwardToFeature' },
      // TOGGLESHOWNOLABEL: { actions: 'forwardToFeature' },
      // SETOPACITY: { actions: 'forwardToFeature' },

      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
      SAVE: { actions: 'save' },
      RESTORE: [
        {
          cond: 'canRestore',
          target: 'restoring',
          actions: ['saveHistoryRef', 'restore'],
        },
        {
          actions: respond('SAMECONTEXT'),
        },
      ]
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
