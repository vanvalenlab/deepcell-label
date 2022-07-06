/** Manages which cell is selected. */
import { assign, Machine, send } from 'xstate';
import { pure, respond } from 'xstate/lib/actions';
import Cells from '../cells';
import { fromEventBus } from './eventBus';

const createSelectMachine = ({ eventBuses, undoRef }) =>
  Machine(
    {
      id: 'select',
      invoke: [
        { id: 'eventBus', src: fromEventBus('select', () => eventBuses.select) },
        { src: fromEventBus('select', () => eventBuses.cells, 'CELLS') },
        { src: fromEventBus('select', () => eventBuses.hovering, 'HOVERING') },
      ],
      entry: send('REGISTER_UI', { to: undoRef }),
      context: {
        selected: 1,
        hovering: null,
        cells: null,
      },
      on: {
        GET_SELECTED: { actions: 'sendSelected' },

        HOVERING: { actions: 'setHovering' },
        CELLS: { actions: 'setCells' },
        SELECTED: { actions: ['setSelected', 'sendToEventBus'] },
        SELECT: { actions: 'select' },
        SELECT_NEW: { actions: 'selectNew' },
        RESET: { actions: 'reset' },
        SELECT_PREVIOUS: { actions: 'selectPrevious' },
        SELECT_NEXT: { actions: 'selectNext' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
      },
    },
    {
      actions: {
        sendSelected: send(({ selected }) => ({ type: 'SELECTED', selected }), { to: 'eventBus' }),
        select: pure((ctx, evt) => {
          if (evt.cell) {
            return send({ type: 'SELECTED', selected: evt.cell });
          }
          const { selected, hovering } = ctx;
          const i = hovering.indexOf(selected);
          let newCell;
          if (hovering.length === 0 || i === hovering.length - 1) {
            newCell = 0;
          } else if (i === -1) {
            newCell = hovering[0];
          } else {
            newCell = hovering[i + 1];
          }
          return send({ type: 'SELECTED', selected: newCell });
        }),
        reset: send({ type: 'SELECTED', selected: 0 }),
        selectNew: send(({ cells }) => ({
          type: 'SELECTED',
          selected: cells.getNewCell(),
        })),
        selectPrevious: send(({ selected, cells }) => ({
          type: 'SELECTED',
          selected: selected - 1 < 1 ? cells.getNewCell() : selected - 1,
        })),
        selectNext: send(({ selected, cells }) => {
          return {
            type: 'SELECTED',
            selected: selected + 1 > cells.getNewCell() ? 1 : selected + 1,
          };
        }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setCells: assign({ cells: (_, { cells }) => new Cells(cells) }),
        setSelected: assign({ selected: (_, { selected }) => selected }),
        save: respond(({ selected }) => ({ type: 'RESTORE', selected })),
        restore: pure((_, { selected }) => [
          respond('RESTORED'),
          send({ type: 'SELECTED', selected }),
        ]),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
      },
    }
  );

export default createSelectMachine;
