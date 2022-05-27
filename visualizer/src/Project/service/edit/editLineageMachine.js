import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../eventBus';

const createEditLineageMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'editLineage',
      invoke: [
        { id: 'selectedCells', src: fromEventBus('editLineage', () => eventBuses.select) },
        { src: fromEventBus('editLineage', () => eventBuses.labeled) },
        { src: fromEventBus('editLineage', () => eventBuses.hovering) },
        // { id: 'api', src: fromEventBus('editLineage', () => eventBuses.api) },
      ],
      context: {
        selected: null,
        hovering: null,
        parent: null,
      },
      on: {
        SELECTED: {
          cond: (_, { selected }) => selected !== 0,
          actions: 'setSelected',
        },
        HOVERING: { actions: 'setHovering' },
        REMOVE: { actions: 'remove' },
        REPLACE_WITH_PARENT: { actions: 'replaceWithParent' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: { actions: 'select' },
            ADD_DAUGHTER: { target: 'addingDaughter', actions: 'setParent' },
            CREATE_NEW_CELL: { actions: 'createNewCell' },
          },
        },
        addingDaughter: {
          on: {
            mouseup: [
              { cond: 'onNoCell' },
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
        onNoCell: (ctx) => ctx.hovering.length === 0,
      },
      actions: {
        select: send('SELECT', { to: 'selectedCells' }),
        setSelected: assign({ selected: (_, { selected }) => selected }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setParent: assign({ parent: (_, { parent }) => parent }),
        remove: send(
          (_, { daughter }) => ({
            type: 'EDIT',
            action: 'remove_daughter',
            args: {
              daughter,
            },
          })
          // { to: 'api' }
        ),
        addDaughter: send(
          ({ parent, hovering }) => ({
            type: 'EDIT',
            action: 'add_daughter',
            args: {
              parent: parent,
              daughter: hovering[0], // TODO: select daughter before adding
            },
          })
          // { to: 'api' }
        ),
        replaceWithParent: send(
          (_, { parent, daughter }) => ({
            type: 'EDIT',
            action: 'replace_with_parent',
            args: {
              daughter: daughter,
            },
          })
          // { to: 'api' }
        ),
        createNewCell: send(
          (_, { label }) => ({
            type: 'EDIT',
            action: 'new_track',
            args: {
              label: label,
            },
          })
          // { to: 'api' }
        ),
      },
    }
  );

export default createEditLineageMachine;
