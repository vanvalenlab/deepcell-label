import { Machine, assign, send, sendParent, spawn, forwardTo, actions } from 'xstate';
import createFeatureMachine from './featureMachine';

const { pure, respond } = actions;


const frameState = {
  entry: 'loadFrame',
  initial: 'loading',
  states: {
    idle: {
      entry: 'startPreload',
      on: {
        LABELEDLOADED: { actions: 'preload' },
      },
    },
    loading: {
      on: {
        LABELEDLOADED: { target: 'loaded', cond: 'loadedFrame', actions: 'sendLoaded' },
        // when the feature changes before the frame does, 
        // we need to load the frame for the new feature
        FEATURE: { actions: 'loadFrame' },
      },
    },
    loaded: {
      on: {
        FEATURE: { target: 'loading', actions: 'loadFrame' },
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToFeature'] }
      }
    },
  },
  on: {
    LOADFRAME: {
      target: '.loading',
      cond: 'newLoadingFrame',
      actions: ['assignLoadingFrame', 'loadFrame'],
    },
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
    LOADFEATURE: {
      target: '.loading',
      cond: 'newLoadingFeature',
      actions: ['assignLoadingFeature', 'loadFeature'],
    },
  }
};

const createLabeledMachine = (projectId, numFeatures, numFrames) => Machine(
  {
    context: {
      projectId,
      numFeatures,
      numFrames,
      feature: 0,
      loadingFeature: 0,
      frame: 0, // needed ??
      loadingFrame: 0, // needed ??
      loadedLayers: {},
      features: [], // all segmentations as featureMachines
      featureNames: [], // name of each segmentations
      opacity: 0,
      highlight: true,
      showNoLabel: true,
      outline: 'all',
    },
    entry: 'spawnFeatures',
    type: 'parallel',
    states: {
      frame: frameState,
      feature: featureState,
    },
    on: {
      TOGGLEHIGHLIGHT: { actions: 'toggleHighlight' },
      SETOUTLINE: { actions: 'setOutline' },
      SETOPACITY: { actions: 'setOpacity' },
      TOGGLESHOWNOLABEL: { actions: 'toggleShowNoLabel' },
      LABELEDARRAY: { actions: sendParent((c, e) => e) },
      EDITED: { actions: forwardTo(({ features }, event) => features[event.data.feature]) },
    }
  },
  {
    guards: {
      /** Check that the loaded event is for the loading frame. */
      loadedFrame: (context, event) =>
        context.loadingFrame === event.frame && context.feature === event.feature,
      /** Check that the loaded event is for the loading feature. */
      loadedFeature: (context, event) =>
        context.frame === event.frame && context.loadingFeature === event.feature,
      /** Check that requested frame is different from the loading frame. */
      newLoadingFrame: ({ loadingFrame }, { frame }) => loadingFrame !== frame,
      /** Check that requested feature is different from the loading feature. */
      newLoadingFeature: ({ loadingFeature }, { feature }) => loadingFeature !== feature,
    },
    actions: {
      /** Create an actor for each feature. */
      spawnFeatures: assign({
        features: ({ projectId, numFeatures, numFrames }) => {
          return Array(numFeatures)
            .fill(0)
            .map((val, index) => spawn(
              createFeatureMachine(projectId, index, numFrames), `feature${index}`
            ));
        },
        featureNames: ({ numFeatures }) => [...Array(numFeatures).keys()].map(i => `feature ${i}`),
      }),
      /** Record which frame we are loading. */
      assignLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
      /** Record which feature we are loading. */
      assignLoadingFeature: assign({ loadingFeature: (_, { feature }) => feature }),
      /** Start preloading frames in all features. */
      startPreload: pure(
        ({ features }) => features.map(feature => send('PRELOAD', { to: feature }))
      ),
      /** Preload another frame after the last one is loaded. */
      preload: respond('PRELOAD'),
      /** Load a new frame for the current feature. */
      loadFrame: send(
        ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
        { to: ({ features, feature }) => features[feature] }
      ),
      /** Load the current frame for a new feature.  */
      loadFeature: send(
        ({ frame }) => ({ type: 'LOADFRAME', frame }),
        { to: ({ features, loadingFeature }) => features[loadingFeature] },
      ),
      // useFrame: pure(({ features }) => features.map(feature => forwardTo(feature))),
      /** Switch to a new feature. */
      useFeature: pure(({ features }, { feature, frame }) => {
        const featureEvent = { type: 'FEATURE', feature, frame };
        return [
          assign({ feature }),
          send(featureEvent),
          sendParent(featureEvent),
          send({ type: 'FRAME', frame }, { to: features[feature] }),
        ];
      }),
      /** Update the index to a new frame. */
      useFrame: assign((_, { frame }) => ({ frame })),
      /** Send event to all features. */
      forwardToFeatures: pure(({ features }) => features.map(feature => forwardTo(feature))),
      forwardToFeature: forwardTo(({ features, feature }) => features[feature]),
      /** Tell imageMachine that the labeled data is loaded. */
      sendLoaded: sendParent('LABELEDLOADED'),
      toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
      toggleShowNoLabel: assign({ showNoLabel: ({ showNoLabel }) => !showNoLabel }),
      setOpacity: assign({ opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)) }),
      setOutline: assign({ outline: (_, { outline }) => outline }),
    },
  }
);

export default createLabeledMachine;