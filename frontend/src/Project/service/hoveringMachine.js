/** Manages what cell(s) are under the cursor.
 *
 * Gets the labeled array from LABELED events, then reads the value under coordinates from COORDINATES and looks up what cells from CELLS are represented by that value
 * Broadcasts HOVERING events to the hovering event bus when the list of hovering cells changes.
 */

import equal from 'fast-deep-equal';
import { actions, assign, Machine, send } from 'xstate';
import Cells from '../cells';
import { fromEventBus } from './eventBus';
const { pure } = actions;

const createHoveringMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'hovering',
      context: {
        x: 0,
        y: 0,
        t: 0,
        c: 0,
        labeled: null,
        cells: null,
        hovering: [],
      },
      invoke: [
        { id: 'eventBus', src: fromEventBus('hovering', () => eventBuses.hovering) }, // broadcast HOVERING
        { id: 'canvas', src: fromEventBus('hovering', () => eventBuses.canvas, 'COORDINATES') },
        { src: fromEventBus('hovering', () => eventBuses.arrays, 'LABELED') },
        { src: fromEventBus('hovering', () => eventBuses.image, 'SET_T') },
        { src: fromEventBus('hovering', () => eventBuses.labeled, 'SET_FEATURE') },
        { src: fromEventBus('hovering', () => eventBuses.cells, 'CELLS') },
      ],
      on: {
        COORDINATES: { actions: ['setCoordinates', 'updateHovering'] },
        LABELED: { actions: ['setLabeled', 'updateHovering'] },
        SET_T: { actions: ['setT', 'updateHovering'] },
        SET_FEATURE: { actions: ['setC', 'updateHovering'] },
        CELLS: { actions: ['setCells', 'updateHovering'] },
      },
    },
    {
      actions: {
        setLabeled: assign({ labeled: (_, evt) => evt.labeled }),
        setCells: assign({ cells: (_, evt) => new Cells(evt.cells) }),
        setT: assign({ t: (_, evt) => evt.t }),
        setC: assign({ c: (_, evt) => evt.feature }),
        setCoordinates: assign({ x: (_, evt) => evt.x, y: (_, evt) => evt.y }),
        updateHovering: pure((ctx) => {
          const { cells, t, c, labeled, x, y } = ctx;
          if (cells && labeled && x !== null && y !== null) {
            const value = labeled[y][x];
            const hovering = cells.getCellsForValue(value, t, c);
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
