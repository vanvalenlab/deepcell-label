/** Manages division labels. */

import { assign, Machine } from 'xstate';
import { fromEventBus } from '../eventBus';

function createDivisionsMachine({ eventBuses }) {
  return Machine(
    {
      context: { divisions: null },
      invoke: [{ src: fromEventBus('divisions', () => eventBuses.load, 'LOADED') }],
      id: 'divisions',
      initial: 'loading',
      states: {
        loading: {
          on: {
            LOADED: { actions: 'setDivisions', target: 'loaded' },
          },
        },
        loaded: {
          on: {},
        },
      },
    },
    {
      actions: {
        setDivisions: assign({ divisions: (ctx, evt) => evt.divisions }),
      },
    }
  );
}

export default createDivisionsMachine;
