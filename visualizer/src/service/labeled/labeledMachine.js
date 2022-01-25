import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { EventBus, fromEventBus } from '../eventBus';
import createFeatureMachine from './featureMachine';

const { pure, respond } = actions;

const frameState = {
  entry: 'loadFrame',
  initial: 'loading',
  states: {
    idle: {
      entry: 'startPreload',
      on: {
        LABELED_LOADED: { actions: 'preload' },
      },
    },
    loading: {
      on: {
        LABELED_LOADED: {
          target: 'loaded',
          cond: 'loadedFrame',
          actions: 'sendLoaded',
        },
        // when the feature changes before the frame does,
        // we need to load the frame for the new feature
        FEATURE: { actions: 'loadFrame' },
      },
    },
    loaded: {
      on: {
        FEATURE: { target: 'loading', actions: 'loadFrame' },
        FRAME: { target: 'idle', actions: ['useFrame', 'forwardToFeature'] },
      },
    },
  },
  on: {
    LOAD_FRAME: {
      target: '.loading',
      cond: 'newLoadingFrame',
      actions: ['assignLoadingFrame', 'loadFrame'],
    },
  },
};

const featureState = {
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        LABELED_LOADED: {
          target: 'idle',
          cond: 'loadedFeature',
          actions: 'useFeature',
        },
        FRAME: { actions: 'loadFeature' }, // when frame changes, load that frame instead
      },
    },
  },
  on: {
    LOAD_FEATURE: {
      target: '.loading',
      cond: 'newLoadingFeature',
      actions: ['assignLoadingFeature', 'loadFeature'],
    },
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

export const labelImageEventBus = new EventBus('labelImage');

const createLabeledMachine = (projectId, numFeatures, numFrames) =>
  Machine(
    {
      invoke: {
        id: 'eventBus',
        src: fromEventBus('labeled', () => labelImageEventBus),
      },
      context: {
        projectId,
        numFeatures,
        numFrames,
        feature: 0,
        loadingFeature: 0,
        frame: 0, // needed ??
        loadingFrame: 0, // needed ??
        features: [], // all segmentations as featureMachines
        featureNames: [], // name of each segmentations
        opacity: 0,
        lastOpacity: 0.3,
        highlight: true,
        outline: true,
      },
      entry: 'spawnFeatures',
      type: 'parallel',
      states: {
        frame: frameState,
        feature: featureState,
        restore: restoreState,
      },
      on: {
        TOGGLE_HIGHLIGHT: { actions: 'toggleHighlight' },
        TOGGLE_OUTLINE: { actions: 'toggleOutline' },
        SET_OPACITY: { actions: 'setOpacity' },
        CYCLE_OPACITY: { actions: 'cycleOpacity' },
        LABELED_ARRAY: { actions: send((c, e) => e, { to: 'eventBus' }) },
        LABELS: { actions: send((c, e) => e, { to: 'eventBus' }) },
        EDITED: {
          actions: forwardTo(({ features }, event) => features[event.data.feature]),
        },
      },
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
              .map((val, index) =>
                spawn(createFeatureMachine(projectId, index, numFrames), `feature${index}`)
              );
          },
          featureNames: ({ numFeatures }) =>
            [...Array(numFeatures).keys()].map((i) => `feature ${i}`),
        }),
        /** Record which frame we are loading. */
        assignLoadingFrame: assign({ loadingFrame: (_, { frame }) => frame }),
        /** Record which feature we are loading. */
        assignLoadingFeature: assign({
          loadingFeature: (_, { feature }) => feature,
        }),
        /** Start preloading frames in all features. */
        startPreload: pure(({ features }) =>
          features.map((feature) => send('PRELOAD', { to: feature }))
        ),
        /** Preload another frame after the last one is loaded. */
        preload: respond('PRELOAD'),
        /** Load a new frame for the current feature. */
        loadFrame: send(({ loadingFrame }) => ({ type: 'LOAD_FRAME', frame: loadingFrame }), {
          to: ({ features, feature }) => features[feature],
        }),
        /** Load the current frame for a new feature.  */
        loadFeature: send(({ frame }) => ({ type: 'LOAD_FRAME', frame }), {
          to: ({ features, loadingFeature }) => features[loadingFeature],
        }),
        // useFrame: pure(({ features }) => features.map(feature => forwardTo(feature))),
        /** Switch to a new feature. */
        useFeature: pure(({ features }, { feature, frame }) => {
          const featureEvent = { type: 'FEATURE', feature };
          return [
            assign({ feature }),
            send(featureEvent),
            sendParent(featureEvent),
            send({ type: 'FRAME', frame }, { to: features[feature] }),
          ];
        }),
        /** Update the index to a new frame. */
        useFrame: assign((_, { frame }) => ({ frame })),
        forwardToFeature: forwardTo(({ features, feature }) => features[feature]),
        /** Tell imageMachine that the labeled data is loaded. */
        sendLoaded: sendParent('LABELED_LOADED'),
        toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
        setOpacity: assign({
          opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)),
          lastOpacity: ({ lastOpacity }, { opacity }) =>
            opacity === 1 || opacity === 0 ? 0.3 : opacity,
        }),
        cycleOpacity: assign({
          opacity: ({ opacity, lastOpacity }) =>
            opacity === 0 ? lastOpacity : opacity === 1 ? 0 : 1,
        }),
        toggleOutline: assign({ outline: ({ outline }) => !outline }),
        save: respond(({ feature }) => ({ type: 'RESTORE', feature })),
        restore: send((_, { feature }) => ({ type: 'LOAD_FEATURE', feature })),
      },
    }
  );

export default createLabeledMachine;
