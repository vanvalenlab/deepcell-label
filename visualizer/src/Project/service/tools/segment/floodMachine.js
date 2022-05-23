import { assign, Machine, send } from 'xstate';
import { fromEventBus } from '../../eventBus';

const creatFloodMachine = (context) =>
  Machine(
    {
      invoke: [
        { id: 'select', src: fromEventBus('flood', () => context.eventBuses.select) },
        { id: 'api', src: fromEventBus('flood', () => context.eventBuses.api) },
        { src: fromEventBus('flood', () => context.eventBuses.overlaps) },
        { src: fromEventBus('flood', () => context.eventBuses.image) },
      ],
      context: {
        x: null,
        y: null,
        floodingLabel: context.selected,
        floodedLabel: 0,
        hovering: null,
        overlaps: null,
      },
      on: {
        COORDINATES: { actions: 'setCoordinates' },
        SELECTED: { actions: 'setFloodingLabel' },
        HOVERING: { actions: 'setHovering' },
        OVERLAP_MATRIX: { actions: 'setOverlapMatrix' },
        mouseup: [
          { cond: 'shift', actions: 'setFloodedLabel' },
          { cond: 'onFloodedLabel', actions: 'flood' },
          { actions: 'setFloodedLabel' },
        ],
      },
    },
    {
      guards: {
        shift: (_, event) => event.shiftKey,
        onFloodedLabel: ({ floodedLabel, hovering, overlapMatrix }) =>
          overlapMatrix[hovering][floodedLabel] === 1,
      },
      actions: {
        setFloodingLabel: assign({ floodingLabel: (_, { selected }) => selected }),
        setFloodedLabel: assign({
          floodedLabel: ({ hovering, overlapMatrix, floodedLabel }) => {
            const labels = overlapMatrix[hovering];
            if (labels[floodedLabel]) {
              // Get next label that hovering value encodes
              const reordered = labels
                .slice(floodedLabel + 1)
                .concat(labels.slice(0, floodedLabel + 1));
              const nextLabel =
                (reordered.findIndex((i) => !!i) + floodedLabel + 1) % labels.length;
              return nextLabel;
            }
            const firstLabel = labels.findIndex((i) => i === 1);
            return firstLabel === -1 ? 0 : firstLabel;
          },
        }),
        setCoordinates: assign({ x: (_, { x }) => x, y: (_, { y }) => y }),
        setHovering: assign({ hovering: (_, { hovering }) => hovering }),
        setOverlapMatrix: assign({ overlapMatrix: (_, { overlapMatrix }) => overlapMatrix }),
        flood: send(
          ({ floodingLabel, floodedLabel, x, y }, event) => ({
            type: 'EDIT',
            action: 'flood',
            args: {
              foreground: floodingLabel,
              background: floodedLabel,
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
