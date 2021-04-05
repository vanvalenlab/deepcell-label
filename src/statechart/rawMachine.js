import { Machine, assign, forwardTo, spawn, actions, sendParent, send } from 'xstate';
import createChannelMachine from './channelMachine';

const { pure } = actions;

const createRawMachine = ({ projectId }) => Machine(
  {
    id: 'raw',
    context: {
      projectId,
      frame: 0,
      channel: 0,
      channelActor: null,
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
      SETCHANNEL: { actions: 'changeChannel' },
      TOGGLEINVERT: { actions: 'forwardToChannel' },
      TOGGLEGRAYSCALE: { actions: 'forwardToChannel' },
      SETBRIGHTNESS: { actions: 'forwardToChannel' },
      SETCONTRAST: { actions: 'forwardToChannel' },
      RESTORE: {},
      LABELEDREF: { actions: assign({ labeledRef: (context, event) => event.labeledRef }) },
    },
    initial: 'loading',
    states: {
      idle: {
        on: {
          SETFRAME: { target: 'loading', actions: [(context, event) => console.log(event), 'forwardToAllChannels'] },
        },
      },
      loading: {
        on: {
          RAWFRAME: { target: 'loaded', cond: 'currentChannel', actions: 'forwardToLabeled' }, 
        },
      },
      loaded: {
        on: {
          LABELEDFRAME: { actions: 'sendFrame', target: 'idle' },
          FRAME: { actions: 'forwardFrame', target: 'idle' },
        },
      },
    }
  },
  {
    guards: {
      currentChannel: (context, event) => context.channel === event.channel,
    },
    actions: {
      sendFrame: pure((context, event) => {
        return [
          sendParent({ type: 'FRAME', frame: event.frame }),
          send({ type: 'FRAME', frame: event.frame }, { to: context.channelActor }),
          send({ type: 'FRAME', frame: event.frame }, { to: context.labeledRef }),
        ];
      }),
      forwardFrame: pure((context, event) => {
        return [
          sendParent(event),
          forwardTo(context.channelActor),
        ];
      }),
      forwardToParent: sendParent((context, event) => event),
      forwardToLabeled: forwardTo((context) => context.labeledRef),
      forwardToChannel: forwardTo((context) => context.channelActor),
      // Dynamically send an event to every spawned channel
      forwardToAllChannels: pure((context) => {
        const channels = Object.values(context.channels);
        return channels.map((channel) => {
          return forwardTo(channel);
        });
      }),
      changeChannel: assign((context, event) => {
        // Use the existing channel actor if one already exists
        let channelActor = context.channels[event.channel];
        if (channelActor) {
          return {
            ...context,
            channelActor,
            channel: event.channel,
          };
        }

        // Otherwise, spawn a new channel actor and save it in the channels object
        channelActor = spawn(createChannelMachine({ ...context, channel: event.channel }));
        return {
          channels: {
            ...context.channels,
            [event.channel]: channelActor
          },
          channelActor,
          channel: event.channel,
        };
      })
    }
  }
);

export default createRawMachine;
