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
      },
    },
    {
      actions: {
        setSpots: assign({ labels: (ctx, evt) => evt.labels }),
      },
    }
  );
}

export default createSpotsMachine;
