/**
 * Manages the controls to edit the cell types.
 * Sends ADD_CELL, ADD_CELLTYPE, REMOVE_CELL, REMOVE_CELLTYPE, EDIT_COLOR, and EDIT_NAME to the divisions event bus
 * when interacting with the UI.
 */
import { assign, Machine, send } from 'xstate';
import { pure } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';

const createEditCellTypesMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'editCellTypes',
      invoke: [
        { id: 'select', src: fromEventBus('editCellTypes', () => eventBuses.select, 'SELECTED') },
        { src: fromEventBus('editCellTypes', () => eventBuses.hovering, 'HOVERING') },
        { id: 'cellTypes', src: fromEventBus('editCellTypes', () => eventBuses.cellTypes) },
      ],
      context: {
        selected: null,
        hovering: null,
        cell: null,
        cellType: null,
        name: null,
        color: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        REMOVE_ONE: { actions: 'removeCell' },
        REMOVE_TYPE: { actions: 'removeCellType' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: { actions: 'select' },
            ADD: { target: 'addingCell', actions: ['setCellType', 'setName'] },
            ADD_TYPE: { actions: ['setColor', 'addCellType'] },
            COLOR: { actions: ['setCellType', 'setColor', 'editColor'] },
            NAME: { actions: ['setCellType', 'setName', 'editName'] },
          },
        },
        addingCell: {
          entry: 'resetCell',
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              { cond: 'shift', actions: 'setCell' },
              { cond: 'onCell', actions: 'addCell' },
              { actions: 'setCell' },
            ],
            RESET: { target: 'idle' },
          },
        },
      },
    },
    {
      services: {},
      guards: {
        onNoCell: (ctx) => ctx.hovering.length === 0,
        shift: (_, evt) => evt.shiftKey,
        onCell: (ctx) => ctx.hovering.includes(ctx.cell),
      },
      actions: {
        select: send('SELECT', { to: 'select' }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        removeCell: send(
          (_, evt) => ({
            type: 'REMOVE_CELL',
            cell: evt.cell,
            cellType: evt.cellType,
          }),
          { to: 'cellTypes' }
        ),
        removeCellType: send(
          (_, evt) => ({
            type: 'REMOVE_CELLTYPE',
            cellType: evt.cellType,
          }),
          { to: 'cellTypes' }
        ),
        setColor: assign({ color: (_, evt) => evt.color }),
        setName: assign({ name: (_, evt) => evt.name }),
        setCellType: assign({ cellType: (_, evt) => evt.cellType }),
        setCell: assign({
          cell: (ctx) => {
            const { hovering, cell } = ctx;
            const i = hovering.indexOf(cell);
            return i === -1 || i === hovering.length - 1 ? hovering[0] : hovering[i + 1];
          },
        }),
        resetCell: assign({ cell: null }),
        addCell: pure((ctx) => [
          send(
            {
              type: 'ADD_CELL',
              cellType: ctx.cellType,
              cell: ctx.cell,
            },
            { to: 'cellTypes' }
          ),
          assign({ cell: null }),
        ]),
        addCellType: send(
          (ctx) => ({
            type: 'ADD_CELLTYPE',
            color: ctx.color,
          }),
          { to: 'cellTypes' }
        ),
        editColor: send(
          (ctx) => ({
            type: 'EDIT_COLOR',
            cellType: ctx.cellType,
            color: ctx.color,
          }),
          { to: 'cellTypes' }
        ),
        editName: send(
          (ctx) => ({
            type: 'EDIT_NAME',
            cellType: ctx.cellType,
            name: ctx.name,
          }),
          { to: 'cellTypes' }
        ),
      },
    }
  );

export default createEditCellTypesMachine;
