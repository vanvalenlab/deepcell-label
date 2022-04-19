import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const createTrimMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('trim', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('trim', () => context.eventBuses.api) },
      ],
      context: {
        x: null,
        y: null,
        hovering: null,
        foreground: context.foreground,
        background: context.background,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        HOVERING: { actions: 'setHovering' },
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
        mouseup: [{ cond: 'onNoLabel' }, { actions: ['selectForeground', 'trim'] }],
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        selectForeground: send('SELECT_FOREGROUND', { to: 'select' }),
        trim: send(
          ({ hovering, x, y }, event) => ({
            type: 'EDIT',
            action: 'trim_pixels',
            args: {
              label: hovering,
              x,
              y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default createTrimMachine;
