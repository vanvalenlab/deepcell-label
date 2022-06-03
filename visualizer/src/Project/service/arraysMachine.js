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
        { src: fromEventBus('arrays', () => eventBuses.load) },
      ],
      context: {
        raw: null,
        labeled: null,
        frame: 0,
        feature: 0,
        channel: 0,
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            LOADED: { target: 'idle', actions: ['setRaw', 'setLabeled'] },
            SET_FRAME: { actions: 'setFrame' },
            SET_FEATURE: { actions: 'setFeature' },
            SET_CHANNEL: { actions: 'setChannel' },
          },
        },
        idle: {
          entry: ['sendLabeled', 'sendRaw'],
          on: {
            SET_FRAME: { actions: ['setFrame', 'sendLabeled', 'sendRaw'] },
            SET_FEATURE: { actions: ['setFeature', 'sendLabeled'] },
            SET_CHANNEL: { actions: ['setChannel', 'sendRaw'] },
            EDITED: { actions: ['setLabeledFrame', 'sendLabeled'] },
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setRaw: assign({ raw: (ctx, evt) => evt.raw }),
        setLabeled: assign({ labeled: (ctx, evt) => evt.labeled }),
        setFrame: assign({ frame: (ctx, evt) => evt.frame }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        setChannel: assign({ channel: (ctx, evt) => evt.channel }),
        setLabeledFrame: assign({
          labeled: (ctx, evt) => {
            const { frame, feature, labeled } = evt;
            // TODO: update immutably
            ctx.labeled[feature][frame] = labeled;
            return ctx.labeled;
          },
        }),
        sendLabeled: send(
          (ctx, evt) => ({
            type: 'LABELED',
            labeled: ctx.labeled[ctx.feature][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
        sendRaw: send(
          (ctx, evt) => ({
            type: 'RAW',
            raw: ctx.raw[ctx.channel][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createArraysMachine;
