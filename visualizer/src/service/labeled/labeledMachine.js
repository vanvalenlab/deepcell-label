import colormap from 'colormap';
import { actions, assign, Machine, send } from 'xstate';
import { fromEventBus } from '../eventBus';

const { respond } = actions;

const createLabeledMachine = ({ projectId, numFeatures, eventBuses }) =>
  Machine(
    {
      invoke: {
        id: 'eventBus',
        src: fromEventBus('labeled', () => eventBuses.labeled),
      },

      context: {
        projectId,
        numFeatures,
        feature: 0,
        featureNames: [],
        opacity: 0,
        lastOpacity: 0.3,
        highlight: true,
        outline: true,
        colormap: [
          [0, 0, 0, 1],
          ...colormap({ colormap: 'viridis', format: 'rgba' }),
          [255, 255, 255, 1],
        ],
      },
      entry: 'setNames',
      on: {
        SET_FEATURE: { actions: ['setFeature', 'sendToEventBus'] },
        TOGGLE_HIGHLIGHT: { actions: 'toggleHighlight' },
        TOGGLE_OUTLINE: { actions: 'toggleOutline' },
        SET_OPACITY: { actions: 'setOpacity' },
        CYCLE_OPACITY: { actions: 'cycleOpacity' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      actions: {
        setFeature: assign({ feature: (_, { feature }) => feature }),
        /** Create feature machines and names. */
        setNames: assign({
          featureNames: ({ numFeatures }) =>
            [...Array(numFeatures).keys()].map((i) => `feature ${i}`),
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
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
      },
    }
  );

export default createLabeledMachine;
