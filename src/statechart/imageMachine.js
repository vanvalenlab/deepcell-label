import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createRawMachine from './rawMachine';
import createLabeledMachine from './labeledMachine';

const { pure } = actions;

const createImageMachine = ({ projectId }) => Machine(
  {
    id: 'image',
    context: {
      projectId,
      frame: 0,
      feature: 0,
      channel: 0,
      nextFrame: 0,
      nextFeature: 0,
      nextChannel: 0,
      numFrames: 1,
      numFeatures: 1,
      numChannels: 1,
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: {
            target: 'idle', actions: 'handleProject',
          },
        },
      },
      idle: {},
    },
    entry: ['spawnActors', 'sendActorRefs'],
    on: {
      LOADED: { actions: 'forwardToLabeled' },
      SETFRAME: { cond: 'newNextFrame', actions: ['saveFrame', 'forwardToRaw', 'forwardToLabeled'] },
      SETCHANNEL: { cond: 'newNextChannel', actions: ['saveChannel', 'forwardToRaw'] },
      SETFEATURE: { cond: 'newNextFeature', actions: ['saveFeature', 'forwardToLabeled'] },
      FRAME: { actions: ['useFrame', 'forwardToTool'] },
      CHANNEL: { actions: ['useChannel', 'forwardToTool'] },
      FEATURE: { actions: ['useFeature', 'forwardToTool'] },
      TOOLREF: { actions: [assign({ toolRef: (context, event) => event.toolRef }), forwardTo('labeled')] },
    },
  },
  {
    guards: {
      newNextFrame: (context, event) => context.nextFrame !== event.frame,
      newNextChannel: (context, event) => context.nextChannel !== event.channel,
      newNextFeature: (context, event) => context.nextFeature !== event.feature,
    },
    actions: {
      spawnActors: assign({
        rawRef: (context) => spawn(createRawMachine(context), 'raw'),
        labeledRef: (context) => spawn(createLabeledMachine(context), 'labeled'),
      }),
      sendActorRefs: pure((context) => {
        const sendRawToLabeled = send(
          { type: 'RAWREF', rawRef: context.rawRef },
          { to: context.labeledRef }
        );
        const sendLabeledToRaw = send(
          { type: 'LABELEDREF', labeledRef: context.labeledRef },
          { to: context.rawRef }
        );
        return [sendRawToLabeled, sendLabeledToRaw];
      }),
      handleProject: assign(
        (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
          return { frame, feature, channel, numFrames, numFeatures, numChannels };
        }
      ),
      saveFrame: assign({ nextFrame: (context, event) => event.frame }),
      saveChannel: assign({ nextChannel: (context, event) => event.channel }),
      saveFeature: assign({ nextFeature: (context, event) => event.feature }),
      useFrame: assign({ frame: (context, event) => event.frame }),
      useChannel: assign({ channel: (context, event) => event.channel }),
      useFeature: assign({ feature: (context, event) => event.feature }),
      forwardToRaw: forwardTo((context) => context.rawRef),
      forwardToLabeled: forwardTo((context) => context.labeledRef),
      forwardToTool: forwardTo((context) => context.toolRef),

    }
  });

export default createImageMachine;
