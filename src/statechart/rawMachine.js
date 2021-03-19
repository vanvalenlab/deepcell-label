import { Machine, assign, send, sendParent, forwardTo } from 'xstate';

// only receive and send context updates for these fields
const filterContext = ({ brightness, contrast, invert, grayscale, channel, frame, rawImage }) =>
  pickBy({ brightness, contrast, invert, grayscale, channel, frame, rawImage },
    (v) => v !== undefined);

const createRawMachine = (projectId) => Machine(
  {
    id: 'raw',
    context: {
      projectId,
      channel: 0,
      frame: 0,
      brightness: 0,
      contrast: 0,
      invert: true,
      grayscale: true,
      channelActor: null,
      channels: {},
      rawImage: null,
    },
    entry: assign((context) => {
      const channelActor = spawn(createChannelMachine(context.channel, context.frame), `channel${context.channel}`);
      return {
        channels: {
          [context.channel]: channelActor,
        },
        channelActor: channelActor,
      }
    }),
    on: {
      SETCHANNEL: { actions: ['changeChannel', 'getUpdate'] },
      TOGGLEINVERT: { actions: 'forwardToChannel' },
      TOGGLEGRAYSCALE: { actions: 'forwardToChannel' },
      SETFRAME: { actions: 'forwardToChannel' },
      SETBRIGHTNESS: { actions: 'forwardToChannel' },
      SETCONTRAST: { actions: 'forwardToChannel' },
      UPDATE: { actions: ['update', 'sendUpdate'] },
    },
    states: {
      idle: {
        on: {
          SETCHANNEL: { actions: 'changeChannel', target: 'awaitBubbleUp' },
          SETFRAME: { actions: 'bubbleDown' },
          TOGGLEINVERT: { actions: 'bubbleDown' },
          TOGGLEGRAYSCALE: { actions: 'bubbleDown' },
          SETBRIGHTNESS: { actions: 'bubbleDown' },
          SETCONTRAST: { actions: 'bubbleDown' },
          BUBBLEUP: { actions: 'update', target: 'updated' },
          BUBBLEDOWN: [
            { cond: 'updateChannel', actions: ['update', 'updateActor', 'bubbleDown'], target: 'awaitBubbleUp' },
            { actions: ['update', 'bubbleDown'] },
          ],
        }
      },
      // when we change the actor, we need to bubble up an update from the actor
      awaitBubbleUp: {
        entry: 'getBubbleUp',
        on: {
          BUBBLEUP: { actions: 'update', target: 'updated' },
        }
      },
      // when we change the context, inform the actors above
      updated: {
        entry: 'bubbleUp',
        always: 'idle',
      },
    }
  },
  {
    actions: {
      update: assign((ctx, event) => filterContext(event.context)),
      getBubbleUp: send('GETBUBBLEUP', {to: (context) => context.channelActor}),
      bubbleUp: sendParent((context) => ({
        type: 'BUBBLEUP',
        context: filterContext(context),
      })),
      updateActor: assign({
        channelActor: (context, event) => context.channels[event.context.channel],
      }),
      bubbleDown: forwardTo((context) => context.channelActor),
      changeChannel: assign((context, event) => {
        // Use the existing channel actor if one already exists
        let channelActor = context.channels[event.channel];
        if (channelActor) {
          channelActor.send({ type: 'SETFRAME', frame: context.frame });
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
