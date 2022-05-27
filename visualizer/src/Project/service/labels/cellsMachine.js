/** Loads and stores cells arrays. */

import colormap from 'colormap';
import { assign, Machine, send } from 'xstate';
import { pure } from 'xstate/lib/actions';
import Cells from '../../cells';
import { fromEventBus } from '../eventBus';

const createCellsMachine = ({ eventBuses, undoRef }) =>
  Machine(
    {
      id: 'cells',
      entry: send('REGISTER_LABELS', { to: undoRef }),
      invoke: [
        { id: 'eventBus', src: fromEventBus('cells', () => eventBuses.cells) },
        { src: fromEventBus('cells', () => eventBuses.arrays) },
        { src: fromEventBus('cells', () => eventBuses.load) },
        { src: fromEventBus('cells', () => eventBuses.image) },
        { id: 'undo', src: fromEventBus('cells', () => eventBuses.undo) },
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
        undoRef,
        historyRef: null,
      },
      on: {
        SET_FRAME_MODE: { actions: 'setFrameMode' },
        SET_FRAME: { actions: 'setFrame' },
        // TODO: right now changes to segment & cells are stored together in segment history
        // as we generalize to dependencies between labels, each may want to store its own changes)
        CELLS_FROM_SEGMENT_EDIT: { actions: ['updateCells', 'setColormap', 'sendCells'] },
        RESTORE: { actions: ['setCells', 'setColormap', 'sendCells'] },
      },
      initial: 'loading',
      states: {
        loading: {
          type: 'parallel',
          states: {
            getCells: {
              initial: 'loading',
              states: {
                loading: {
                  on: {
                    LOADED: {
                      target: 'done',
                      actions: 'setCells',
                    },
                  },
                },
                done: { type: 'final' },
              },
            },
            getHistoryRef: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    LABEL_HISTORY: {
                      target: 'done',
                      actions: 'setHistoryRef',
                    },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: { target: 'idle', actions: ['setColormap', 'sendCells'] },
        },
        idle: {
          on: {
            REPLACE: { actions: 'replace', target: 'editing' },
            DELETE: { actions: 'delete', target: 'editing' },
            SWAP: { actions: 'swap', target: 'editing' },
            NEW: { actions: 'new', target: 'editing' },
          },
        },
        editing: {
          entry: (c, e) => console.log(c, e),
          type: 'parallel',
          states: {
            getEdit: {
              entry: send('SAVE', { to: (ctx) => ctx.undoRef }),
              initial: 'idle',
              states: {
                idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
                done: { entry: (c, e) => console.log(c, e), type: 'final' },
              },
            },
            getEdits: {
              initial: 'editing',
              states: {
                editing: { on: { EDITED: { target: 'done', actions: 'setEdited' } } },
                done: { entry: (c, e) => console.log(c, e), type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: [
              (c, e) => console.log(c, e),
              'sendEdited',
              'sendSnapshot',
              'setColormap',
              'sendCells',
            ],
          },
        },
      },
    },
    {
      actions: {
        setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
        setEdit: assign({ edit: (_, evt) => evt.edit }),
        setEdited: assign({ edited: (_, evt) => evt }),
        sendSnapshot: send(
          (ctx) => ({
            type: 'SNAPSHOT',
            before: { type: 'RESTORE', cells: ctx.cells },
            after: { type: 'RESTORE', cells: ctx.edited.cells },
            edit: ctx.edit,
          }),
          { to: (ctx) => ctx.historyRef }
        ),
        sendEdited: send((ctx) => ({ ...ctx.edited, edit: ctx.edit }), { to: 'eventBus' }),
        setFrameMode: assign({ frameMode: (_, evt) => evt.frameMode }),
        setFrame: assign({ frame: (_, evt) => evt.frame }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        updateCells: pure((ctx, evt) => {
          const cells = new Cells([
            ...ctx.cells.cells.filter((o) => o.z !== evt.frame),
            ...evt.cells.map((o) => ({ ...o, z: evt.frame })),
          ]);
          const before = { type: 'RESTORE', cells: ctx.cells };
          const after = { type: 'RESTORE', cells: cells };
          const snapshot = { type: 'SNAPSHOT', before, after, edit: evt.edit };
          return [
            assign({ cells }),
            send({ type: 'EDITED_CELLS', cells, edit: evt.edit }, { to: 'eventBus' }),
            send(snapshot, { to: ctx.historyRef }),
          ];
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
        replace: send((ctx, evt) => {
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
          return { type: 'EDITED', cells: new Cells(cells) };
        }),
        delete: send((ctx, evt) => {
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
          return { type: 'EDITED', cells: new Cells(cells) };
        }),
        swap: send((ctx, evt) => {
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
          return { type: 'EDITED', cells: new Cells(cells) };
        }),
        new: send((ctx, evt) => {
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
          return { type: 'EDITED', cells: new Cells(cells) };
        }),
      },
    }
  );

export default createCellsMachine;
