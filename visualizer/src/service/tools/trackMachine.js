import { assign, Machine, sendParent } from 'xstate';

const trackMachine = Machine(
  {
    id: 'track',
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
      REPLACE_WITH_PARENT: { actions: 'replaceWithParent' },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          mouseup: { actions: 'selectForeground' },
          ADD_DAUGHTER: { target: 'addingDaughter', actions: 'recordParent' },
          CREATE_NEW_CELL: { actions: 'createNewCell' },
        },
      },
      addingDaughter: {
        on: {
          mouseup: [
            { cond: 'onNoLabel' },
            {
              target: 'idle',
              actions: 'addDaughter',
            },
          ],
          RESET: { target: 'idle' },
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
      selectForeground: sendParent('SELECT_FOREGROUND'),
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
      addDaughter: sendParent(({ parent, label }) => ({
        type: 'EDIT',
        action: 'add_daughter',
        args: {
          parent: parent,
          daughter: label,
        },
      })),
      replaceWithParent: sendParent((_, { parent, daughter }) => ({
        type: 'EDIT',
        action: 'replace_with_parent',
        args: {
          daughter: daughter,
        },
      })),
      createNewCell: sendParent((_, { label }) => ({
        type: 'EDIT',
        action: 'new_track',
        args: {
          label: label,
        },
      })),
    },
  }
);

export default trackMachine;
