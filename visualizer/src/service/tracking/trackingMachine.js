import { assign, Machine, sendParent } from 'xstate';

const trackingMachine = Machine(
  {
    id: 'tracking',
    context: {
      foreground: 1,
      background: 0,
      selected: 1,
      label: null,
      labels: {},
      parent: null,
    },
    on: {
      FOREGROUND: {
        cond: (_, { foreground }) => foreground !== 0,
        actions: 'setForeground',
      },
      LABEL: { actions: 'setLabel' },
      LABELS: { actions: 'setLabels' },
      REMOVE: { actions: 'remove' },
      REPLACE_WITH_NEW_CELL: { actions: 'replaceWithNewCell' },
      REPLACE_WITH_PARENT: { actions: 'replaceWithParent' },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          ADD: { target: 'addingDaughter', actions: 'recordParent' },
        },
      },
      addingDaughter: {
        on: {
          mouseup: [
            { cond: 'onNoLabel' },
            {
              target: 'idle',
              actions: 'add',
            },
          ],
        },
      },
    },
  },
  {
    services: {},
    guards: {
      onNoLabel: ({ label }) => label === 0,
    },
    actions: {
      setForeground: assign({ foreground: (_, { foreground }) => foreground }),
      setLabel: assign({ label: (_, { label }) => label }),
      setLabels: assign({ labels: (_, { labels }) => labels }),
      recordParent: assign({ parent: (_, { parent }) => parent }),
      remove: sendParent((_, { daughter }) => ({
        type: 'EDIT',
        action: 'remove_daughter',
        args: {
          daughter,
        },
      })),
      add: sendParent(({ parent, label }) => ({
        type: 'EDIT',
        action: 'add_daughter',
        args: {
          parent: parent,
          daughter: label,
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
