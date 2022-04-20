import { actions, assign, Machine, send } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from './eventBus';

const { pure } = actions;

function prevLabel(label, labels) {
  const allLabels = Object.keys(labels).map(Number);
  const smallerLabels = allLabels.filter((val) => val < label);
  const prevLabel = Math.max(...smallerLabels);
  if (prevLabel === -Infinity) {
    return Math.max(...allLabels);
  }
  return prevLabel;
}

function nextLabel(label, labels) {
  const allLabels = Object.keys(labels).map(Number);
  const largerLabels = Object.keys(labels)
    .map(Number)
    .filter((val) => val > label);
  const nextLabel = Math.min(...largerLabels);
  if (nextLabel === Infinity) {
    return Math.min(...allLabels);
  }
  return nextLabel;
}

const selectActions = {
  selectForeground: pure(({ hovering, foreground, background }) => {
    return [
      send({ type: 'FOREGROUND', foreground: hovering }),
      send({
        type: 'BACKGROUND',
        background: hovering === background ? foreground : background,
      }),
    ];
  }),
  selectBackground: pure(({ hovering, foreground, background }) => {
    return [
      send({ type: 'BACKGROUND', background: hovering }),
      send({
        type: 'FOREGROUND',
        foreground: hovering === foreground ? background : foreground,
      }),
    ];
  }),
  sendSelected: send(({ foreground, background }) => ({
    type: 'SELECTED',
    selected: foreground === 0 ? background : foreground,
  })),
};

const selectShortcutActions = {
  switch: pure(({ foreground, background }) => {
    return [
      send({ type: 'FOREGROUND', foreground: background }),
      send({ type: 'BACKGROUND', background: foreground }),
    ];
  }),
  newForeground: send(({ labels }) => ({
    type: 'FOREGROUND',
    foreground: Math.max(0, ...Object.keys(labels).map(Number)) + 1,
  })),
  resetForeground: send({ type: 'FOREGROUND', foreground: 0 }),
  resetBackground: send({ type: 'BACKGROUND', background: 0 }),
};

const cycleActions = {
  prevForeground: send(({ foreground, labels }) => ({
    type: 'FOREGROUND',
    foreground: prevLabel(foreground, labels),
  })),
  nextForeground: send(({ foreground, labels }) => ({
    type: 'FOREGROUND',
    foreground: nextLabel(foreground, labels),
  })),
  prevBackground: send(({ background, labels }) => ({
    type: 'BACKGROUND',
    background: prevLabel(background, labels),
  })),
  nextBackground: send(({ background, labels }) => ({
    type: 'BACKGROUND',
    background: nextLabel(background, labels),
  })),
};

const setActions = {
  setHovering: assign({ hovering: (_, { hovering }) => hovering }),
  setLabels: assign({ labels: (_, { labels }) => labels }),
  setForeground: assign({ foreground: (_, { foreground }) => foreground }),
  setBackground: assign({ background: (_, { background }) => background }),
  setSelected: assign({ selected: (_, { selected }) => selected }),
};

const createSelectMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'select',
      invoke: [
        {
          id: 'eventBus',
          src: fromEventBus('select', () => eventBuses.select),
        },
        { src: fromEventBus('select', () => eventBuses.canvas) },
        { src: fromEventBus('select', () => eventBuses.labeled) },
        { src: fromEventBus('select', () => eventBuses.labels) },
      ],
      context: {
        selected: 1,
        foreground: 1,
        background: 0,
        hovering: null,
        labels: {},
      },
      on: {
        SHIFT_CLICK: [
          {
            cond: 'doubleClick',
            actions: ['selectForeground', send({ type: 'BACKGROUND', background: 0 })],
          },
          { cond: 'onBackground', actions: 'selectForeground' },
          { actions: 'selectBackground' },
        ],

        GET_STATE: {
          actions: ['sendSelected', 'sendForeground', 'sendBackground'],
        },

        HOVERING: { actions: 'setHovering' },
        LABELS: { actions: 'setLabels' },
        SELECTED: { actions: ['setSelected', 'sendToEventBus'] },
        FOREGROUND: {
          actions: ['setForeground', 'sendSelected', 'sendToEventBus'],
        },
        BACKGROUND: {
          actions: ['setBackground', 'sendSelected', 'sendToEventBus'],
        },
        SET_FOREGROUND: {
          actions: send((_, { foreground }) => ({
            type: 'FOREGROUND',
            foreground,
          })),
        },
        SELECT_FOREGROUND: { actions: 'selectForeground' },
        SELECT_BACKGROUND: { actions: 'selectBackground' },
        SWITCH: { actions: 'switch' },
        NEW_FOREGROUND: { actions: 'newForeground' },
        RESET_FOREGROUND: { actions: 'resetForeground' },
        RESET_BACKGROUND: { actions: 'resetBackground' },
        PREV_FOREGROUND: { actions: 'prevForeground' },
        NEXT_FOREGROUND: { actions: 'nextForeground' },
        PREV_BACKGROUND: { actions: 'prevBackground' },
        NEXT_BACKGROUND: { actions: 'nextBackground' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
      },
    },
    {
      guards: {
        doubleClick: (_, event) => event.detail === 2,
        onBackground: ({ hovering, background }) => hovering === background,
      },
      actions: {
        ...selectActions,
        ...selectShortcutActions,
        ...cycleActions,
        ...setActions,
        save: respond(({ foreground, background }) => ({
          type: 'RESTORE',
          foreground,
          background,
        })),
        restore: pure((_, { foreground, background }) => [
          respond('RESTORED'),
          send({ type: 'FOREGROUND', foreground }),
          send({ type: 'BACKGROUND', background }),
        ]),
        sendForeground: send((ctx) => ({
          type: 'FOREGROUND',
          foreground: ctx.foreground,
        })),
        sendBackground: send((ctx) => ({
          type: 'BACKGROUND',
          background: ctx.background,
        })),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
        sendForeground: send((ctx) => ({
          type: 'FOREGROUND',
          foreground: ctx.foreground,
        })),
        sendBackground: send((ctx) => ({
          type: 'BACKGROUND',
          background: ctx.background,
        })),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
      },
    }
  );

export default createSelectMachine;
