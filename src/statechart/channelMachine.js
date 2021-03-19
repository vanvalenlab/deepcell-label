import { Machine, assign, send, sendParent } from 'xstate';

// only receive and send context updates for these fields
const filterContext = ({ brightness, contrast, invert, grayscale, frame, channel, rawImage }) =>
  pickBy({ brightness, contrast, invert, grayscale, frame, channel, rawImage },
    (v) => v !== undefined);

const createChannelMachine = ({ projectId, channel, frame }) => Machine(
  {
    id: 'raw',
    context: {
      projectId,
      channel,
      frame,
      brightness: 0,
      contrast: 0,
      invert: true,
      grayscale: true,
      frameActor: null,
      frames: {},
      rawImage: null,
    },
    entry: assign((context) => {
      const frameActor = spawn(createRawFrameMachine(context));
      return {
        frames: { [context.frame]: frameActor },
        frameActor: frameActor,
      }
    }),
    states: {
      idle: {
        on: {
          SETFRAME: { cond: 'newFrame', actions: 'changeFrame', target: 'awaitUpdate' },
          TOGGLEINVERT: { actions: 'toggleInvert', target: 'updated' },
          TOGGLEGRAYSCALE: { actions: 'toggleGrayscale', target: 'updated' },
          SETBRIGHTNESS: { actions: 'setBrightness', target: 'updated' },
          SETCONTRAST: { actions: 'setContrast', target: 'updated' },
          BUBBLEUP: { actions: 'update', target: 'updated' },
          BUBBLEDOWN: [
            { cond: 'updateFrame', actions: ['update', 'updateActor'], target: 'awaitUpdate' },
            { actions: 'update' },
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
    guards: {
      updateFrame: (context, event) => context.frame !== event.context.frame,
      newFrame: (context, event) => context.frame !== event.frame,
    },
    actions: {
      update: assign((ctx, event) => filterContext(event.context)),
      getBubbleUp: send('GETBUBBLEUP', {to: (context) => context.frameActor }),
      bubbleUp: sendParent((context) => ({ type: 'BUBBLEUP', context: filterContext(context)})),
      updateActor: assign({
        frameActor: (context, event) => context.frames[event.context.frame],
      }),
      changeFrame: assign((context, event) => {
        // Use the existing frame actor if one already exists
        let frameActor = context.frames[event.frame];
        if (frameActor) {
          return {
            ...context,
            frameActor,
            frame: event.frame,
          };
        }

        // Otherwise, spawn a new frame actor and save it in the frames object
        frameActor = spawn(createRawFrameMachine({ ...context, frame: event.frame }));
        return {
          frames: {
            ...context.frames,
            [event.frame]: frameActor
          },
          frameActor,
          frame: event.frame,
        };
      }),
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default createChannelMachine;
