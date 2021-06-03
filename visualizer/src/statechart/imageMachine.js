import { Machine, assign, forwardTo, actions, spawn, send } from 'xstate';
import createRawMachine from './rawMachine';
import createLabeledMachine from './labeledMachine';

const { pure, respond } = actions;

const loadFrameState = {
  entry: ['loadRaw', 'loadLabeled'],
  initial: 'loading',
  states: {
    idle: {},
    loading: {
      on: {
        RAWLOADED: { 
          target: 'checkLoaded', 
          actions: assign({ rawLoaded: true }) 
        },
        LABELEDLOADED: { 
          target: 'checkLoaded', 
          actions: assign({ labeledLoaded: true }) 
        },
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
    LOADFRAME: { 
      target: '.loading', 
      cond: 'newLoadingFrame', 
      actions: ['assignLoadingFrame', 'loadRaw', 'loadLabeled'] 
    },
  }
};


const frameState = {
  initial: 'waitForProject',
  states: {
    waitForProject: {
      on: {
        PROJECT: { target: 'setUpActors', actions: 'handleProject' },
      },
    },
    setUpActors: {
      always: { target: 'loadFrame', actions: 'spawnActors' },
    },
    // setUpUndo: {
    //   always: { target: 'loadFrame', actions: 'addActorsToUndo' },
    // },
    loadFrame: loadFrameState,
  },
};


const syncToolState = {
  initial: 'waitForTool',
  states: {
    waitForTool: {
      on: {
        TOOLREF: { target: 'idle', actions: 'saveTool' },
      }
    },
    idle: {
      on: {
        LABELEDARRAY: { actions: 'forwardToTool' },
        FEATURE: { actions: ['setFeature', 'forwardToTool'] },
        CHANNEL: { actions: ['setChannel', 'forwardToTool'] },
      }
    },
  }
};

const colorState = {
  invoke: {
    src: 'listenForColorHotkey',
  },
  on: {
    TOGGLE_COLOR: { actions: [
      assign({ grayscale: ({ grayscale }) => !grayscale }),
      send(({ grayscale }) => grayscale ? 'GRAYSCALE' : 'COLOR', { to: ({ toolRef }) => toolRef }),
    ]}
  },
};

const restoreState = {
  on: { 
    RESTORE: [
      { cond: 'sameContext', actions: respond('SAMECONTEXT') },
      { target: '.restoring', internal: false,  actions: respond('RESTORED')  },
    ],
    SAVE: { actions: 'save' },
  },
  states: {
    restoring: {
      type: 'parallel',
      states: {
        restoreGrayscale: {
          entry: pure((context, event) => {
            if (context.grayscale !== event.grayscale) { 
              return send('TOGGLE_COLOR');
            }
          })
        },
        restoreFrame: {
          entry: send((_, { frame }) => ({ type: 'LOADFRAME', frame })),
        },
      }
    },
  }
};

const restoreGuards = {
  sameContext: (context, event) => 
    context.frame === event.frame 
    && context.grayscale === event.grayscale,
}; 

const restoreActions = {
  save: respond(({ frame, grayscale }) => ({ type: 'RESTORE', frame, grayscale })),
};


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
      grayscale: false,
    },
    type: 'parallel',
    states: {
      syncTool: syncToolState,
      frame: frameState,
      color: colorState,
      restore: restoreState,
    },
    on: {
      UNDOREF: { actions: 'saveUndo' },
      EDITED: { actions: forwardTo(({ labeledRef }) => labeledRef) },
    },
  },
  {
    services: {
      listenForColorHotkey: () => (send) => {
        const listener = (event) => {
          if (event.key === 'z') { send('TOGGLE_COLOR'); }
        }
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
      // listenForChannelHotkey: (context) => (send) => {
      //   const { rawRef } = context;
      //   const listener = (event) => {
      //     if (event.key === 'c') { 
      //       const channelEvent = { type: 'LOADCHANNEL', }
      //       rawRef
      //     } else if (event.key === 'C') {

      //     }
      //   }
      // }
    },
    guards: {
      newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
      isLoaded: ({ rawLoaded, labeledLoaded }) => rawLoaded && labeledLoaded,
      ...restoreGuards,
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
      addActorsToUndo: pure((context) => {
        const { undoRef, rawRef, labeledRef } = context;
        return [
          send({ type: 'ADD_ACTOR', actor: rawRef }, { to: undoRef }),
          send({ type: 'ADD_ACTOR', actor: labeledRef }, { to: undoRef }),
        ];
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
          send(frameEvent, { to: rawRef }),
          send(frameEvent, { to: labeledRef }),
          send(frameEvent, { to: toolRef }),
        ];
      }),
      saveTool: assign({ toolRef: (_, event) => event.toolRef }),
      saveUndo: assign({ undoRef: (_, event) => event.undoRef }),
      forwardToTool: forwardTo(({ toolRef }) => toolRef),
      setFeature: assign({ feature: (_, { feature }) => ({ feature })}),
      setChannel: assign({ channel: (_, { channel }) => ({ channel })}),
      ...restoreActions,
    },
  }
);

export default createImageMachine;
