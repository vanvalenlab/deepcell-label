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
        frameMode: 'one',
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            SET_FRAME_MODE: { actions: 'setFrameMode' },
            SET_FRAME: { actions: 'setFrame' },
            LOADED: {
              target: 'editedOverlaps',
              actions: 'setOverlaps',
            },
          },
        },
        editedOverlaps: {
          entry: ['setColormap', 'sendOverlaps', 'sendOverlapMatrix'],
          always: 'idle',
        },
        idle: {
          on: {
            SET_FRAME_MODE: { actions: 'setFrameMode' },
            SET_FRAME: { actions: ['setFrame', 'sendOverlapMatrix'] },
            EDITED: { actions: 'updateOverlaps', target: 'editedOverlaps' },
            REPLACE: { actions: 'replace', target: 'editedOverlaps' },
            DELETE: { actions: 'delete', target: 'editedOverlaps' },
            SWAP: { actions: 'swap', target: 'editedOverlaps' },
            NEW: { actions: 'new', target: 'editedOverlaps' },
          },
        },
      },
    },
    {
      actions: {
        setFrameMode: assign({ frameMode: (_, evt) => evt.frameMode }),
        setFrame: assign({ frame: (_, evt) => evt.frame }),
        setOverlaps: assign({ overlaps: (_, evt) => evt.overlaps }),
        updateOverlaps: assign({
          overlaps: (ctx, evt) => {
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
        replace: assign({
          overlaps: (ctx, evt) => {
            let overlaps;
            switch (ctx.frameMode) {
              case 'one':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.b && o.z === ctx.frame ? { ...o, cell: evt.a } : o
                );
                break;
              case 'past':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.b && o.z <= ctx.frame ? { ...o, cell: evt.a } : o
                );
              case 'future':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.b && o.z >= ctx.frame ? { ...o, cell: evt.a } : o
                );
              case 'all':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.b ? { ...o, cell: evt.a } : o
                );
                break;
              default:
                overlaps = ctx.overlaps.overlaps;
            }
            return new Overlaps(overlaps);
          },
        }),
        delete: assign({
          overlaps: (ctx, evt) => {
            let overlaps;
            switch (ctx.frameMode) {
              case 'one':
                overlaps = ctx.overlaps.overlaps.filter(
                  (o) => o.z !== ctx.frame || o.cell !== evt.cell
                );
                break;
              case 'past':
                overlaps = ctx.overlaps.overlaps.filter(
                  (o) => o.z > ctx.frame || o.cell !== evt.cell
                );
                break;
              case 'future':
                overlaps = ctx.overlaps.overlaps.filter(
                  (o) => o.z < ctx.frame || o.cell !== evt.cell
                );
                break;
              case 'all':
                overlaps = ctx.overlaps.overlaps.filter((o) => o.cell !== evt.cell);
                break;
              default:
                overlaps = ctx.overlaps.overlaps;
            }
            return new Overlaps(overlaps);
          },
        }),
        swap: assign({
          overlaps: (ctx, evt) => {
            let overlaps;
            switch (ctx.frameMode) {
              case 'one':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.a && o.z === ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z === ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'past':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.a && o.z <= ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z <= ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'future':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.a && o.z >= ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z >= ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'all':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.a
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              default:
                overlaps = ctx.overlaps.overlaps;
            }
            return new Overlaps(overlaps);
          },
        }),
        new: assign({
          overlaps: (ctx, evt) => {
            let overlaps;
            const newCell = ctx.overlaps.getNewCell();
            switch (ctx.frameMode) {
              case 'one':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.cell && o.z === ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'past':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.cell && o.z <= ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'future':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.cell && o.z >= ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'all':
                overlaps = ctx.overlaps.overlaps.map((o) =>
                  o.cell === evt.cell ? { ...o, cell: newCell } : o
                );
                break;
              default:
                overlaps = ctx.overlaps.overlaps;
            }
            return new Overlaps(overlaps);
          },
        }),
      },
    }
  );

export default createOverlapsMachine;
