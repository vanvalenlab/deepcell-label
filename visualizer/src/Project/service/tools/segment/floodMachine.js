import { Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';
import { toolActions, toolGuards } from './toolUtils';

const creatFloodMachine = (context) =>
  Machine(
    {
      invoke: [
        { src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('flood', () => context.eventBuses.api) },
      ],
      context: {
        x: null,
        y: null,
        foreground: context.foreground,
        background: context.background,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        FOREGROUND: { actions: 'setForeground' },
        BACKGROUND: { actions: 'setBackground' },
        mouseup: { actions: 'flood' },
      },
    },
    {
      guards: toolGuards,
      actions: {
        ...toolActions,
        flood: send(
          ({ foreground, x, y }, event) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              label: foreground,
              x,
              y,
            },
          }),
          { to: 'api' }
        ),
      },
    }
  );

export default creatFloodMachine;
