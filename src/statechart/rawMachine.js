import { Machine, assign, forwardTo, spawn, actions } from 'xstate';
import createChannelMachine from './channelMachine';

const { pure } = actions;

const rawMachine = Machine(
  {
    id: 'raw',
    context: {
      projectId: null,
      frame: null,
      channel: null,
      channelActor: null,
      channels: {},
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
      SETFRAME: { actions: 'forwardToAllChannels' },
      TOGGLEINVERT: { actions: 'forwardToChannel' },
      TOGGLEGRAYSCALE: { actions: 'forwardToChannel' },
      SETBRIGHTNESS: { actions: 'forwardToChannel' },
      SETCONTRAST: { actions: 'forwardToChannel' },
      RESTORE: {},
    },
    initial: 'idle',
    states: {
      idle: {},
    }
  },
  {
    actions: {
      forwardToChannel: (context) => forwardTo(context.channelActor),
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

export default rawMachine;
