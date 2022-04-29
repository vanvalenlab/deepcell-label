/** Manages lineage labels. */

import { assign, Machine } from 'xstate';
import { fromEventBus } from './eventBus';

function createLineageMachine({ eventBuses }) {
  return Machine(
    {
      id: 'spots',
      invoke: [{ src: fromEventBus('labeled', () => eventBuses.load) }],
      context: {
        lineage: null,
      },
      on: {},
      initial: 'loading',
      states: {
        loading: {
          on: {
            LOADED: { target: 'loaded', actions: 'setLineage' },
          },
        },
        loaded: {},
      },
    },
    {
      actions: {
        setLineage: assign({ spots: (ctx, evt) => evt.lineage }),
      },
    }
  );
}

export default createLineageMachine;
