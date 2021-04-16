import { Machine, assign, send, sendParent } from 'xstate';
import npyjs from '../npyjs';

function fetchLabeled(context) {
  const { projectId, feature, loadingFrame: frame } = context;
  const pathToLabeled = `/api/labeled/${projectId}/${feature}/${frame}`;
  const pathToArray = `/api/array/${projectId}/${feature}/${frame}`;

  const image = fetch(pathToLabeled)
    // .then(validateResponse)
    .then(readResponseAsBlob)
    .then(makeImageURL)
    .then(showImage);
    // .catch(logError);
  const npyLoader = new npyjs();
  const array = npyLoader.load(pathToArray)
    .then(reshapeArray);
  return Promise.all([image, array]);
}

function readResponseAsBlob(response) {
  return response.blob();
}

function makeImageURL(responseAsBlob) {
  return URL.createObjectURL(responseAsBlob);
}

function showImage(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = imgUrl;
  });
}

function reshapeArray(array) {
  // need to convert 1d data to 2d array
  const reshape = (arr, width) => 
    arr.reduce((rows, key, index) => (index % width == 0 ? rows.push([key]) 
      : rows[rows.length - 1].push(key)) && rows, []);
  const result = reshape(array.data, array.shape[1]);
  return result;
}

const createFeatureMachine = (projectId, feature) => Machine(
  {
    id: `labeled_feature${feature}`,
    context: {
      projectId,
      feature,
      frame: null,
      loadingFrame: null,
      opacity: 0.3,
      highlight: false,
      showNoLabel: true,
      frames: {},
      arrays: {},
      labeledImage: new Image(),
      labeledArray: null,
    },
    initial: 'idle',
    states: {
      idle: {},
      checkLoaded: {
        always: [
          { cond: 'loadedFrame', target: 'loaded' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchLabeled,
          onDone: { target: 'loaded', actions: 'saveFrame' },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
      loaded: {
        entry: 'sendLabeledLoaded',
        exit: 'sendLabeledArray'
      },
      reloading: {
        invoke: {
          src: fetchLabeled,
          onDone: { target: 'idle', actions: 'reloadFrame' },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
        exit: [(c) => console.log(c), 'sendLabeledArray'],
      }
    },
    on: {
      LOADFRAME: {
        target: 'checkLoaded',
        actions: assign({ loadingFrame: (context, event) => event.frame }),
      },
      FRAME: { target: 'idle', actions: 'useFrame' },
      FEATURE: { target: 'idle', actions: 'useFrame' },
      SETOPACITY: { actions: 'setOpacity' },
      TOGGLESHOWNOLABEL: { actions: 'toggleShowNoLabel' },
      LOADED: [
        { target: 'reloading', cond: 'frameChanged', actions: 'clearChangedFrames' },
        { actions: 'clearChangedFrames' }
      ],
    }
  },
  {
    guards: {
      loadedFrame: (context) => context.loadingFrame in context.frames,
      newFrame: (context, event) => context.frame !== event.frame,
      frameChanged: (context, event) => event.data.frames.includes(context.frame),
    },
    actions: {
      clearChangedFrames: assign((context, event) => {
        const newFrames = event.data.frames;
        const notInNew = ([key, value]) => !newFrames.includes(Number(key));
        const frames = Object.entries(context.frames);
        const arrays = Object.entries(context.arrays);
        const filteredFrames = frames.filter(notInNew);
        const filteredArrays = arrays.filter(notInNew);
        return {
          frames: Object.fromEntries(filteredFrames),
          arrays: Object.fromEntries(filteredArrays),
        };
      }),
      sendLabeledLoaded: sendParent((context) => (
        { type: 'LABELEDLOADED', frame: context.loadingFrame, feature: context.feature }
      )),
      sendLabeledArray: sendParent((context) => (
        { type: 'LABELEDARRAY', labeledArray: context.labeledArray }
      )),
      useFrame: assign((context, event) => ({
        frame: event.frame,
        labeledImage: context.frames[event.frame],
        labeledArray: context.arrays[event.frame],
      })),
      saveFrame: assign((context, event) => ({
        frames: { ...context.frames, [context.loadingFrame]: event.data[0] },
        arrays: { ...context.arrays, [context.loadingFrame]: event.data[1] },
      })),
      reloadFrame: assign(({ frame, frames, arrays }, { data: [image, array] }) => ({
        labeledImage: image,
        labeledArray: array,
        frames: { ...frames, [frame]: image },
        arrays: { ...arrays, [frame]: array },
      })),
      toggleHighlight: assign({ highlight: ({ highlight }) => !highlight }),
      toggleShowNoLabel: assign({ showNoLabel: ({ showNoLabel }) => !showNoLabel }),
      setOpacity: assign({ opacity: (_, { opacity }) => Math.min(1, Math.max(0, opacity)) }),
    }
  }
);

export default createFeatureMachine;
