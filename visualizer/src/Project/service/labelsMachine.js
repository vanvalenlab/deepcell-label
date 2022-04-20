/** Loads and stores image arrays. */

import colormap from 'colormap';
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const createLabelsMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'arrays',
      invoke: [
        { id: 'eventBus', src: fromEventBus('labels', () => eventBuses.labels) },
        { src: fromEventBus('labels', () => eventBuses.labeled) },
        { src: fromEventBus('labeled', () => eventBuses.load) },
      ],
      context: {
        projectId,
        labels: {},
        feature: 0,
        colormap: [
          [0, 0, 0, 1],
          ...colormap({ colormap: 'viridis', format: 'rgba' }),
          [255, 255, 255, 1],
        ],
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            LOADED: {
              target: 'loaded',
              actions: ['setLabels', 'setColormap'],
            },
          },
        },
        loaded: {
          entry: 'sendLabels',
          on: {
            SET_FEATURE: { actions: ['setFeature', 'sendLabels', 'setColormap'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setLabels: assign({ labels: (ctx, evt) => evt.labels }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        sendLabels: send(
          (ctx, evt) => ({
            type: 'LABELS',
            labels: ctx.labels[ctx.feature],
          }),
          { to: 'eventBus' }
        ),
        setColormap: assign({
          colormap: (ctx, evt) => [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, Math.max(...Object.keys(ctx.labels[ctx.feature]))),
              format: 'rgba',
            }),
            [255, 255, 255, 1],
          ],
        }),
      },
    }
  );

export default createLabelsMachine;
