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
        { src: fromEventBus('arrays', () => eventBuses.api) },
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
        channel: 0,
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
          entry: ['sendLabeledArray', 'sendRawArray'],
          on: {
            SET_FRAME: { actions: ['setFrame', 'sendLabeledArray', 'sendRawArray'] },
            SET_FEATURE: { actions: ['setFeature', 'sendLabeledArray'] },
            SET_CHANNEL: { actions: ['setChannel', 'sendRawArray'] },
            EDITED: { actions: ['updateLabeledArray', 'sendLabeledArray'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setRawArrays: assign({ rawArrays: (ctx, evt) => evt.data }),
        setLabeledArrays: assign({ labeledArrays: (ctx, evt) => evt.data }),
        setFrame: assign({ frame: (ctx, evt) => evt.frame }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        updateLabeledArray: assign({
          labeledArrays: (ctx, evt) => {
            const { frame, feature, labeledArray } = evt;
            const { labeledArrays } = ctx;
            labeledArrays[feature][frame] = labeledArray;
            return labeledArrays;
          },
        }),
        sendLabeledArray: send(
          (ctx, evt) => ({
            type: 'LABELED_ARRAY',
            labeledArray: ctx.labeledArrays[ctx.feature][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
        sendRawArray: send(
          (ctx, evt) => ({
            type: 'RAW_ARRAY',
            labeledArray: ctx.rawArrays[ctx.channel][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createArraysMachine;
