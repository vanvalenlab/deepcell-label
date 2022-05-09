/** Loads and stores overlaps arrays. */

import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const createOverlapsMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'overlaps',
      invoke: [
        { id: 'eventBus', src: fromEventBus('overlaps', () => eventBuses.overlaps) },
        { src: fromEventBus('overlaps', () => eventBuses.api) },
        { src: fromEventBus('overlaps', () => eventBuses.load) },
      ],
      context: {
        overlaps: null,
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            LOADED: {
              target: 'idle',
              actions: 'setOverlaps',
            },
          },
        },
        idle: {
          entry: 'sendOverlaps',
          on: {
            EDITED: { actions: ['updateOverlaps', 'sendOverlaps'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setOverlaps: assign({ overlaps: (ctx, evt) => evt.overlaps }),
        updateOverlaps: assign({
          overlaps: (ctx, evt) => evt.overlaps,
        }),
        sendOverlaps: send(
          (ctx, evt) => ({
            type: 'OVERLAPS',
            overlaps: ctx.overlaps,
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createOverlapsMachine;
