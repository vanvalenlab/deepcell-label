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
        on: {
          SETFRAME: {
            cond: 'newFrame',
            actions: assign({ nextFrame: (context, event) => event.frame }),
            target: 'changeFrame'
          },
        },
      },
      changeFrame: {
        always: [
          { cond: 'existingFrame', actions: 'changeToExistingFrame', target: 'notifyLabelChange' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchLabeled,
          onDone: {
            target: 'idle', actions: 'changeToNewFrame',
          },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
      notifyLabelChange: {
        always: { target: 'idle', actions: 'sendNew' }
      }
    },
    on: {
      SETOPACITY: { actions: 'setOpacity' },
      TOGGLESHOWNOLABEL: { actions: 'toggleShowNoLabel' },
    }
  },
  {
    guards: {
      existingFrame: (context, event) => context.nextFrame in context.frames,
      updateFrame: (context, event) => context.frame !== event.context.frame,
      newFrame: (context, event) => context.frame !== event.frame,
    },
    actions: {
      changeToExistingFrame: assign((context) => ({
        frame: context.nextFrame,
        labeledImage: context.frames[context.nextFrame],
        labeledArray: context.arrays[context.nextFrame],
      })),
      changeToNewFrame: assign((context, event) => ({
        frame: context.nextFrame,
        labeledImage: event.data[0],
        labeledArray: event.data[1],
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
