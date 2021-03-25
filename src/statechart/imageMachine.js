import { Machine, assign, forwardTo } from 'xstate';
import rawMachine from './rawMachine';
import labeledMachine from './labeledMachine';


function fetchProject(context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`)
    .then(response => response.json());
}

const createImageMachine = ({ projectId }) => Machine(
  {
    id: 'image',
    initial: 'loading',
    context: {
      projectId,
      frame: 0,
      feature: 0,
      channel: 0,
      numFrames: 23,
      numFeatures: 2,
      numChannels: 3,
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
          numFrames: (context) => context.numFrames,
          numChannels: (context) => context.numChannels,
        },
      },
      {
        id: 'labeled',
        src: labeledMachine,
        data: {
          projectId: (context) => context.projectId,
          frame: (context) => context.frame,
          feature: (context) => context.feature,
          numFrames: (context) => context.numFrames,
          numFeatures: (context) => context.numFeatures,
        },
      }
    ],
    states: {
      loading: {
        invoke: {
          id: 'fetch-project',
          src: fetchProject,
          onDone: {
            target: 'idle',
            actions: ['handleFirstPayload', (c, e) => console.log(e.data)],
          },
          onError: {
            target: 'idle',
            actions: (context, event) => console.log(event.data),
          },
        }
      },
      idle: {
        
      },
    },
    on: {
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
      handleFirstPayload: assign({
        frame: (context, event) => event.data.frame,
        channel: (context, event) => event.data.channel,
        feature: (context, event) => event.data.feature,
        numFrames: (context, event) => event.data.numFrames,
        numChannels: (context, event) => event.data.numChannels,
        numFeatures: (context, event) => event.data.numFeatures,
      }),
      handlePayload: assign({
        rawImage: (context, event) => event.data.rawImage,
        labeledImage: (context, event) => event.data.labelImage,
        labeledArray: (context, event) => event.data.labelArray,
      }),
    }
  });

export default createImageMachine;
