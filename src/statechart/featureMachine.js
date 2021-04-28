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

const createFeatureMachine = (projectId, feature, numFrames) => Machine(
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
      labeledImage: new Image(),
      labeledArray: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          PRELOAD: { cond: 'canPreload', target: 'loading', actions: 'loadNextFrame' },
        }
      },
      checkLoaded: {
        always: [
          { cond: 'loadedFrame', target: 'idle', actions: 'sendLabeledLoaded' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchLabeled,
          onDone: { target: 'idle', actions: ['saveFrame', 'sendLabeledLoaded'] },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
      reload: {
        entry: 'clearChangedFrames',
        always: [
          { cond: 'frameChanged', target: 'reloading' },
          'idle'
        ]
      },
      reloading: {
        entry: assign({ loadingFrame: (context) => context.frame }),
        invoke: {
          src: fetchLabeled,
          onDone: { target: 'idle', actions: ['reloadFrame', 'sendLabeledArray'] },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
    },
    on: {
      LOADFRAME: {
        target: 'checkLoaded',
        actions: assign({ loadingFrame: (context, event) => event.frame }),
      },
      FRAME: { actions: ['useFrame', 'sendLabeledArray'], },
      FEATURE: { actions: ['useFrame', 'sendLabeledArray'], },
      LOADED: { target: 'reload', actions: assign({ newFrames: (_, { data: { frames } }) => frames }) },
    }
  },
  {
    guards: {
      loadedFrame: ({ loadingFrame, frames }) => loadingFrame in frames,
      newFrame: (context, event) => context.frame !== event.frame,
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
      sendLabeledLoaded: sendParent(({ loadingFrame, feature }) => (
        { type: 'LABELEDLOADED', frame: loadingFrame, feature }
      )),
      sendLabeledArray: sendParent(({ labeledArray }) => (
        { type: 'LABELEDARRAY', labeledArray }
      )),
      useFrame: assign(({ frames, arrays }, { frame }) => ({
        frame,
        labeledImage: frames[frame],
        labeledArray: arrays[frame],
      })),
      saveFrame: assign(({ frames, arrays, loadingFrame }, { data: [image, array] }) => ({
        frames: { ...frames, [loadingFrame]: image },
        arrays: { ...arrays, [loadingFrame]: array },
      })),
      reloadFrame: assign(({ frame, frames, arrays }, { data: [image, array] }) => ({
        labeledImage: image,
        labeledArray: array,
        frames: { ...frames, [frame]: image },
        arrays: { ...arrays, [frame]: array },
      })),
      loadNextFrame: assign({
        loadingFrame: ({ numFrames, frame, frames }) => {
          const allFrames = [...Array(numFrames).keys()];
          return allFrames
            // remove loaded frames
            .filter((frame) => !(frame in frames))
            // load the closest unloaded frame to the current frame
            .reduce((prev, curr) =>
              Math.abs(curr - frame) < Math.abs(prev - frame) ? curr : prev
            );
        }
      }),
    }
  }
);

export default createFeatureMachine;
