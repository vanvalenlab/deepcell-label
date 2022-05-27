/** Loads and stores image arrays. */

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
        { id: 'image', src: fromEventBus('arrays', () => context.eventBuses.image, 'FRAME') },
        { src: fromEventBus('arrays', () => context.eventBuses.load, 'LOADED') },
      ],
      context: {
        raw: null,
        labeled: null,
        frame: 0,
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
        SET_FRAME: { actions: 'setFrame' },
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
                    LOADED: { target: 'done', actions: ['setRaw', 'setLabeled'] },
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
            actions: ['sendLabeledFrame', 'sendRawFrame', 'sendInitialLabelsToHistory'],
          },
        },
        idle: {
          // TODO: factor out raw and labeled states (and/or machines)
          on: {
            EDIT: { target: 'editing', actions: forwardTo('api') },
            SET_FRAME: { actions: ['setFrame', 'sendLabeledFrame', 'sendRawFrame'] },
            SET_FEATURE: { actions: ['setFeature', 'sendLabeledFrame'] },
            SET_CHANNEL: { actions: ['setChannel', 'sendRawFrame'] },
            GET_ARRAYS: { actions: 'sendArrays' },
            EDITED_SEGMENT: {
              actions: ['setLabeledFrame', 'sendLabeledFrame', forwardTo('eventBus')],
            },
            RESTORE: { actions: ['setLabeledFrame', 'sendLabeledFrame'] },
          },
        },
        editing: {
          type: 'parallel',
          states: {
            getEdit: {
              entry: send('SAVE', { to: (ctx) => ctx.undoRef }),
              initial: 'idle',
              states: {
                idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
                done: { type: 'final' },
              },
            },
            getEdits: {
              initial: 'editing',
              states: {
                editing: { on: { EDITED_SEGMENT: { target: 'done', actions: 'setEdited' } } },
                done: { type: 'final' },
              },
            },
          },
          onDone: {
            target: 'idle',
            actions: ['sendSnapshot', 'sendEdited', 'sendCellsFromSegmentEdit'],
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
        sendLabeledFrame: send(
          (ctx, evt) => ({
            type: 'LABELED',
            labeled: ctx.labeled[ctx.feature][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
        sendRawFrame: send(
          (ctx, evt) => ({
            type: 'RAW',
            raw: ctx.raw[ctx.channel][ctx.frame],
          }),
          { to: 'eventBus' }
        ),
        sendArrays: respond((ctx) => ({
          type: 'ARRAYS',
          rawArrays: ctx.raw,
          labeledArrays: ctx.labeled,
        })),
        sendInitialLabelsToHistory: send(
          (ctx) => ({
            type: 'LABELS',
            labels: ctx.labeled,
          }),
          { to: (ctx) => ctx.historyRef }
        ),
        setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
        setEdit: assign({ edit: (_, evt) => evt.edit }),
        setEdited: assign({ edited: (_, evt) => evt }),
        sendEdited: send((ctx) => ctx.edited),
        sendSnapshot: send(
          (ctx) => {
            const { labeled, frame, feature } = ctx.edited;
            const beforeRestore = {
              type: 'RESTORE',
              labeled: ctx.labeled[feature][frame],
              frame,
              feature,
            };
            const afterRestore = { type: 'RESTORE', labeled, frame, feature };
            return {
              type: 'SNAPSHOT',
              before: beforeRestore,
              after: afterRestore,
              edit: ctx.edit,
            };
          },
          { to: (ctx) => ctx.historyRef }
        ),
        sendCellsFromSegmentEdit: send(
          (ctx, evt) => {
            const { edit } = ctx;
            const { cells, frame } = ctx.edited;
            return {
              type: 'CELLS_FROM_SEGMENT_EDIT',
              cells,
              frame,
              edit,
            };
          },
          // TODO: send directly to cells instead of through event bus
          { to: 'eventBus' }
        ),
      },
    }
  );

export default createArraysMachine;
