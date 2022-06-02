import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../eventBus';

const createEditDivisionsMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'editDivisions',
      invoke: [
        { id: 'select', src: fromEventBus('editDivisions', () => eventBuses.select, 'SELECTED') },
        { src: fromEventBus('editDivisions', () => eventBuses.hovering, 'HOVERING') },
        { src: fromEventBus('editDivisions', () => eventBuses.image, 'SET_T') },
        { id: 'divisions', src: fromEventBus('editDivisions', () => eventBuses.divisions) },
      ],
      context: {
        selected: null,
        hovering: null,
        daughter: null,
        t: null,
      },
      on: {
        SELECTED: { actions: 'setSelected' },
        HOVERING: { actions: 'setHovering' },
        REMOVE_DAUGHTER: { actions: 'remove' },
        SET_T: { actions: 'setT' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            mouseup: { actions: 'select' },
            ADD_DAUGHTER: 'addingDaughter',
          },
        },
        addingDaughter: {
          entry: 'resetDaughter',
          on: {
            mouseup: [
              { cond: 'onNoCell' },
              { cond: 'shift', actions: 'setDaughter' },
              { cond: 'onDaughter', actions: 'addDaughter' },
              { actions: 'setDaughter' },
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
        shift: (_, evt) => evt.shiftKey,
        onDaughter: (ctx) => ctx.hovering.includes(ctx.daughter),
      },
      actions: {
        setT: assign({ t: (ctx, evt) => evt.t }),
        select: send('SELECT', { to: 'select' }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setHovering: assign({ hovering: (_, evt) => evt.hovering }),
        remove: send(
          (_, evt) => ({
            type: 'REMOVE_DAUGHTER',
            daughter: evt.daughter,
          }),
          { to: 'divisions' }
        ),
        resetDaughter: assign({ daughter: null }),
        setDaughter: assign({
          daughter: (ctx) => {
            const { hovering, daughter } = ctx;
            const i = hovering.indexOf(daughter);
            return i === -1 || i === hovering.length - 1 ? hovering[0] : hovering[i + 1];
          },
        }),
        addDaughter: send(
          (ctx) => ({
            type: 'ADD_DAUGHTER',
            parent: ctx.selected,
            daughter: ctx.daughter,
            t: ctx.t,
          }),
          { to: 'divisions' }
        ),
      },
    }
  );

export default createEditDivisionsMachine;
