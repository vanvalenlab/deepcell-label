import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createRawMachine from './rawMachine';
import createLabeledMachine from './labeledMachine';

const { pure } = actions;

const frameState = {
  entry: ['loadRaw', 'loadLabeled'],
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { target: 'checkLoaded', actions: assign({ rawLoaded: true }) },
        LABELEDLOADED: { target: 'checkLoaded', actions: assign({ labeledLoaded: true }) },
        // wait until the new channel or feature has loaded
        CHANNEL: { actions: assign({ rawLoaded: false }) },
        FEATURE: { actions: assign({ labeledLoaded: false }) },
      },
    },
    checkLoaded: {
      always: [
        { cond: 'isLoaded', target: 'idle', actions: 'useFrame' },
        { target: 'loading' },
      ]
    },
  },
  on: {
    LOADFRAME: { target: '.loading', cond: 'newLoadingFrame', actions: ['assignLoadingFrame', 'loadRaw', 'loadLabeled'] },
  }
};

// const colorModeState = {
//   initial: 'multiChannel',
//   states: {
//     multiChannel: {
//       on: {
//         'keydown.z': 'oneChannel',
//       }
//     },
//     oneChannel: {
//       on: {
//         'keydown.z': 'labelsOnly',
//       }
//     },
//     labelsOnly: {
//       on: {
//         'keydown.z': 'multiChannel',
//       }
//     },
//   },
// }

const createImageMachine = ({ projectId }) => Machine(
  {
    id: 'image',
    context: {
      projectId,
      frame: 0,
      loadingFrame: 0,
      numFrames: 1,
      numFeatures: 1,
      numChannels: 1,
      rawRef: null,
      labeledRef: null,
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: { target: 'setUpActors', actions: 'handleProject' },
        },
      },
      setUpActors: {
        always: { target: 'idle', actions: 'spawnActors' },
      },
      idle: {
        type: 'parallel',
        states: {
          frame: frameState,
          // colorMode: colorModeState,
        },
      },
    },
    on: {
      // LOADED: { actions: forwardTo((context, event) => context.features[event.data.feature]) },
      LABELEDARRAY: { actions: forwardTo(({ toolRef }) => toolRef) },
      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
      // image adjustment
    },
  },
  {
    guards: {
      newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
      isLoaded: ({ rawLoaded, labeledLoaded }) => rawLoaded && labeledLoaded,
    },
    actions: {
      handleProject: assign(
        (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
          return {
            frame, feature, channel,
            numFrames, numFeatures, numChannels,
            loadingFrame: frame,
          };
        }
      ),
      // create child actors to fetch raw & labeled data
      spawnActors: assign({
        rawRef: ({ projectId, numChannels, numFrames }) =>
          spawn(createRawMachine(projectId, numChannels, numFrames), 'raw'),
        labeledRef: ({ projectId, numFeatures, numFrames }) =>
          spawn(createLabeledMachine(projectId, numFeatures, numFrames), 'labeled'),
      }),
      loadLabeled: send(
        ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
        { to: ({ labeledRef }) => labeledRef }
      ),
      loadRaw: send(
        ({ loadingFrame }) => ({ type: 'LOADFRAME', frame: loadingFrame }),
        { to: ({ rawRef }) => rawRef }
      ),
      assignLoadingFrame: assign({
        loadingFrame: (_, { frame }) => frame,
        rawLoaded: false,
        labeledLoaded: false,
      }),
      useFrame: pure(({ rawRef, labeledRef, toolRef, loadingFrame }) => {
        const frameEvent = { type: 'FRAME', frame: loadingFrame };
        return [
          assign({ frame: loadingFrame }),
          send(frameEvent),
          send(frameEvent, { to: rawRef }),
          send(frameEvent, { to: labeledRef }),
          send(frameEvent, { to: toolRef }),
        ];
      }),
    },
  }
);

export default createImageMachine;
