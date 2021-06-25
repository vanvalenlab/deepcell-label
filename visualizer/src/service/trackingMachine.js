import { assign, Machine } from 'xstate';

const trackingMachine = Machine(
  {
    id: 'tracking',
    context: {
      foreground: 1,
      labels: {},
      daughters: [],
      frames: [],
      parent: null,
    },
    on: {
      FOREGROUND: {
        cond: (_, { foreground }) => foreground !== 0,
        actions: ['setForeground', 'updateDivision'],
      },
      LABELS: { actions: ['setLabels', 'updateDivision'] },
    },
  },
  {
    services: {},
    guards: {},
    actions: {
      setForeground: assign({
        foreground: (_, { foreground }) => foreground,
      }),
      setLabels: assign({
        labels: (_, { labels }) => labels,
      }),
      updateDivision: assign({
        daughters: ({ labels, foreground }) => labels[foreground]['daughters'],
        parent: ({ labels, foreground }) => labels[foreground]['parent'],
        frames: ({ labels, foreground }) => labels[foreground]['frames'],
      }),
    },
  }
);

export default trackingMachine;
