/** Loads and stores overlaps arrays. */

import colormap from 'colormap';
import { assign, Machine, send } from 'xstate';
import Overlaps from '../overlaps';
import { fromEventBus } from './eventBus';

const createOverlapsMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'overlaps',
      invoke: [
        { id: 'eventBus', src: fromEventBus('overlaps', () => eventBuses.overlaps) },
        { src: fromEventBus('overlaps', () => eventBuses.api) },
        { src: fromEventBus('overlaps', () => eventBuses.load) },
        { src: fromEventBus('overlaps', () => eventBuses.image) },
      ],
      context: {
        overlaps: null, // Overlaps object
        frame: 0,
        colormap: [
          [0, 0, 0, 1],
          ...colormap({ colormap: 'viridis', format: 'rgba' }),
          [255, 255, 255, 1],
        ],
      },
      initial: 'waiting',
      on: {
        FRAME: { actions: 'setFrame' },
      },
      states: {
        waiting: {
          on: {
            LOADED: {
              target: 'idle',
              actions: ['setOverlaps', 'setColormap'],
            },
          },
        },
        idle: {
          entry: ['sendOverlaps', 'sendOverlapMatrix'],
          on: {
            FRAME: { actions: ['setFrame', 'sendOverlapMatrix'] },
            EDITED: {
              actions: ['updateOverlaps', 'setColormap', 'sendOverlaps', 'sendOverlapMatrix'],
            },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setFrame: assign({ frame: (_, event) => event.frame }),
        setOverlaps: assign({ overlaps: (_, event) => event.overlaps }),
        updateOverlaps: assign({
          overlaps: (ctx, evt) => {
            console.log(ctx, evt);
            return new Overlaps([
              ...ctx.overlaps.overlaps.filter((o) => o.z !== evt.frame),
              ...evt.overlaps.map((o) => ({ ...o, z: evt.frame })),
            ]);
          },
        }),
        sendOverlaps: send(
          (ctx, evt) => ({
            type: 'OVERLAPS',
            overlaps: ctx.overlaps,
          }),
          { to: 'eventBus' }
        ),
        sendOverlapMatrix: send(
          (ctx, evt) => ({
            type: 'OVERLAP_MATRIX',
            overlapMatrix: ctx.overlaps.getMatrix(ctx.frame),
          }),
          { to: 'eventBus' }
        ),
        setColormap: assign({
          colormap: (ctx, evt) => [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, ctx.overlaps.getNewCell() - 1),
              format: 'rgba',
            }),
            [255, 255, 255, 1],
          ],
        }),
      },
    }
  );

export default createOverlapsMachine;
