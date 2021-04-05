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
      SETFRAME: { cond: 'newFrame', actions: ['forwardToRaw', 'forwardToLabeled'] },
      SETCHANNEL: { cond: 'newChannel', actions: 'forwardToRaw' },
      SETFEATURE: { cond: 'newFeature', actions: 'forwardToLabeled' },
      FRAME: { actions: ['saveFrame', 'forwardToTool'] },
      CHANNEL: { actions: ['saveChannel', 'forwardToTool'] },
      FEATURE: { actions: ['saveFeature', 'forwardToTool'] },
      TOOLREF: { actions: [assign({ toolRef: (context, event) => event.toolRef }), forwardTo('labeled')] },
    },
  },
  {
    guards: {
      newFrame: (context, event) => context.frame !== event.frame,
      newChannel: (context, event) => context.channel !== event.channel,
      newFeature: (context, event) => context.feature !== event.feature,
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
      saveFrame: assign({ frame: (context, event) => event.frame }),
      saveChannel: assign({ channel: (context, event) => event.channel }),
      saveFeature: assign({ feature: (context, event) => event.feature }),
      forwardToRaw: forwardTo((context) => context.rawRef),
      forwardToLabeled: forwardTo((context) => context.labeledRef),
      forwardToTool: forwardTo((context) => context.toolRef),

    }
  });

export default createImageMachine;
