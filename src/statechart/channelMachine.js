import { Machine, assign } from 'xstate';

function fetchRaw(context) {
  const { projectId, channel, nextFrame: frame } = context;
  const pathToRaw = `/api/raw/${projectId}/${channel}/${frame}`;

  return fetch(pathToRaw)
    // .then(validateResponse)
    .then(readResponseAsBlob)
    .then(makeImageURL)
    .then(showImage);
    // .catch(logError);
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

const createChannelMachine = ({ projectId, channel, frame }) => Machine(
  {
    id: `raw_channel${channel}`,
    context: {
      projectId,
      channel,
      frame,
      // numFrames,
      nextFrame: frame,
      brightness: 0,
      contrast: 0,
      invert: true,
      grayscale: true,
      frames: {},
      rawImage: new Image(),
    },
    on: {
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      SETBRIGHTNESS: { actions: 'setBrightness' },
      SETCONTRAST: { actions: 'setContrast' },
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
          { cond: 'existingFrame', actions: 'changeToExistingFrame', target: 'idle' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchRaw,
          onDone: {
            target: 'idle', actions: 'changeToNewFrame',
          },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
    }
  },
  {
    guards: {
      existingFrame: (context, event) => context.nextFrame in context.frames,
      updateFrame: (context, event) => context.frame !== event.context.frame,
      newFrame: (context, event) => context.frame !== event.frame,
    },
    actions: {
      changeToNewFrame: assign({
        frame: (context) => context.nextFrame,
        rawImage: (context, event) => event.data,
        frames: (context, event) => ({...context.frames, [context.nextFrame]: event.data}),
      }),
      changeToExistingFrame: assign((context) => ({
        frame: context.nextFrame,
        rawImage: context.frames[context.nextFrame],
      })),
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default createChannelMachine;
