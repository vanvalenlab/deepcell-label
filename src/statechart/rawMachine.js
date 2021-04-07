import { Machine, assign, forwardTo, spawn, actions, sendParent, send } from 'xstate';
import createChannelMachine from './channelMachine';

const { pure } = actions;

const createRawMachine = ({ projectId }) => Machine(
  {
    id: 'raw',
    context: {
      projectId,
      frame: 0,
      nextFrame: 0,
      channel: 0,
      nextChannel: 0,
      channelActor: null,
      nextChannelActor: null,
      channels: {},
      labeledRef: null,
    },
    entry: assign((context) => {
      const channelActor = spawn(createChannelMachine(context));
      return {
        channels: {
          [context.channel]: channelActor,
        },
        channelActor: channelActor,
      }
    }),
    on: {
      TOGGLEINVERT: { actions: 'forwardToChannel' },
      TOGGLEGRAYSCALE: { actions: 'forwardToChannel' },
      SETBRIGHTNESS: { actions: 'forwardToChannel' },
      SETCONTRAST: { actions: 'forwardToChannel' },
      RESTORE: {},
      LABELEDREF: { actions: assign({ labeledRef: (context, event) => event.labeledRef }) },
    },
    type: 'parallel',
    states: {
       frame: {
        initial: 'loading',
        states: {
          idle: {},
          loading: {
            entry: send(
              (context) => ({ type: 'SETFRAME', frame: context.nextFrame }),
              { to: (context) => context.channelActor }
            ),
            on: {
              CHANNEL: { target: 'loading', internal: false },
              RAWLOADED: { target: 'loaded', cond: 'nextFrame', actions: 'forwardToLabeled' },
            },
          },
          loaded: {
            on: {
              LABELEDLOADED: { actions: 'sendFrame' },
              FRAME: { actions: 'useFrame', target: 'idle' },
              CHANNEL: { target: 'loading', internal: false },
            },
          },
        },
        on: {
          SETFRAME: { target: '.loading', actions: 'assignNextFrame', internal: false },
        }
      },
      channel: {
        initial: 'idle',
        states: {
          idle: {},
          loading: {
            entry: send(
              (context) => ({ type: 'SETFRAME', frame: context.frame }),
              { to: (context) => context.nextChannelActor }
            ),
            on: {
              RAWLOADED: { cond: 'nextChannel', actions: 'sendChannel' },
              CHANNEL: { target: 'idle', actions: 'useChannel' },
              FRAME: { target: 'loading', internal: false }
            }
          },
        },
        on: {
          SETCHANNEL: { target: '.loading', actions: 'stageNextChannel', internal: false },
        }
      }
    },
  },
  {
    guards: {
      nextFrame: (context, event) => context.nextFrame === event.frame && context.channel === event.channel,
      nextChannel: (context, event) => context.frame === event.frame && context.nextChannel === event.channel,
    },
    actions: {
      assignNextFrame: assign({ nextFrame: (context, event) => event.frame }),
      sendChannel: pure((context, event) => {
        const channelEvent = { type: 'CHANNEL', channel: event.channel, frame: event.frame };
        return [
          send(channelEvent), 
          sendParent(channelEvent),
        ];
      }),
      useChannel: pure((context, event) => {
        return [
          forwardTo((context) => context.nextChannelActor),
          assign({
            channel: (context) => context.nextChannel,
            channelActor: (context, event) => context.nextChannelActor,
          }),
        ];
      }),
      sendFrame: pure((context, event) => {
        const frameEvent = { type: 'FRAME', frame: event.frame };
        return [
          send(frameEvent),
          send(frameEvent, { to: context.labeledRef }),
          sendParent(frameEvent),
        ];
      }),
      useFrame: pure((context, event) => {
        return [
          forwardTo(context.channelActor),
          assign({ frame: (context, event) => event.frame }),
        ];
      }),
      forwardToLabeled: forwardTo((context) => context.labeledRef),
      forwardToChannel: forwardTo((context) => context.channelActor),
      stageNextChannel: assign((context, event) => {
        // Use the existing channel actor if one already exists
        let channelActor = context.channels[event.channel];
        if (channelActor) {
          return {
            ...context,
            nextChannelActor: channelActor,
            nextChannel: event.channel,
          };
        }
        // Otherwise, spawn a new channel actor and save it in the channels object
        channelActor = spawn(createChannelMachine({ ...context, channel: event.channel }));
        return {
          channels: {
            ...context.channels,
            [event.channel]: channelActor
          },
          nextChannel: event.channel,
          nextChannelActor: channelActor,
        };
      }),
    }
  }
);

export default createRawMachine;
