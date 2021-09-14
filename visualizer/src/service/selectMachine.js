import { actions, assign, Machine, send, sendParent } from 'xstate';

const { pure } = actions;

function prevLabel(label, labels) {
  const allLabels = Object.keys(labels).map(Number);
  const smallerLabels = allLabels.filter(val => val < label);
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
    .filter(val => val > label);
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
  setHovering: assign({ hovering: (_, { label }) => label }),
  setLabels: assign({ labels: (_, { labels }) => labels }),
  setForeground: assign({ foreground: (_, { foreground }) => foreground }),
  setBackground: assign({ background: (_, { background }) => background }),
  setSelected: assign({ selected: (_, { selected }) => selected }),
};

const selectMachine = Machine(
  {
    id: 'select',
    context: {
      selected: 1,
      foreground: 1,
      background: 0,
      hovering: 0,
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

      LABEL: { actions: 'setHovering' },
      LABELS: { actions: 'setLabels' },
      SELECTED: { actions: ['setSelected', sendParent((c, e) => e)] },
      FOREGROUND: {
        actions: ['setForeground', 'sendSelected', sendParent((c, e) => e)],
      },
      BACKGROUND: {
        actions: ['setBackground', 'sendSelected', sendParent((c, e) => e)],
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
    },
  }
);

export default selectMachine;
