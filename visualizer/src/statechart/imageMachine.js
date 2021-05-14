import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createChannelMachine from './channelMachine';
import createFeatureMachine from './featureMachine';

const { pure } = actions;

const frameState = {
  entry: ['assignLoadingFrame', 'loadRawFrame', 'loadLabeledFrame'],
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
        RAWLOADED: { target: 'checkLoaded', cond: 'loadedFrame', actions: 'rawLoaded' },
        LABELEDLOADED: { target: 'checkLoaded', cond: 'loadedFrame', actions: 'labeledLoaded' },
        // when the channel or feature changes before the frame does, 
        // we need to load the frame for the new channel/feature
        CHANNEL: { actions: 'addChannelToLoadingFrame' },
        FEATURE: { actions: 'loadLabeledFrame' },
      },
    },
    checkLoaded: {
      always: [
        { cond: 'isFrameLoaded', target: 'idle', actions: 'useFrame' },
        { target: 'loading' }
      ],
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

const colorModeState = {
  initial: 'multiChannel',
  states: {
    multiChannel: {
      on: {
        'keydown.z': 'oneChannel',
      }
    },
    oneChannel: {
      on: {
        'keydown.z': 'labelsOnly',
      }
    },
    labelsOnly: {
      on: {
        'keydown.z': 'multiChannel',
      }
    },
  },
}

/** Checks if every leaf value in a nested object is truthy. */
const allTrue = (obj) => {
  return Object.values(obj).every(item => typeof item === "object" ? allTrue(item) : item);
};

const imageGuards = {
  newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
  newLoadingChannel: (context, event) => context.loadingChannel !== event.channel,
  newLoadingFeature: (context, event) => context.loadingFeature !== event.feature,
  loadedFrame: (context, event) => {
    return (context.loadingFrame === event.frame &&
      (event.channel in context.loaded.raw || context.feature === event.feature));
  },
  loadedChannel: (context, event) => context.frame === event.frame && context.loadingChannel === event.channel,
  loadedFeature: (context, event) => context.frame === event.frame && context.loadingFeature === event.feature,
  isFrameLoaded: ({ loaded }) => allTrue(loaded),
};

const loadActions = {
  // record which data we are waiting to load
  assignLoadingFrame: assign({
    loadingFrame: ({ loadingFrame }, { frame }) => frame ? frame : loadingFrame,
    loaded: ({ channels }) => ({
      labeled: false,
      raw: Object.fromEntries(Object.keys(channels).map(key => [key, false])),
    }),
  }),
  assignLoadingChannel: assign({ loadingChannel: (context, { channel }) => channel }),
  assignLoadingFeature: assign({ loadingFeature: (context, { feature }) => feature }),
  // send LOADFRAME events to child actors
  loadLabeledFrame: send(
    ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
    { to: ({ features, feature }) => features[feature] }
  ),
  loadRawFrame: pure(({ loadingFrame, channels }) => {
    return Object.values(channels).map(
      channel => send(
        { type: 'LOADFRAME', frame: loadingFrame },
        { to: channel }
      )
    );
  }),
  loadFeature: send(
    ({ frame }) => ({ type: 'LOADFRAME', frame }),
    { to: ({ features, loadingFeature }) => features[loadingFeature] },
  ),
  loadChannel: send(
    ({ frame }) => ({ type: 'LOADFRAME', frame }),
    { to: ({ channels, loadingChannel }) => channels[loadingChannel] }
  ),
  addChannelToLoadingFrame: pure(({ loaded, loadingFrame, channels }, { channel }) => {
    const addToLoaded = assign({ loaded: { ...loaded, raw: { ...loaded.raw, [channel]: false } } });
    const sendLoad = send(
      { type: 'LOADFRAME', frame: loadingFrame },
      { to: channels[channel] }
    );
    return [addToLoaded, sendLoad];
  }),
  addFeatureToLoadingFrame: pure(({ loaded, loadingFrame, features }, { feature }) => {
    const addToLoaded = assign({ loaded: { ...loaded, labeled: false } });
    const sendLoad = send(
      { type: 'LOADFRAME', frame: loadingFrame },
      { to: features[feature] }
    );
    return [addToLoaded, sendLoad];
  }),
  // record what data is loaded as it comes in
  rawLoaded: assign({
    loaded: ({ loaded }, { channel }) => ({ ...loaded, raw: {...loaded.raw, [channel]: true } })
  }),
  labeledLoaded: assign({
    loaded: ({ loaded }) => ({ ...loaded, labeled: true })
  }),
  // assign current frame and inform other actors of the new frame
  useFrame: pure(({ channel, channels, feature, features, toolRef, loaded, loadingFrame }) => {
    const frameEvent = { type: 'FRAME', frame: loadingFrame };
    return [
      assign({ frame: loadingFrame }),
      send(frameEvent),
      ...Object.values(channels).map(channel => send(frameEvent, { to: channel })),
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
          colorMode: colorModeState,
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
