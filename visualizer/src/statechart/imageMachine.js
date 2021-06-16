import { Machine, assign, forwardTo, actions, spawn, send, sendParent } from 'xstate';
import { bind, unbind } from 'mousetrap';

import createRawMachine from './raw/rawMachine';
import createLabeledMachine from './labeled/labeledMachine';

const { pure, respond } = actions;

const loadFrameState = {
  entry: ['loadRaw', 'loadLabeled'],
  initial: 'loading',
  states: {
    idle: {
      invoke: {
        src: 'listenForFrameHotkeys',
      },
    },
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
      always: { target: 'setUpUndo', actions: 'spawnActors' },
    },
    setUpUndo: {
      always: { target: 'loadFrame', actions: 'addActorsToUndo' },
    },
    loadFrame: loadFrameState,
  },
};


const syncToolState = {
  initial: 'waitForTool',
  states: {
    waitForTool: {
      on: {
        TOOLREF: { target: 'idle', actions: 'setTool' },
      }
    },
    idle: {
      on: {
        LABELEDARRAY: { actions: 'forwardToTool' },
        LABELS: { actions: 'forwardToTool' },
        FEATURE: { actions: ['setFeature', 'forwardToTool'] },
        CHANNEL: { actions: ['setChannel', 'forwardToTool'] },
        GRAYSCALE: { actions: [assign({ grayscale: true }), 'forwardToTool']},
        COLOR: { actions: [assign({ grayscale: false }), 'forwardToTool']},
      }
    },
  }
};

const restoreState = {
  on: { 
    RESTORE: [
      { cond: 'sameContext', actions: respond('SAMECONTEXT') },
      { target: '.restoring', internal: false,  actions: respond('RESTORED')  },
    ],
    SAVE: { actions: 'save' },
  },
  initial: 'idle',
  states: {
    idle: {},
    restoring: {
      type: 'parallel',
      states: {
        restoreGrayscale: {
          entry: pure((context, event) => {
            if (context.grayscale !== event.grayscale) { 
              return send('TOGGLE_COLOR_MODE');
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
      restore: restoreState,
    },
    on: {
      EDITED: { actions: forwardTo(({ labeledRef }) => labeledRef) },
      TOGGLE_COLOR_MODE: { actions: forwardTo('raw') },
    },
  },
  {
    services: {
      listenForFrameHotkeys: ({ frame, numFrames}) => (send) => {
        const prevFrame = (frame - 1 + numFrames) % numFrames;
        const nextFrame = (frame + 1) % numFrames;
        bind('a', () => send({ type: 'LOADFRAME', frame: prevFrame }));
        bind('d', () => send({ type: 'LOADFRAME', frame: nextFrame }));
        return () => {
          unbind('a');
          unbind('d');
        }
      },
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
        const { rawRef, labeledRef } = context;
        return [
          sendParent({ type: 'ADD_ACTOR', actor: labeledRef }),
          sendParent({ type: 'ADD_ACTOR', actor: rawRef }),
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
      setTool: assign({ toolRef: (_, event) => event.toolRef }),
      forwardToTool: forwardTo(({ toolRef }) => toolRef),
      setFeature: assign({ feature: (_, { feature }) => ({ feature })}),
      setChannel: assign({ channel: (_, { channel }) => ({ channel })}),
      ...restoreActions,
    },
  }
);

export default createImageMachine;
