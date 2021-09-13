import { assign, Machine, send, sendParent } from 'xstate';
import { pure } from 'xstate/lib/actions';

function fetchSemanticLabels(context) {
  const { projectId, feature } = context;
  const pathToSemanticLabels = `/api/semantic-labels/${projectId}/${feature}`;
  return fetch(pathToSemanticLabels).then(res => res.json());
}

function fetchColors(context) {
  const { projectId, feature } = context;
  const pathToColors = `/api/colormap/${projectId}/${feature}`;
  return fetch(pathToColors).then(res => res.json());
}

function fetchLabeledFrame(context) {
  const { projectId, feature, loadingFrame: frame } = context;
  const pathToLabeled = `/api/labeled/${projectId}/${feature}/${frame}`;
  const pathToArray = `/api/array/${projectId}/${feature}/${frame}`;

  const fetchImage = fetch(pathToLabeled)
    // .then(validateResponse)
    .then(readResponseAsBlob)
    .then(makeImageURL)
    .then(showImage);
  // .catch(logError);

  const fetchArray = fetch(pathToArray).then(res => res.json());

  return Promise.all([fetchImage, fetchArray]);
}

function readResponseAsBlob(response) {
  return response.blob();
}

function makeImageURL(responseAsBlob) {
  return URL.createObjectURL(responseAsBlob);
}

function showImage(imgUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = imgUrl;
  });
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

const reloadColorsState = {
  entry: assign({ reloadColors: (_, { data: { labels } }) => labels }),
  initial: 'checkReload',
  states: {
    checkReload: {
      always: [{ cond: ({ reloadColors }) => reloadColors, target: 'reloading' }, 'reloaded'],
    },
    reloading: {
      invoke: {
        src: fetchColors,
        onDone: { target: 'reloaded', actions: 'saveColors' },
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
    colors: reloadColorsState,
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
        arrays: {},
        colors: {},
        labeledImage: new Image(),
        labeledArray: null,
        labels: null,
        reloadLabels: false,
      },
      initial: 'idle',
      invoke: [
        {
          src: fetchColors,
          onDone: { actions: 'saveColors' },
        },
      ],
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
          const newFrames = event.data.frames;
          const inNew = ([key, value]) => newFrames.includes(Number(key));
          const notInNew = ([key, value]) => !newFrames.includes(Number(key));
          const frames = Object.entries(context.frames);
          const arrays = Object.entries(context.arrays);
          const filteredFrames = frames.filter(notInNew);
          const filteredArrays = arrays.filter(notInNew);
          for (const [frame, image] of frames.filter(inNew)) {
            URL.revokeObjectURL(image.src);
          }
          return {
            frames: Object.fromEntries(filteredFrames),
            arrays: Object.fromEntries(filteredArrays),
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
        useFrame: assign(({ frames, arrays }, { frame }) => ({
          frame,
          labeledImage: frames[frame],
          labeledArray: arrays[frame],
        })),
        saveFrame: assign(({ frames, arrays, loadingFrame }, { data: [image, array] }) => ({
          frames: { ...frames, [loadingFrame]: image },
          arrays: { ...arrays, [loadingFrame]: array },
        })),
        saveLabels: assign({ labels: (_, event) => event.data }),
        saveColors: assign({ colors: (_, event) => event.data.colors }),
        loadNextFrame: assign({
          loadingFrame: ({ numFrames, frame, frames }) => {
            const allFrames = [...Array(numFrames).keys()];
            return (
              allFrames
                // remove loaded frames
                .filter(frame => !(frame in frames))
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
