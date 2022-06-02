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
        { src: fromEventBus('cells', () => eventBuses.image, 'SET_T') },
      ],
      context: {
        cells: null, // Cells object
        t: 0,
        colormap: [
          [0, 0, 0, 1],
          ...colormap({ colormap: 'viridis', format: 'rgba' }),
          [255, 255, 255, 1],
        ],
        mode: 'one',
        undoRef,
        historyRef: null,
      },
      on: {
        SET_T: { actions: 'setT' },
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
          entry: ['setColormap', 'sendCells'],
          on: {
            REPLACE: { actions: [(c, e) => console.log(c, e), 'replace'], target: 'editing' },
            DELETE: { actions: 'delete', target: 'editing' },
            SWAP: { actions: 'swap', target: 'editing' },
            NEW: { actions: 'new' }, // sends REPLACE event
            SET_MODE: { actions: 'setMode' },
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
                done: { entry: (c, e) => console.log(c, e), type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: 'finishEditing',
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
            const editedCells = evt.cells.cells;
            const { t, mode } = ctx;
            const combinedCells = combine(cells, editedCells, t, mode);
            return new Cells(combinedCells);
          },
        }),
        finishEditing: pure((ctx, evt) => {
          const { editEvent, edit, mode, editedCells, cells, historyRef } = ctx;
          return [
            send({ ...editEvent, edit, mode, cells: editedCells }, { to: 'eventBus' }),
            assign({ cells: (ctx) => ctx.editedCells }),
            send(
              {
                type: 'SNAPSHOT',
                before: { type: 'RESTORE', cells },
                after: { type: 'RESTORE', cells: editedCells },
                edit,
              },
              { to: historyRef }
            ),
          ];
        }),
        setMode: assign({ mode: (_, evt) => evt.mode }),
        setT: assign({ t: (_, evt) => evt.t }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        updateCells: pure((ctx, evt) => {
          const cells = new Cells([
            ...ctx.cells.cells.filter((cell) => cell.t !== evt.t),
            ...evt.cells.map((cell) => ({ ...cell, t: evt.t })),
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
