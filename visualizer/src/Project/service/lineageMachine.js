/** Manages lineage labels. */

import { assign, Machine } from 'xstate';
import { fromEventBus } from './eventBus';

function createLineageMachine({ eventBuses }) {
  return Machine(
    {
      context: { lineage: null },
      invoke: [{ src: fromEventBus('lineage', () => eventBuses.load) }],
      id: 'lineage',
      initial: 'loading',
      states: {
        loading: {
          on: {
            LOADED: { actions: 'setLineage', target: 'loaded' },
          },
        },
        loaded: {
          on: {},
        },
      },
    },
    {
      actions: {
        setLineage: assign({ lineage: (ctx, evt) => evt.lineage }),
      },
    }
  );
}

export default createLineageMachine;
