/** Loads and stores cells arrays. */

import colormap from 'colormap';
import { assign, Machine, send } from 'xstate';
import Cells from '../cells';
import { fromEventBus } from './eventBus';

const createCellsMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'cells',
      invoke: [
        { id: 'eventBus', src: fromEventBus('cells', () => eventBuses.cells) },
        { src: fromEventBus('cells', () => eventBuses.api) },
        { src: fromEventBus('cells', () => eventBuses.load) },
        { src: fromEventBus('cells', () => eventBuses.image) },
      ],
      context: {
        cells: null, // Cells object
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
              target: 'editedCells',
              actions: 'setCells',
            },
          },
        },
        editedCells: {
          entry: ['setColormap', 'sendCells'],
          always: 'idle',
        },
        idle: {
          on: {
            SET_FRAME_MODE: { actions: 'setFrameMode' },
            SET_FRAME: { actions: 'setFrame' },
            EDITED: { actions: 'updateCells', target: 'editedCells' },
            REPLACE: { actions: 'replace', target: 'editedCells' },
            DELETE: { actions: 'delete', target: 'editedCells' },
            SWAP: { actions: 'swap', target: 'editedCells' },
            NEW: { actions: 'new', target: 'editedCells' },
          },
        },
      },
    },
    {
      actions: {
        setFrameMode: assign({ frameMode: (_, evt) => evt.frameMode }),
        setFrame: assign({ frame: (_, evt) => evt.frame }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        updateCells: assign({
          cells: (ctx, evt) => {
            return new Cells([
              ...ctx.cells.cells.filter((o) => o.z !== evt.frame),
              ...evt.cells.map((o) => ({ ...o, z: evt.frame })),
            ]);
          },
        }),
        sendCells: send(
          (ctx, evt) => ({
            type: 'CELLS',
            cells: ctx.cells,
          }),
          { to: 'eventBus' }
        ),
        setColormap: assign({
          colormap: (ctx, evt) => [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, ctx.cells.getNewCell() - 1),
              format: 'rgba',
            }),
            [255, 255, 255, 1],
          ],
        }),
        replace: assign({
          cells: (ctx, evt) => {
            let cells;
            switch (ctx.frameMode) {
              case 'one':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.b && o.z === ctx.frame ? { ...o, cell: evt.a } : o
                );
                break;
              case 'past':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.b && o.z <= ctx.frame ? { ...o, cell: evt.a } : o
                );
                break;
              case 'future':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.b && o.z >= ctx.frame ? { ...o, cell: evt.a } : o
                );
                break;
              case 'all':
                cells = ctx.cells.cells.map((o) => (o.cell === evt.b ? { ...o, cell: evt.a } : o));
                break;
              default:
                cells = ctx.cells.cells;
            }
            return new Cells(cells);
          },
        }),
        delete: assign({
          cells: (ctx, evt) => {
            let cells;
            switch (ctx.frameMode) {
              case 'one':
                cells = ctx.cells.cells.filter((o) => o.z !== ctx.frame || o.cell !== evt.cell);
                break;
              case 'past':
                cells = ctx.cells.cells.filter((o) => o.z > ctx.frame || o.cell !== evt.cell);
                break;
              case 'future':
                cells = ctx.cells.cells.filter((o) => o.z < ctx.frame || o.cell !== evt.cell);
                break;
              case 'all':
                cells = ctx.cells.cells.filter((o) => o.cell !== evt.cell);
                break;
              default:
                cells = ctx.cells.cells;
            }
            return new Cells(cells);
          },
        }),
        swap: assign({
          cells: (ctx, evt) => {
            let cells;
            switch (ctx.frameMode) {
              case 'one':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.a && o.z === ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z === ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'past':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.a && o.z <= ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z <= ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'future':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.a && o.z >= ctx.frame
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b && o.z >= ctx.frame
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              case 'all':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.a
                    ? { ...o, cell: evt.b }
                    : o.cell === evt.b
                    ? { ...o, cell: evt.a }
                    : o
                );
                break;
              default:
                cells = ctx.cells.cells;
            }
            return new Cells(cells);
          },
        }),
        new: assign({
          cells: (ctx, evt) => {
            let cells;
            const newCell = ctx.cells.getNewCell();
            switch (ctx.frameMode) {
              case 'one':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.cell && o.z === ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'past':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.cell && o.z <= ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'future':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.cell && o.z >= ctx.frame ? { ...o, cell: newCell } : o
                );
                break;
              case 'all':
                cells = ctx.cells.cells.map((o) =>
                  o.cell === evt.cell ? { ...o, cell: newCell } : o
                );
                break;
              default:
                cells = ctx.cells.cells;
            }
            return new Cells(cells);
          },
        }),
      },
    }
  );

export default createCellsMachine;
