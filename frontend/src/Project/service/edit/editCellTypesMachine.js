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
        multiSelected: [],
        hovering: null,
        hoveringCard: false,
        mode: 'overwrite',
        cell: null,
        cellType: null,
        cellTypeOpen: null,
        name: null,
        color: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        MULTISELECTION: { actions: 'setMultiSelected' },
        HOVERING: { actions: 'setHovering' },
        TOGGLE_HOVER: { actions: 'toggleHoveringCard' },
        SET_MODE: { actions: 'setMode' }, // overwrite / multilabel
        SET_CELLTYPE_OPEN: { actions: ['setOpenedCellType', 'setName'] },
        COLOR: { actions: ['setCellType', 'setColor', 'editColor'] },
        NAME: { actions: ['setCellType', 'setName', 'editName'] },
        TOGGLE: { actions: ['setCellType', 'toggleOn'] },
        OPACITY: { actions: ['setCellType', 'changeOpacity'] },
        TOGGLE_ALL: { actions: 'toggleAll' },
        UNTOGGLE_ALL: { actions: 'untoggleAll' },
        ADD_LABEL: { actions: ['setSelectedCell', 'setCellType', 'addCell'] },
        REMOVE_LABEL: { actions: ['setSelectedCell', 'setCellType', 'removeCell'] },
        MULTIADD: { actions: ['setCellType', 'multiAddCells'] },
        MULTIREMOVE: { actions: ['setCellType', 'multiRemoveCells'] },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: { actions: 'select' },
            ADD_MODE: { target: 'addingCell' },
            REMOVE_MODE: { target: 'removingCell' },
            ADD_TYPE: { actions: ['setColor', 'addCellType'] },
            REMOVE_TYPE: { actions: 'removeCellType' },
          },
        },
        addingCell: {
          entry: 'resetCell',
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              { cond: 'shift', actions: 'setCell' },
              { cond: 'onCell', actions: ['setCellTypeToOpened', 'addCell'] },
              { actions: 'setCell' },
            ],
            RESET: { target: 'idle' },
          },
        },
        removingCell: {
          entry: 'resetCell',
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              { cond: 'shift', actions: 'setCell' },
              { cond: 'onCell', actions: ['setCellTypeToOpend', 'removeCell'] },
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
        onCell: (ctx) => ctx.hovering.includes(ctx.cell) && ctx.cellTypeOpen, // if hovering over the cell and a cell type is open
      },
      actions: {
        select: send('SELECT', { to: 'select' }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setMultiSelected: assign({ multiSelected: (ctx, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        toggleHoveringCard: assign({ hoveringCard: (ctx) => !ctx.hoveringCard }),
        setMode: assign({ mode: (_, evt) => evt.mode }),
        setOpenedCellType: assign({ cellTypeOpen: (_, evt) => evt.cellType }),
        setCellTypeToOpened: assign({ cellType: (ctx) => ctx.cellTypeOpen }),
        removeCell: pure((ctx, _) => [
          send(
            {
              type: 'REMOVE_CELL',
              cell: ctx.cell,
              cellType: ctx.cellType,
            },
            { to: 'cellTypes' }
          ),
          assign({ cell: null }),
        ]),
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
        setSelectedCell: assign({ cell: (_, evt) => evt.cell }),
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
              mode: ctx.mode,
            },
            { to: 'cellTypes' }
          ),
          assign({ cell: null }),
        ]),
        multiAddCells: pure((ctx) => [
          send(
            {
              type: 'MULTI_ADD_CELLS',
              cellType: ctx.cellType,
              cells: ctx.multiSelected,
              mode: ctx.mode,
            },
            { to: 'cellTypes' }
          ),
          assign({ multiSelected: [] }),
        ]),
        multiRemoveCells: pure((ctx) => [
          send(
            {
              type: 'MULTI_REMOVE_CELLS',
              cellType: ctx.cellType,
              cells: ctx.multiSelected,
            },
            { to: 'cellTypes' }
          ),
          assign({ multiSelected: [] }),
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
        toggleOn: send(
          (ctx) => ({
            type: 'EDIT_IS_ON',
            cellType: ctx.cellType,
          }),
          { to: 'cellTypes' }
        ),
        toggleAll: send(
          (ctx) => ({
            type: 'TOGGLE_ALL_ON',
          }),
          { to: 'cellTypes' }
        ),
        untoggleAll: send(
          (ctx) => ({
            type: 'TOGGLE_ALL_OFF',
          }),
          { to: 'cellTypes' }
        ),
        changeOpacity: send(
          (ctx, evt) => ({
            type: 'EDIT_OPACITY',
            cellType: ctx.cellType,
            opacity: evt.opacity,
          }),
          { to: 'cellTypes' }
        ),
      },
    }
  );

export default createEditCellTypesMachine;
