import { Machine, assign, forwardTo } from 'xstate';
import rawMachine from './rawMachine';
import labeledMachine from './labeledMachine';


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
      rawImage: new Image(),
      labeledImage: new Image(),
      labeledArray: [[]],
    },
    invoke: [
      {
        id: 'raw',
        src: rawMachine,
        data: {
          projectId: (context) => context.projectId,
          frame: (context) => context.frame,
          channel: (context) => context.channel,
        },
      },
      {
        id: 'labeled',
        src: labeledMachine,
        data: {
          projectId: (context) => context.projectId,
          frame: (context) => context.frame,
          feature: (context) => context.feature,
        },
      }
    ],
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: {
            target: 'idle', actions: 'handleProject',
          },
        },
      },
      // loading: {
      //   invoke: {
      //     id: 'fetch-project',
      //     src: fetchProject,
      //     onDone: {
      //       target: 'idle',
      //       actions: ['handleFirstPayload', (c, e) => console.log(e.data)],
      //     },
      //     onError: {
      //       target: 'idle',
      //       actions: (context, event) => console.log(event.data),
      //     },
      //   }
      // },
      idle: {},
    },
    on: {
      SELECTREF: { actions: forwardTo('labeled') },
      SETFRAME: {
        cond: 'newFrame',
        actions: [
          assign({ frame: (context, event) => event.frame }),
          forwardTo('raw'),
          forwardTo('labeled'),
        ],
      },
      SETCHANNEL: {
        cond: 'newChannel',
        actions: [
          assign({ channel: (context, event) => event.channel }),
          forwardTo('raw'),
        ],
      },
      SETFEATURE: {
        cond: 'newFeature',
        actions: [
          assign({ feature: (context, event) => event.feature }),
          forwardTo('labeled'),
        ]
      },
      // LOADEDCHANNEL: {
      //   // target: 'idle',
      //   actions: assign({ rawImage: event.rawImage, channel: event.channel })
      // },
      // LOADEDFEATURE: {
      //   // target: 'idle',
      //   actions: [
      //     assign({ labelImage: new Image(), labelArray: [[]], channel: 0 }),
      //     send((context, event) => (
      //       { type: 'NEWLABELARRAY', labelArray: event.labelArray }),
      //       { to: 'canvas' }
      //     ),
      //   ],
      // },
    },
  },
  {
    guards: {
      newFrame: (context, event) => context.frame !== event.frame,
      newChannel: (context, event) => context.channel !== event.channel,
      newFeature: (context, event) => context.feature !== event.feature,
    },
    actions: {
      handleProject: assign(
        (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
          console.log({ frame, feature, channel, numFrames, numFeatures, numChannels });
          return { frame, feature, channel, numFrames, numFeatures, numChannels };
        }
      ),
    }
  });

export default createImageMachine;
