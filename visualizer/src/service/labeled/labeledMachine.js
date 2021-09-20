import { actions, assign, forwardTo, Machine, send, spawn } from 'xstate';
import createFeatureMachine from './featureMachine';

const { pure, respond } = actions;

function fetchLabeled(context) {
  const { projectId, numFeatures, numFrames } = context;
  const pathToLabeled = `/dev/labeled/${projectId}`;

  const splitBuffer = buffer => {
    const length = buffer.byteLength / numFeatures / numFrames / 4; // 4 bytes for int32
    const features = [];
    for (let i = 0; i < numFeatures; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const array = new Int32Array(buffer, (i * numFrames + j) * length * 4, length);
        // const blob = new Blob([array], {type: 'application/octet-stream'});
        frames.push(array);
      }
      features.push(frames);
    }

    return features;
  };

  return fetch(pathToLabeled)
    .then(response => response.arrayBuffer())
    .then(splitBuffer);
}

function fetchSemanticLabels(context) {
  const { projectId } = context;
  const pathToLabeled = `/dev/semantic-labels/${projectId}`;

  return fetch(pathToLabeled).then(res => res.json());
}

const createLabeledMachine = (projectId, numFeatures, numFrames) =>
  Machine(
    {
      context: {
        projectId,
        numFeatures,
        numFrames,
        semanticLabels: {},
        feature: 0,
        features: [], // feature machines
        featureNames: [],
        opacity: 0,
        lastOpacity: 0.3,
        highlight: true,
        outline: true,
      },
      initial: 'loadingSemanticLabels',
      states: {
        loadingSemanticLabels: {
          invoke: {
            src: fetchSemanticLabels,
            onDone: { target: 'loading', actions: 'saveSemanticLabels' },
          },
        },
        loading: {
          invoke: {
            src: fetchLabeled,
            onDone: { target: 'idle', actions: 'spawnFeatures' },
          },
        },
        idle: {},
      },
      on: {
        SET_FRAME: { actions: 'forwardToFeatures' },
        SET_FEATURE: { cond: 'newFeature', actions: 'setFeature' },
        TOGGLE_HIGHLIGHT: { actions: 'toggleHighlight' },
        TOGGLE_OUTLINE: { actions: 'toggleOutline' },
        SET_OPACITY: { actions: 'setOpacity' },
        CYCLE_OPACITY: { actions: 'cycleOpacity' },
        // LABELED_ARRAY: { actions: sendParent((c, e) => e) },
        // LABELS: { actions: sendParent((c, e) => e) },
        EDITED: {
          actions: forwardTo(({ features }, event) => features[event.data.feature]),
        },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      guards: {
        newFeature: (context, event) => context.feature !== event.feature,
      },
      actions: {
        setFeature: assign({ feature: (_, { feature }) => feature }),
        saveSemanticLabels: assign({ semanticLabels: (_, { data }) => data }),
        /** Create feature machines and names. */
        spawnFeatures: assign({
          features: ({ numFeatures, semanticLabels }, { data }) => {
            const features = [];
            for (let i = 0; i < numFeatures; i++) {
              const frames = data[i];
              const feature = spawn(
                createFeatureMachine(i, frames, semanticLabels[i]),
                `feature${i}`
              );
              features.push(feature);
            }
            return features;
          },
          featureNames: ({ numFeatures }) =>
            [...Array(numFeatures).keys()].map(i => `feature ${i}`),
        }),
        forwardToFeatures: pure(({ features }) => features.map(f => forwardTo(f))),
        toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
        setOpacity: assign({
          opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)),
          lastOpacity: (_, { opacity }) => (opacity === 1 || opacity === 0 ? 0.3 : opacity),
        }),
        cycleOpacity: assign({
          opacity: ({ opacity, lastOpacity }) =>
            opacity === 0 ? lastOpacity : opacity === 1 ? 0 : 1,
        }),
        toggleOutline: assign({ outline: ({ outline }) => !outline }),
        save: respond(({ feature }) => ({ type: 'RESTORE', feature })),
        restore: send((_, { feature }) => ({ type: 'SET_FEATURE', feature })),
      },
    }
  );

export default createLabeledMachine;
