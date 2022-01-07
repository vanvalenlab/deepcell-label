import colormap from 'colormap';
import { assign, Machine, send, sendParent } from 'xstate';
import { pure } from 'xstate/lib/actions';

function fetchSemanticLabels(context) {
  const { projectId, feature } = context;
  const pathToSemanticLabels = `/api/semantic-labels/${projectId}/${feature}`;
  return fetch(pathToSemanticLabels).then((res) => res.json());
}

function fetchLabeledFrame(context) {
  const { projectId, feature, loadingFrame: frame } = context;
  return fetch(`/api/array/${projectId}/${feature}/${frame}`).then((res) => res.json());
}

const reloadFrameState = {
  entry: 'clearChangedFrames',
  initial: 'checkReload',
  states: {
    checkReload: {
      always: [{ cond: 'frameChanged', target: 'reloading' }, 'reloaded'],
    },
    reloading: {
      entry: assign({ loadingFrame: ({ frame }) => frame }),
      invoke: {
        src: fetchLabeledFrame,
        onDone: { target: 'reloaded', actions: 'saveFrame' },
        onError: {
          target: 'reloaded',
          actions: (context, event) => console.log(event),
        },
      },
    },
    reloaded: {
      type: 'final',
    },
  },
};

const reloadLabelsState = {
  entry: assign({ reloadLabels: (_, { data: { labels } }) => labels }),
  initial: 'checkReload',
  states: {
    checkReload: {
      always: [{ cond: ({ reloadLabels }) => reloadLabels, target: 'reloading' }, 'reloaded'],
    },
    reloading: {
      invoke: {
        src: fetchSemanticLabels,
        onDone: { target: 'reloaded', actions: 'saveLabels' },
        onError: 'reloaded',
      },
    },
    reloaded: {
      type: 'final',
    },
  },
};

const reloadState = {
  type: 'parallel',
  states: {
    frame: reloadFrameState,
    labels: reloadLabelsState,
  },
  onDone: {
    target: 'idle',
    actions: send(({ frame }) => ({ type: 'FRAME', frame })),
  },
};

const loadState = {
  initial: 'checkLoaded',
  invoke: {
    src: fetchSemanticLabels,
    onDone: { actions: 'saveLabels' },
  },
  states: {
    checkLoaded: {
      always: [{ cond: 'loadedFrame', target: 'frameLoaded' }, { target: 'loadingFrame' }],
    },
    loadingFrame: {
      invoke: {
        src: fetchLabeledFrame,
        onDone: { target: 'frameLoaded', actions: 'saveFrame' },
        onError: {
          target: 'frameLoaded',
          actions: (context, event) => console.log(event),
        },
      },
    },
    frameLoaded: {
      always: { cond: 'loadedLabels', target: 'loaded' },
    },
    loaded: {
      entry: 'sendLabeledLoaded',
      type: 'final',
    },
  },
  onDone: 'idle',
};

const createFeatureMachine = (projectId, feature, numFrames) =>
  Machine(
    {
      id: `labeled_feature${feature}`,
      context: {
        projectId,
        feature,
        numFrames,
        frame: null,
        loadingFrame: null,
        frames: {},
        colormap: [[0, 0, 0, 1], ...colormap({ colormap: 'viridis', format: 'rgba' })],
        labeledArray: null,
        labels: null,
        reloadLabels: false,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            PRELOAD: {
              cond: 'canPreload',
              target: 'load',
              actions: 'loadNextFrame',
            },
          },
        },
        load: loadState,
        reload: reloadState,
      },
      on: {
        LOAD_FRAME: {
          target: 'load',
          actions: assign({ loadingFrame: (context, event) => event.frame }),
        },
        FRAME: { actions: ['useFrame', 'sendLabelData'] },
        // FEATURE: { actions: ['useFrame', 'sendLabelData'], },
        EDITED: {
          target: 'reload',
          actions: assign({
            newFrames: (_, { data: { frames } }) => frames,
            reloadLabels: (_, { data: { labels } }) => labels,
          }),
        },
      },
    },
    {
      guards: {
        loadedLabels: ({ labels }) => labels !== null,
        loadedFrame: ({ loadingFrame, frames }) => loadingFrame in frames,
        frameChanged: ({ frame, newFrames }) => newFrames.includes(frame),
        canPreload: ({ frames, numFrames }) => Object.keys(frames).length !== numFrames,
      },
      actions: {
        clearChangedFrames: assign((context, event) => {
          const changedFrames = event.data.frames;
          const notChanged = ([key, value]) => !changedFrames.includes(Number(key));
          return {
            frames: Object.fromEntries(Object.entries(context.frames).filter(notChanged)),
          };
        }),
        sendLabeledLoaded: sendParent(({ loadingFrame, feature }) => ({
          type: 'LABELED_LOADED',
          frame: loadingFrame,
          feature,
        })),
        sendLabelData: pure(({ labeledArray, labels }) => {
          return [
            sendParent({ type: 'LABELED_ARRAY', labeledArray }),
            sendParent({ type: 'LABELS', labels }),
          ];
        }),
        useFrame: assign(({ frames }, { frame }) => ({
          frame,
          labeledArray: frames[frame],
        })),
        saveFrame: assign(({ frames, loadingFrame }, { data }) => ({
          frames: { ...frames, [loadingFrame]: data },
        })),
        saveLabels: assign({
          labels: (_, event) => event.data,
          colormap: (_, event) => [
            [0, 0, 0, 1],
            ...colormap({
              colormap: 'viridis',
              nshades: Math.max(9, Math.max(...Object.keys(event.data))),
              format: 'rgba',
            }),
          ],
        }),
        loadNextFrame: assign({
          loadingFrame: ({ numFrames, frame, frames }) => {
            const allFrames = [...Array(numFrames).keys()];
            return (
              allFrames
                // remove loaded frames
                .filter((frame) => !(frame in frames))
                // load the closest unloaded frame to the current frame
                .reduce((prev, curr) =>
                  Math.abs(curr - frame) < Math.abs(prev - frame) ? curr : prev
                )
            );
          },
        }),
      },
    }
  );

export default createFeatureMachine;
