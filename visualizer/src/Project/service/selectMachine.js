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
      ],
      context: {
        selected: 1,
        hovering: null,
        overlaps: null,
      },
      on: {
        GET_SELECTED: { actions: 'sendSelected' },

        HOVERING: { actions: 'setHovering' },
        OVERLAPS: { actions: 'setOverlaps' },
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
        select: pure(({ selected, hovering, overlaps }) => {
          const labels = overlaps[hovering];
          if (labels[selected]) {
            // Get next label that hovering value encodes
            const copy = [...labels];
            copy[0] = 1; // Reset (select 0) after cycling through all labels
            const reordered = copy.slice(selected + 1).concat(copy.slice(0, selected + 1));
            const nextLabel = (reordered.findIndex((i) => !!i) + selected + 1) % labels.length;
            return send({ type: 'SELECTED', selected: nextLabel });
          }
          const firstLabel = labels.findIndex((i) => i === 1);
          return send({ type: 'SELECTED', selected: firstLabel === -1 ? 0 : firstLabel });
        }),
        reset: send({ type: 'SELECTED', selected: 0 }),
        selectNew: send(({ overlaps }) => ({
          type: 'SELECTED',
          selected: overlaps[0].length,
        })),
        selectPrevious: send(({ selected, overlaps }) => ({
          type: 'SELECTED',
          selected: prevLabel(selected, overlaps),
        })),
        selectNext: send(({ selected, overlaps }) => ({
          type: 'SELECTED',
          selected: nextLabel(selected, overlaps),
        })),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setOverlaps: assign({ overlaps: (_, { overlaps }) => overlaps }),
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
