import { assign, Machine, sendParent } from 'xstate';

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
      LABELS: {
        actions: ['setLabels', 'updateDivision'],
      },
      REMOVE: { actions: 'remove' },
      REPLACE_WITH_NEW_CELL: { actions: 'replaceWithNewCell' },
      REPLACE_WITH_PARENT: { actions: 'replaceWithParent' },
      ADD: { actions: 'add' },
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
      remove: sendParent((_, { daughter }) => ({
        type: 'EDIT',
        action: 'remove_daughter',
        args: {
          daughter,
        },
      })),
      add: sendParent((_, { parent, daughter }) => ({
        type: 'EDIT',
        action: 'add_daughter',
        args: {
          parent,
          daughter,
        },
      })),
      replaceWithParent: sendParent((_, { parent, daughter }) => ({
        type: 'EDIT',
        action: 'replace',
        args: {
          label_1: parent,
          label_2: daughter,
        },
      })),
      replaceWithNewCell: sendParent((_, { daughter }) => ({
        type: 'EDIT',
        action: 'new_track',
        args: {
          label: daughter,
        },
      })),
    },
  }
);

export default trackingMachine;
