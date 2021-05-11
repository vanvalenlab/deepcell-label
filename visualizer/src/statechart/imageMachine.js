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
    // when the channel or feature changes, 
    // we jump back to loading and load data for the new channel/feature
    loading: {
      on: {
        RAWLOADED: { target: 'rawLoaded', cond: 'loadedFrame' },
        LABELEDLOADED: { target: 'labeledLoaded', cond: 'loadedFrame' },
        CHANNEL: { actions: 'loadRawFrame' },
        FEATURE: { actions: 'loadLabeledFrame' },
      },
    },
    // once labeled data is loaded, wait for raw to load
    labeledLoaded: {
      on: {
        RAWLOADED: { target: 'idle', cond: 'loadedFrame', actions: 'useFrame' },
        FEATURE: { target: 'loading', actions: 'loadLabeledFrame' },
      },
    },
    // once raw data is loaded, wait for labeled to load
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
        FRAME: { actions: 'loadFeature' }, // when frame changes, load that frame instead
      }
    },
  },
  on: {
    LOADFEATURE: { target: '.loading', cond: 'newLoadingFeature', actions: ['assignLoadingFeature', 'loadFeature'] },
  }
};

const channelState = {
  initial: 'idle',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { target: 'idle', cond: 'loadedChannel', actions: 'useChannel' },
        FRAME: { actions: 'loadChannel' }, // when frame changes, load that frame instead
      }
    },
  },
  on: {
    LOADCHANNEL: { target: '.loading', cond: 'newLoadingChannel', actions: ['assignLoadingChannel','loadChannel'] },
  }
};

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
};

const loadActions = {
  // record which data we are waiting to load
  assignLoadingFrame: assign({ loadingFrame: (context, { frame }) => frame }),
  assignLoadingChannel: assign({ loadingChannel: (context, { channel }) => channel }),
  assignLoadingFeature: assign({ loadingFeature: (context, { feature }) => feature }),
  // send LOADFRAME events to child actors
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
  // assign current frame and inform other actors of the new frame
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
};

const preloadActions = {
  // preload other frames in series for the current channel & feature
  preloadRawFrame: send('PRELOAD', { to: ({ channels, channel }) => channels[channel] }),
  preloadLabeledFrame: send('PRELOAD', { to: ({ features, feature }) => features[feature] }),
  // preload the current frame in parallel across all other features
  preloadFeatures: pure(({ frame, feature, features }) => {
    const loadFrame = { type: 'LOADFRAME', frame };
    return Object.entries(features)
      .filter(([key, val]) => Number(key) !== feature)
      // .filter(([key, val]) => Math.abs(Number(key) - feature) < 3)
      .map(([key, val]) => send(loadFrame, { to: val }));
  }),
  // preload the current frame in parallel across all other channels
  preloadChannels: pure(({ frame, channel, channels }) => {
    const loadFrame = { type: 'LOADFRAME', frame };
    return Object.entries(channels)
      .filter(([key, val]) => Number(key) !== channel)
      // .filter(([key, val]) => Math.abs(Number(key) - channel) < 3)
      .map(([key, val]) => send(loadFrame, { to: val }));
  }),
};

const adjustActions = {
  toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
  toggleShowNoLabel: assign({ showNoLabel: ({ showNoLabel }) => !showNoLabel }),
  setOpacity: assign({ opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)) }),
  setOutline: assign({ outline: (_, { outline }) => outline }),
  toggleInvert: assign({ invert: (context) => !context.invert }),
  toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
};

const imageActions = {
  ...loadActions,
  ...preloadActions,
  ...adjustActions,
  // initialize context based on project data
  handleProject: assign(
    (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
      return {
        frame, feature, channel,
        numFrames, numFeatures, numChannels,
        loadingFrame: frame,
      };
    }
  ),
  // create child actors to fetch raw & labeled data
  spawnActors: assign({
    channels: ({ projectId, numChannels, numFrames, channels }) => {
      if (Object.keys(channels).length !== 0) return channels;
      channels = {};
      for (let channel = 0; channel < numChannels; channel++) {
        channels[channel] = spawn(createChannelMachine(projectId, channel, numFrames), `channel${channel}`);
      }
      return channels;
    },
    channelColors: ({ numChannels }) => {
      let channelColors = { 0: '#FF0000', 1: '#00FF00', 2: '#0000FF' };
      channelColors = Object.fromEntries(
        Object.entries(channelColors)
          .filter(([index, color]) => index < numChannels)
      );
      return channelColors;
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
      channelColors: {},
      features: {},
      opacity: 0,
      highlight: true,
      showNoLabel: true,
      outline: 'all',
      invert: false,
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
    },
    on: {
      LOADED: { actions: forwardTo((context, event) => context.features[event.data.feature]) },
      LABELEDARRAY: { actions: forwardTo(({ toolRef }) => toolRef) },
      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
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
    actions: { ...imageActions },
  });

export default createImageMachine;
