import { assign, Machine, send } from 'xstate';
import { pure, respond } from 'xstate/lib/actions';
import { fromEventBus } from './eventBus';

function prevLabel(label, overlaps) {
  const numLabels = overlaps[0].length - 1;
  const prevLabel = label - 1;
  if (prevLabel === 0) {
    return numLabels;
  }
  return prevLabel;
}

function nextLabel(label, overlaps) {
  const numLabels = overlaps[0].length - 1;
  const nextLabel = label + 1;
  if (nextLabel > numLabels) {
    return 1;
  }
  return nextLabel;
}

const createSelectMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'select',
      invoke: [
        { id: 'eventBus', src: fromEventBus('select', () => eventBuses.select) },
        { src: fromEventBus('select', () => eventBuses.canvas) },
        { src: fromEventBus('select', () => eventBuses.labeled) },
        { src: fromEventBus('select', () => eventBuses.overlaps) },
        { src: fromEventBus('select', () => eventBuses.image) },
      ],
      context: {
        selected: 1,
        hovering: null,
        overlaps: null,
        frame: 0,
      },
      on: {
        GET_SELECTED: { actions: 'sendSelected' },

        HOVERING: { actions: 'setHovering' },
        OVERLAPS: { actions: ['setOverlaps'] },
        FRAME: { actions: 'setFrame' },
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
        select: pure(({ selected, hovering, overlaps, frame }) => {
          const cells = overlaps.getCellsForValue(hovering, frame);
          const i = cells.indexOf(selected);
          let newCell;
          if (cells.length === 0 || i === cells.length - 1) {
            newCell = 0;
          } else if (i === -1) {
            newCell = cells[0];
          } else {
            newCell = cells[i + 1];
          }
          return send({ type: 'SELECTED', selected: newCell });
        }),
        reset: send({ type: 'SELECTED', selected: 0 }),
        selectNew: send(({ overlaps }) => ({
          type: 'SELECTED',
          selected: overlaps.getNewCell(),
        })),
        selectPrevious: send(({ selected, overlaps }) => ({
          type: 'SELECTED',
          selected: selected - 1 < 1 ? overlaps.getNewCell() : selected - 1,
        })),
        selectNext: send(({ selected, overlaps }) => {
          return {
            type: 'SELECTED',
            selected: selected + 1 > overlaps.getNewCell() ? 1 : selected + 1,
          };
        }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setOverlaps: assign({ overlaps: (_, { overlaps }) => overlaps }),
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
