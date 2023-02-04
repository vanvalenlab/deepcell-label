/** Manages raw and labeled image arrays.
 * Broadcasts the current frame in RAW and LABELED events when the frame, feature, channel, or array changes.
 * Invokes segmentApiMachine to edit the labeled array.
 */

import { assign, forwardTo, Machine, send } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { fromEventBus } from '../eventBus';
import createSegmentApiMachine from './segmentApiMachine';

const createArraysMachine = (context) =>
  Machine(
    {
      id: 'arrays',
      entry: send('REGISTER_LABELS', { to: context.undoRef }),
      invoke: [
        { id: 'eventBus', src: fromEventBus('arrays', () => context.eventBuses.arrays) },
        { id: 'api', src: createSegmentApiMachine(context) },
        { src: fromEventBus('arrays', () => context.eventBuses.image, 'SET_T') },
        { src: fromEventBus('arrays', () => context.eventBuses.raw, 'SET_CHANNEL') },
        { src: fromEventBus('arrays', () => context.eventBuses.labeled, 'SET_FEATURE') },
        { src: fromEventBus('arrays', () => context.eventBuses.load, 'LOADED') },
      ],
      context: {
        raw: null,
        labeled: null,
        rawOriginal: null,
        t: 0,
        feature: 0,
        channel: 0,
        // editing
        undoRef: context.undoRef,
        historyRef: null,
        edit: null,
        editedEvent: null,
      },
      initial: 'setUp',
      on: {
        SET_T: { actions: 'setT' },
        SET_FEATURE: { actions: 'setFeature' },
        SET_CHANNEL: { actions: 'setChannel' },
      },
      states: {
        setUp: {
          type: 'parallel',
          states: {
            load: {
              initial: 'loading',
              states: {
                loading: {
                  on: {
                    LOADED: { target: 'done', actions: ['setRaw', 'setLabeled', 'setRawOriginal'] },
                  },
                },
                done: { type: 'final' },
              },
            },
            getHistoryRef: {
              initial: 'waiting',
              states: {
                waiting: {
                  on: {
                    LABEL_HISTORY: { target: 'done', actions: 'setHistoryRef' },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: ['sendLabeledFrame', 'sendRawFrame'],
          },
        },
        idle: {
          // TODO: factor out raw and labeled states (and/or machines)
          on: {
            EDIT: { target: 'editing', actions: forwardTo('api') },
            SET_T: { actions: ['setT', 'sendLabeledFrame', 'sendRawFrame'] },
            SET_FEATURE: { actions: ['setFeature', 'sendLabeledFrame'] },
            SET_CHANNEL: { actions: ['setChannel', 'sendRawFrame'] },
            GET_ARRAYS: { actions: 'sendArrays' },
            EDITED_SEGMENT: {
              actions: [
                'setLabeledFrame',
                'sendLabeledFrame',
                'sendLabeledFull',
                forwardTo('eventBus'),
              ],
            },
            RESTORE: {
              actions: ['setLabeledFrame', 'sendLabeledFrame', 'sendLabeledFull', 'sendRestored'],
            },
          },
        },
        editing: {
          type: 'parallel',
          states: {
            getEdit: {
              entry: 'save',
              initial: 'idle',
              states: {
                idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
                done: { type: 'final' },
              },
            },
            getEdits: {
              initial: 'editing',
              states: {
                editing: {
                  on: {
                    EDITED_SEGMENT: { target: 'done', actions: 'setEdited' },
                    API_ERROR: { target: '#arrays.idle', actions: 'revertSave' },
                  },
                },
                done: { type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: ['sendSnapshot', 'sendEdited'],
          },
        },
      },
    },
    {
      guards: {},
      actions: {
        setRaw: assign({ raw: (ctx, evt) => evt.raw }),
        setLabeled: assign({ labeled: (ctx, evt) => evt.labeled }),
        setRawOriginal: assign({ rawOriginal: (ctx, evt) => evt.rawOriginal }),
        setT: assign({ t: (ctx, evt) => evt.t }),
        setFeature: assign({ feature: (ctx, evt) => evt.feature }),
        setChannel: assign({ channel: (ctx, evt) => evt.channel }),
        setLabeledFrame: assign({
          labeled: (ctx, evt) => {
            const { t, c, labeled } = evt;
            // TODO: update immutably
            ctx.labeled[c][t] = labeled;
            return ctx.labeled;
          },
        }),
        sendLabeledFrame: send(
          (ctx, evt) => ({
            type: 'LABELED',
            labeled: ctx.labeled[ctx.feature][ctx.t],
          }),
          { to: 'eventBus' }
        ),
        sendLabeledFull: send(
          (ctx) => ({
            type: 'LABELED_FULL',
            labeled: ctx.labeled,
          }),
          { to: 'eventBus' }
        ),
        sendRawFrame: send(
          (ctx, evt) => ({
            type: 'RAW',
            raw: ctx.raw[ctx.channel][ctx.t],
          }),
          { to: 'eventBus' }
        ),
        sendArrays: respond((ctx) => ({
          type: 'ARRAYS',
          raw: ctx.rawOriginal, // Send the original raw for export
          labeled: ctx.labeled,
        })),
        save: send('SAVE', { to: (ctx) => ctx.undoRef }),
        revertSave: send((ctx) => ({ type: 'REVERT_SAVE', edit: ctx.edit }), {
          to: (ctx) => ctx.undoRef,
        }),
        setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
        setEdit: assign({ edit: (_, evt) => evt.edit }),
        setEdited: assign({ edited: (_, evt) => evt }),
        sendEdited: send((ctx) => ({ ...ctx.edited, edit: ctx.edit })),
        sendRestored: send((ctx, evt) => ({ type: 'RESTORED_SEGMENT', ...evt }), {
          to: 'eventBus',
        }),
        sendSnapshot: send(
          (ctx) => {
            const { labeled, t, c } = ctx.edited;
            const beforeRestore = {
              type: 'RESTORE',
              labeled: ctx.labeled[c][t],
              t,
              c,
            };
            const afterRestore = { type: 'RESTORE', labeled, t, c };
            return {
              type: 'SNAPSHOT',
              before: beforeRestore,
              after: afterRestore,
              edit: ctx.edit,
            };
          },
          { to: (ctx) => ctx.historyRef }
        ),
      },
    }
  );

export default createArraysMachine;
