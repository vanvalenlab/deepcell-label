/** Manages lineage labels. */

import { assign, Machine } from 'xstate';
import { fromEventBus } from './eventBus';

function previousCell(cell, lineage) {
  const all = Object.keys(lineage).map(Number);
  const smaller = all.filter((c) => c < cell);
  const previous = Math.max(...smaller);
  if (previous === -Infinity) {
    return Math.max(...all);
  }
  return previous;
}

function nextCell(cell, lineage) {
  const all = Object.keys(lineage).map(Number);
  const larger = all.filter((c) => c > cell);
  const next = Math.min(...larger);
  if (next === Infinity) {
    return Math.min(...all);
  }
  return next;
}

function createLineageMachine({ eventBuses }) {
  return Machine(
    {
      context: { lineage: null, selected: 0, hovering: 0 },
      invoke: [
        { src: fromEventBus('lineage', () => eventBuses.load) },
        { src: fromEventBus('lineage', () => eventBuses.canvas) },
      ],
      id: 'lineage',
      on: {
        HOVERING: { actions: 'setHovering' },
      },
      initial: 'loading',
      states: {
        loading: {
          on: {
            LOADED: { actions: 'setLineage', target: 'loaded' },
          },
        },
        loaded: {
          on: {
            mouseup: { actions: 'selectCell' },
            SET_CELL: { actions: 'setCell' },
            RESET_CELL: { actions: 'resetCell' },
            NEXT_CELL: { actions: 'selectNextCell' },
            PREV_CELL: { actions: 'selectPreviousCell' },
          },
        },
      },
    },
    {
      actions: {
        setHovering: assign({ hovering: (ctx, evt) => evt.hovering }),
        selectCell: assign({
          selected: (ctx, evt) => (ctx.selected === ctx.hovering ? 0 : ctx.hovering),
        }),
        setLineage: assign({ lineage: (ctx, evt) => evt.lineage }),
        setCell: assign({ selected: (ctx, evt) => evt.cell }),
        resetCell: assign({ selected: 0 }),
        selectNextCell: assign({ selected: (ctx) => nextCell(ctx.selected, ctx.lineage) }),
        selectPreviousCell: assign({ selected: (ctx) => previousCell(ctx.selected, ctx.lineage) }),
      },
    }
  );
}

export default createLineageMachine;
