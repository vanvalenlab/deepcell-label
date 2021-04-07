import { Machine, assign, send, sendParent } from 'xstate';
import npyjs from '../npyjs';

function fetchLabeled(context) {
  const { projectId, feature, nextFrame: frame } = context;
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

const createFeatureMachine = ({ projectId, feature, frame }) => Machine(
  {
    id: `labeled_feature${feature}`,
    context: {
      projectId,
      feature,
      frame,
      nextFrame: frame,
      opacity: 0.3,
      highlight: false,
      showNoLabel: true,
      frames: {},
      labeledImage: new Image(),
      labeledArray: [[]],
    },
    initial: 'loading',
    states: {
      idle: {
        entry: 'sendLabeledArray'
      },
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
      },
      reloading: {
        invoke: {
          src: fetchLabeled,
          onDone: { target: 'idle', actions: ['saveFrame', 'useFrame'] },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      }
    },
    on: {
      SETFRAME: {
        target: 'checkLoaded',
        actions: assign({ nextFrame: (context, event) => event.frame }),
      },
      FRAME: { target: 'idle', actions: 'useFrame' },
      FEATURE: { target: 'idle', actions: 'useFrame' },
      SETOPACITY: { actions: 'setOpacity' },
      TOGGLESHOWNOLABEL: { actions: 'toggleShowNoLabel' },
      LOADED: { target: 'reloading', cond: 'labeledChanged', actions: (context, event) => console.log(event) },
    }
  },
  {
    guards: {
      loadedFrame: (context) => context.nextFrame in context.frames,
      newFrame: (context, event) => context.frame !== event.frame,
      labeledChanged: (context, event) => event.data.labeled_changed,
    },
    actions: {
      sendLabeledLoaded: sendParent((context) => (
        { type: 'LABELEDLOADED', frame: context.nextFrame, feature: context.feature }
      )),
      sendLabeledArray: sendParent((context) => (
        { type: 'LABELEDARRAY', labeledArray: context.labeledArray }
      )),
      useFrame: assign((context, event) => ({
        frame: context.nextFrame,
        labeledImage: context.frames[context.nextFrame],
        labeledArray: context.arrays[context.nextFrame],
      })),
      saveFrame: assign((context, event) => ({
        frames: { ...context.frames, [context.nextFrame]: event.data[0] },
        arrays: { ...context.arrays, [context.nextFrame]: event.data[1] },
      })),
      toggleHighlight: assign({ highlight: (context) => !context.highlight }),
      toggleShowNoLabel: assign({ showNoLabel: (context) => !context.showNoLabel }),
      setOpacity: assign({ opacity: (_, event) => Math.min(1, Math.max(0, event.opacity)) }),
    }
  }
);

export default createFeatureMachine;
