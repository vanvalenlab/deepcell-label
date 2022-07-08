/** Manages spots labels.
 * Broadcasts SPOTS event on spots event bus.
 */

import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../eventBus';

function createSpotsMachine({ eventBuses }) {
  return Machine(
    {
      id: 'spots',
      invoke: [
        { src: fromEventBus('spots', () => eventBuses.load, 'LOADED') },
        { id: 'eventBus', src: fromEventBus('spots', () => eventBuses.spots) },
      ],
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
        loaded: {
          entry: 'sendSpots',
        },
      },
    },
    {
      actions: {
        setSpots: assign({ spots: (ctx, evt) => evt.spots }),
        sendSpots: send((ctx, evt) => ({ type: 'SPOTS', spots: ctx.spots }), { to: 'eventBus' }),
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
