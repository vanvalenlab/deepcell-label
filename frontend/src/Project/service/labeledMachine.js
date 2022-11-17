/** Manages the controls for the labeled image, including
 * the opacity of the cells, the opacity of the outlines, whether to highlight the selected label, and what feature to show.
 */

import { actions, assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const { respond } = actions;

const createLabeledMachine = ({ projectId, eventBuses, undoRef }) =>
  Machine(
    {
      invoke: [
        { id: 'eventBus', src: fromEventBus('labeled', () => eventBuses.labeled) },
        { src: fromEventBus('labeled', () => eventBuses.load, 'DIMENSIONS') },
      ],
      entry: send('REGISTER_UI', { to: undoRef }),
      context: {
        projectId,
        numFeatures: 1,
        feature: 0,
        featureNames: ['feature 0'],
        cellsOpacity: 0.2, // [0, 0.3],
        outlineOpacity: 0.3, // [0.5, 1],
        highlight: true,
      },
      on: {
        DIMENSIONS: { actions: 'setNumFeatures' },
        SET_FEATURE: { actions: ['setFeature', 'sendToEventBus'] },
        TOGGLE_HIGHLIGHT: { actions: 'toggleHighlight' },
        SET_CELLS_OPACITY: { actions: 'setCellsOpacity' },
        CYCLE_CELLS_OPACITY: { actions: 'cycleCellsOpacity' },
        CYCLE_OUTLINE_OPACITY: { actions: 'cycleOutlineOpacity' },
        SET_OUTLINE_OPACITY: { actions: 'setOutlineOpacity' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      actions: {
        setOutlineOpacity: assign({ outlineOpacity: (ctx, event) => event.opacity }),
        setCellsOpacity: assign({ cellsOpacity: (ctx, event) => event.opacity }),
        cycleCellsOpacity: assign({
          cellsOpacity: (ctx) => {
            switch (ctx.cellsOpacity) {
              case 0:
                return 0.2;
              case 1:
                return 0;
              default:
                return 1;
            }
          },
        }),
        cycleOutlineOpacity: assign({
          outlineOpacity: (ctx) => {
            switch (ctx.outlineOpacity) {
              case 0:
                return 0.3;
              case 1:
                return 0;
              default:
                return 1;
            }
          },
        }),
        setNumFeatures: assign({
          numFeatures: (ctx, evt) => evt.numFeatures,
          featureNames: (ctx, evt) => [...Array(evt.numFeatures).keys()].map((i) => `feature ${i}`),
        }),
        setFeature: assign({ feature: (_, { feature }) => feature }),
        toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
        save: respond(({ feature }) => ({ type: 'RESTORE', feature })),
        restore: send((_, { feature }) => ({ type: 'SET_FEATURE', feature })),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
      },
    }
  );

export default createLabeledMachine;
