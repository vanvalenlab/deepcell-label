/** Manages cells labels.
 * Broadcasts CELLS event on cells event bus.
 * Edits cells with REPLACE, DELETE, NEW, and SWAP events.
 * Sets mode for editing cells across time (past, future, one, or all) with SET_MODE event.
 */

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
        { src: fromEventBus('cells', () => eventBuses.labeled, 'SET_FEATURE') },
      ],
      context: {
        cells: [],
        t: 0,
        c: 0,
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
        SET_FEATURE: { actions: 'setC' },
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
            REPLACE: { actions: 'replace', target: 'editing' },
            DELETE: { actions: 'delete', target: 'editing' },
            SWAP: { actions: 'swap', target: 'editing' },
            NEW_CELL: { actions: 'newCell' }, // sends REPLACE event
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
                done: { entry: 'sendEditEvent', type: 'final' },
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
        sendEditEvent: send((ctx) => ({ ...ctx.editEvent, edit: ctx.edit, mode: ctx.mode }), {
          to: 'eventBus',
        }),
        setEditedCells: assign({
          editedCells: (ctx, evt) => {
            const { cells, t, mode, c } = ctx;
            let newCells = combine(cells, evt.cells, t, mode);
            newCells = [
              ...cells.filter((cell) => cell.c !== c),
              ...newCells.filter((cell) => cell.c === c),
            ];
            return newCells;
          },
        }),
        finishEditing: pure((ctx, evt) => {
          const { edit, editedCells, cells, historyRef } = ctx;
          return [
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
        setC: assign({ c: (_, evt) => evt.feature }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        updateCells: pure((ctx, evt) => {
          const cells = [
            ...ctx.cells.filter((cell) => cell.t !== evt.t || cell.c !== evt.c),
            ...evt.cells.map((cell) => ({ ...cell, t: evt.t, c: evt.c })),
          ];
          const newColormap = [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, new Cells(cells).getNewCell() - 1),
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
        sendCells: send((ctx) => ({ type: 'CELLS', cells: ctx.cells }), { to: 'eventBus' }),
        // needs to be pure because assign events have priority
        // NOTE: this is changing in xstate v5, can revert to assign when that's released
        setColormap: pure((ctx) =>
          assign({
            colormap: [
              [0, 0, 0, 1],
              ...colormap({
                colormap: 'viridis',
                nshades: Math.max(9, new Cells(ctx.cells).getNewCell() - 1),
                format: 'rgba',
              }),
              [255, 255, 255, 1],
            ],
          })
        ),
        replace: send((ctx, evt) => {
          const { a, b } = evt;
          const cells = ctx.cells.map((c) => (c.cell === b ? { ...c, cell: a } : c));
          return { type: 'EDITED_CELLS', cells };
        }),
        delete: send((ctx, evt) => {
          const { cell } = evt;
          const cells = ctx.cells.filter((c) => c.cell !== cell);
          return { type: 'EDITED_CELLS', cells };
        }),
        swap: send((ctx, evt) => {
          const { a, b } = evt;
          const cells = ctx.cells.map((c) =>
            c.cell === a ? { ...c, cell: b } : c.cell === b ? { ...c, cell: a } : c
          );
          return { type: 'EDITED_CELLS', cells };
        }),
        newCell: send((ctx, evt) => ({
          type: 'REPLACE',
          a: new Cells(ctx.cells).getNewCell(),
          b: evt.cell,
        })),
      },
    }
  );

export default createCellsMachine;
