/** Loads and stores image arrays. */

import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const createArraysMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'arrays',
      invoke: [
        { id: 'eventBus', src: fromEventBus('arrays', () => eventBuses.arrays) },
        { id: 'image', src: fromEventBus('arrays', () => eventBuses.image) },
        { src: fromEventBus('arrays', () => eventBuses.api) },
        { src: fromEventBus('labeled', () => eventBuses.load) },
      ],
      context: {
        rawArrays: null,
        labeledArrays: null,
        frame: 0,
        feature: 0,
        channel: 0,
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            LOADED: { target: 'idle', actions: ['setRawArrays', 'setLabeledArrays'] },
            SET_FRAME: { actions: 'setFrame' },
            SET_FEATURE: { actions: 'setFeature' },
            SET_CHANNEL: { actions: 'setChannel' },
          },
        },
        idle: {
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
        setRawArrays: assign({ rawArrays: (ctx, evt) => evt.rawArrays }),
        setLabeledArrays: assign({ labeledArrays: (ctx, evt) => evt.labeledArrays }),
        setFrame: assign({ frame: (ctx, evt) => evt.frame }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        setChannel: assign({ channel: (ctx, evt) => evt.channel }),
        updateLabeledArray: assign({
          labeledArrays: (ctx, evt) => {
            const { frame, feature, labeled } = evt;
            const { labeledArrays } = ctx;
            labeledArrays[feature][frame] = labeled;
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
            rawArray: ctx.rawArrays[ctx.channel][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createArraysMachine;
