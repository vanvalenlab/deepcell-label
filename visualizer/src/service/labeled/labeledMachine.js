import { actions, assign, Machine, send } from 'xstate';

const { respond } = actions;

const createLabeledMachine = (projectId, numFeatures) =>
  Machine(
    {
      context: {
        projectId,
        numFeatures,
        feature: 0,
        featureNames: [],
        opacity: 0,
        lastOpacity: 0.3,
        highlight: true,
        outline: true,
      },
      entry: 'setNames',
      on: {
        SET_FEATURE: { cond: 'newFeature', actions: 'setFeature' },
        TOGGLE_HIGHLIGHT: { actions: 'toggleHighlight' },
        TOGGLE_OUTLINE: { actions: 'toggleOutline' },
        SET_OPACITY: { actions: 'setOpacity' },
        CYCLE_OPACITY: { actions: 'cycleOpacity' },
        // LABELED_ARRAY: { actions: sendParent((c, e) => e) },
        // LABELS: { actions: sendParent((c, e) => e) },
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
        /** Create feature machines and names. */
        setNames: assign({
          featureNames: ({ numFeatures }) =>
            [...Array(numFeatures).keys()].map(i => `feature ${i}`),
        }),
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
