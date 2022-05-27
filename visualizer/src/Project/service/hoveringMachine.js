import equal from 'fast-deep-equal';
import { actions, assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';
const { pure } = actions;

const createHoveringMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'hovering',
      context: {
        x: 0,
        y: 0,
        frame: 0,
        labeled: null,
        cells: null,
        hovering: [],
      },
      invoke: [
        { id: 'eventBus', src: fromEventBus('hovering', () => eventBuses.hovering) }, // broadcast HOVERING
        { id: 'canvas', src: fromEventBus('hovering', () => eventBuses.canvas, 'COORDINATES') },
        { src: fromEventBus('hovering', () => eventBuses.arrays, 'LABELED') },
        { src: fromEventBus('hovering', () => eventBuses.image, 'FRAME') },
        { src: fromEventBus('hovering', () => eventBuses.cells, 'CELLS') },
      ],
      on: {
        COORDINATES: { actions: ['setCoordinates', 'updateHovering'] },
        LABELED: { actions: ['setLabeled', 'updateHovering'] },
        SET_FRAME: { actions: ['setFrame', 'updateHovering'] },
        CELLS: { actions: ['setCells', 'updateHovering'] },
      },
    },
    {
      actions: {
        setLabeled: assign({ labeled: (_, evt) => evt.labeled }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        setFrame: assign({ frame: (_, evt) => evt.frame }),
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        updateHovering: pure((ctx) => {
          const { cells, frame, labeled, x, y } = ctx;
          if (cells && labeled && x !== null && y !== null) {
            const value = labeled[y][x];
            const hovering = cells.getCellsForValue(value, frame);
            if (!equal(hovering, ctx.hovering)) {
              return [
                assign({ hovering }),
                send({ type: 'HOVERING', hovering }, { to: 'eventBus' }),
              ];
            }
          }
          return [];
        }),
      },
    }
  );

export default createHoveringMachine;
