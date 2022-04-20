/** Manages spots labels. */

import { assign, Machine } from 'xstate';
import { fromEventBus } from './eventBus';

function createSpotsMachine({ eventBuses }) {
  return Machine(
    {
      id: 'spots',
      invoke: [{ src: fromEventBus('labeled', () => eventBuses.load) }],
      context: {
        spots: null,
        opacity: 0.7,
        radius: 3, // radius in screen pixels
        showSpots: true,
        outline: false,
        colorSpots: false,
      },
      on: {
        TOGGLE_SHOW_SPOTS: { actions: 'toggleShowSpots' },
        SET_OPACITY: { actions: 'setOpacity' },
        SET_RADIUS: { actions: 'setRadius' },
        TOGGLE_OUTLINE: { actions: 'toggleOutline' },
        TOGGLE_COLOR_SPOTS: { actions: 'toggleColorSpots' },
      },
      initial: 'loading',
      states: {
        loading: {
          on: {
            LOADED: { target: 'loaded', actions: 'setSpots' },
          },
        },
        loaded: {},
      },
    },
    {
      actions: {
        setSpots: assign({ spots: (ctx, evt) => evt.spots }),
        toggleShowSpots: assign({ showSpots: (ctx, evt) => !ctx.showSpots }),
        toggleOutline: assign({ outline: (ctx, evt) => !ctx.outline }),
        toggleColorSpots: assign({ colorSpots: (ctx, evt) => !ctx.colorSpots }),
        setOpacity: assign({ opacity: (ctx, evt) => evt.opacity }),
        setRadius: assign({ radius: (ctx, evt) => evt.radius }),
      },
    }
  );
}

export default createSpotsMachine;
