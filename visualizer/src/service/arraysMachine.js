/** Loads and stores image arrays. */

import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';
import { fetchLabeled, fetchRaw } from './fetch';

const createArraysMachine = ({
  projectId,
  numFrames,
  numFeatures,
  numChannels,
  height,
  width,
  eventBuses,
}) =>
  Machine(
    {
      id: 'arrays',
      invoke: [
        { id: 'eventBus', src: fromEventBus('arrays', () => eventBuses.arrays) },
        { id: 'image', src: fromEventBus('arrays', () => eventBuses.image) },
      ],
      context: {
        projectId,
        numFrames,
        numFeatures,
        numChannels,
        height,
        width,
        rawArrays: null,
        labeledArrays: null,
        frame: 0,
        feature: 0,
      },
      initial: 'loading',
      states: {
        loading: {
          type: 'parallel',
          states: {
            raw: {
              initial: 'loading',
              states: {
                loading: {
                  invoke: {
                    src: fetchRaw,
                    onDone: { target: 'done', actions: 'setRawArrays' },
                  },
                },
                done: { type: 'final' },
              },
            },
            labeled: {
              initial: 'loading',
              states: {
                loading: {
                  invoke: {
                    src: fetchLabeled,
                    onDone: { target: 'done', actions: 'setLabeledArrays' },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: 'loaded',
        },
        loaded: {
          entry: 'sendLabeledArray',
          on: {
            SET_FRAME: { actions: ['setFrame', 'sendLabeledArray'] },
            SET_FEATURE: { actions: ['setFeature', 'sendLabeledArray'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setDimensions: assign((context, event) => ({
          numFrames: event.numFrames,
          numFeatures: event.numFeatures,
          numChannels: event.numChannels,
          height: event.height,
          width: event.width,
        })),
        setRawArrays: assign({ rawArrays: (ctx, evt) => evt.data }),
        setLabeledArrays: assign({ labeledArrays: (ctx, evt) => evt.data }),
        setFrame: assign({ frame: (ctx, evt) => evt.frame }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        sendLabeledArray: send(
          (ctx, evt) => ({
            type: 'LABELED_ARRAY',
            labeledArray: ctx.labeledArrays[ctx.feature][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createArraysMachine;
