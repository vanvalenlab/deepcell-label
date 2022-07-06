/** Manages using the select tool. */
import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const createSelectMachine = (context) =>
  Machine(
    {
      invoke: {
        id: 'select',
        src: fromEventBus('select', () => context.eventBuses.select, 'SELECTED'),
      },
      on: {
        mouseup: { actions: 'select' },
      },
    },
    {
      actions: {
        select: send('SELECT', { to: 'select' }),
      },
    }
  );

export default createSelectMachine;
