import { assign, Machine, send } from 'xstate';
import { pure, respond } from 'xstate/lib/actions';
import { fromEventBus } from './eventBus';

const createSelectMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'select',
      invoke: [
        { id: 'eventBus', src: fromEventBus('select', () => eventBuses.select) },
        { src: fromEventBus('select', () => eventBuses.canvas) },
        { src: fromEventBus('select', () => eventBuses.labeled) },
        { src: fromEventBus('select', () => eventBuses.cells) },
        { src: fromEventBus('select', () => eventBuses.image) },
      ],
      context: {
        selected: 1,
        hovering: null,
        cells: null,
        frame: 0,
      },
      on: {
        GET_SELECTED: { actions: 'sendSelected' },

        HOVERING: { actions: 'setHovering' },
        CELLS: { actions: ['setCells'] },
        SET_FRAME: { actions: 'setFrame' },
        SELECTED: { actions: ['setSelected', 'sendToEventBus'] },
        SET_SELECTED: { actions: send((_, { selected }) => ({ type: 'SELECTED', selected })) },
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
        select: pure(({ selected, hovering, cells, frame }) => {
          const hoveringCells = cells.getCellsForValue(hovering, frame);
          const i = hoveringCells.indexOf(selected);
          let newCell;
          if (hoveringCells.length === 0 || i === cells.length - 1) {
            newCell = 0;
          } else if (i === -1) {
            newCell = hoveringCells[0];
          } else {
            newCell = hoveringCells[i + 1];
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
        setCells: assign({ cells: (_, { cells }) => cells }),
        setSelected: assign({ selected: (_, { selected }) => selected }),
        setFrame: assign({ frame: (_, { frame }) => frame }),
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
