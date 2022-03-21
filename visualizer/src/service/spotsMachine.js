/** Manages spots labels. */

import { assign, Machine } from 'xstate';
import spots from './spots';

function createSpotsMachine() {
  return Machine(
    {
      id: 'spots',
      context: {
        spots: spots,
        opacity: 0.7,
        radius: 3, // radius in screen pixels
        showSpots: true,
      },
      on: {
        TOGGLE_SHOW_SPOTS: { actions: 'toggleShowSpots' },
        SET_OPACITY: { actions: 'setOpacity' },
        SET_RADIUS: { actions: 'setRadius' },
      },
    },
    {
      actions: {
        setSpots: assign({ labels: (ctx, evt) => evt.labels }),
        toggleShowSpots: assign({ showSpots: (ctx, evt) => !ctx.showSpots }),
        setOpacity: assign({ opacity: (ctx, evt) => evt.opacity }),
        setRadius: assign({ radius: (ctx, evt) => evt.radius }),
      },
    }
  );
}

export default createSpotsMachine;
