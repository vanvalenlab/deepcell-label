/** Loads and stores cells arrays. */

import colormap from 'colormap';
import { assign, Machine, send } from 'xstate';
import { pure } from 'xstate/lib/actions';
import Cells from '../../cells';
import { fromEventBus } from '../eventBus';
import { combine } from './utils';

const createCellsMachine = ({ eventBuses, undoRef }) =>
  Machine(
    {
      id: 'cells',
      entry: send('REGISTER_LABELS', { to: undoRef }),
      invoke: [
        { id: 'eventBus', src: fromEventBus('cells', () => eventBuses.cells) },
        { src: fromEventBus('cells', () => eventBuses.arrays, 'EDITED_SEGMENT') },
        { src: fromEventBus('cells', () => eventBuses.load, 'LOADED') },
        { src: fromEventBus('cells', () => eventBuses.image, 'SET_FRAME') },
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
        SET_FRAME: { actions: 'setT' },
        EDITED_SEGMENT: { actions: 'updateCells' },
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
            NEW: { actions: 'new' }, // sends REPLACE event
            SET_FRAME_MODE: { actions: 'setFrameMode' },
          },
        },
        editing: {
          entry: 'setEditEvent',
          type: 'parallel',
          states: {
            getEdit: {
              entry: [send('SAVE', { to: (ctx) => ctx.undoRef })],
              initial: 'idle',
              states: {
                idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
                done: { type: 'final' },
              },
            },
            getEdits: {
              initial: 'editing',
              states: {
                editing: { on: { EDITED_CELLS: { target: 'done', actions: 'setEditedCells' } } },
                done: { type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: [
              'useEditedCells',
              'sendEditedCells',
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
        setEditEvent: assign({ editEvent: (ctx, evt) => ({ ...evt, t: ctx.t }) }),
        setEditedCells: assign({
          editedCells: (ctx, evt) => {
            const cells = ctx.cells.cells;
            const editedCells = ctx.editedCells.cells;
            const { t, frameMode } = ctx;
            const combinedCells = combine(cells, editedCells, t, frameMode);
            return new Cells(combinedCells);
          },
        }),
        sendEditedCells: send(
          (ctx) => ({
            ...ctx.editEvent,
            edit: ctx.edit,
            frameMode: ctx.frameMode,
            cells: ctx.editedCells,
          }),
          {
            to: 'eventBus',
          }
        ),
        useEditedCells: assign({ cells: (ctx) => ctx.editedCells }),
        sendSnapshot: send(
          (ctx) => ({
            type: 'SNAPSHOT',
            before: { type: 'RESTORE', cells: ctx.cells },
            after: { type: 'RESTORE', cells: ctx.editedCells },
            edit: ctx.edit,
          }),
          { to: (ctx) => ctx.historyRef }
        ),
        setFrameMode: assign({ frameMode: (_, evt) => evt.frameMode }),
        setT: assign({ t: (_, evt) => evt.frame }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        updateCells: pure((ctx, evt) => {
          const cells = new Cells([
            ...ctx.cells.cells.filter((o) => o.z !== evt.frame),
            ...evt.cells.map((o) => ({ ...o, z: evt.frame })),
          ]);
          const newColormap = [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, cells.getNewCell() - 1),
              format: 'rgba',
            }),
            [255, 255, 255, 1],
          ];
          const before = { type: 'RESTORE', cells: ctx.cells };
          const after = { type: 'RESTORE', cells: cells };
          const snapshot = { type: 'SNAPSHOT', before, after, edit: evt.edit };
          return [
            assign({ cells, colormap: newColormap }),
            send({ type: 'EDITED_CELLS', cells, edit: evt.edit }, { to: 'eventBus' }),
            send(snapshot, { to: ctx.historyRef }),
            send({ type: 'CELLS', cells }, { to: 'eventBus' }),
          ];
        }),
        sendCells: send((ctx, evt) => ({ type: 'CELLS', cells: ctx.cells }), { to: 'eventBus' }),
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
          const { a, b } = evt;
          const cells = new Cells(
            ctx.cells.cells.map((c) => (c.cell === b ? { ...c, cell: a } : c))
          );
          return { type: 'EDITED_CELLS', cells };
        }),
        delete: send((ctx, evt) => {
          const { cell } = evt;
          const cells = new Cells(ctx.cells.cells.filter((c) => c.cell !== cell));
          return { type: 'EDITED_CELLS', cells };
        }),
        swap: send((ctx, evt) => {
          const { a, b } = evt;
          const cells = new Cells(
            ctx.cells.cells.map((c) =>
              c.cell === a ? { ...c, cell: b } : c.cell === b ? { ...c, cell: a } : c
            )
          );
          return { type: 'EDITED_CELLS', cells };
        }),
        new: send((ctx, evt) => ({ type: 'REPLACE', a: ctx.cells.getNewCell(), b: evt.cell })),
      },
    }
  );

export default createCellsMachine;
