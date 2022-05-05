/** Loads and stores image arrays. */

import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const createOverlapsMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'overlaps',
      invoke: [
        { id: 'eventBus', src: fromEventBus('overlaps', () => eventBuses.overlaps) },
        // { id: 'image', src: fromEventBus('overlaps', () => eventBuses.image) },
        { src: fromEventBus('overlaps', () => eventBuses.api) },
        { src: fromEventBus('overlaps', () => eventBuses.load) },
      ],
      context: {
        overlaps: null,
        // frame: 0,
        // feature: 0,
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            LOADED: {
              target: 'idle',
              actions: 'setOverlaps',
            },
            // SET_FRAME: { actions: 'setFrame' },
            // SET_FEATURE: { actions: 'setFeature' },
          },
        },
        idle: {
          entry: 'sendOverlaps',
          on: {
            // SET_FRAME: { actions: ['setFrame', 'sendOverlaps'] },
            // SET_FEATURE: { actions: ['setFeature', 'sendOverlaps'] },
            EDITED: { actions: ['updateOverlaps', 'sendOverlaps'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setOverlaps: assign({ overlaps: (ctx, evt) => evt.overlaps }),
        // setFrame: assign({ frame: (ctx, evt) => evt.frame }),
        // setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        // setChannel: assign({ channel: (ctx, evt) => evt.channel }),
        updateOverlaps: assign({
          overlaps: (ctx, evt) => {
            return evt.overlaps;
            // const { frame, feature, overlaps: o } = evt;
            // const { overlaps } = ctx;
            // overlaps[feature][frame] = o;
            // return overlaps;
          },
        }),
        sendOverlaps: send(
          (ctx, evt) => ({
            type: 'OVERLAPS',
            overlaps: ctx.overlaps,
            // overlaps: ctx.overlaps[ctx.feature][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createOverlapsMachine;
