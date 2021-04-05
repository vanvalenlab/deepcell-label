import { Machine, assign, sendParent } from 'xstate';

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
            target: 'checkLoaded'
          },
        },
      },
      checkLoaded: {
        always: [
          { cond: 'loadedFrame', target: 'loaded' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchRaw,
          onDone: { target: 'loaded', actions: 'saveFrame' },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
      loaded: {
        entry: 'sendRawFrameToParent',
        on: { FRAME: { target: 'idle', actions: 'useFrame' } },
      }
    }
  },
  {
    guards: {
      loadedFrame: (context, event) => context.nextFrame in context.frames,
      newFrame: (context, event) => context.frame !== event.frame,
    },
    actions: {
      sendRawFrameToParent: sendParent((context) => ({ type: 'RAWFRAME', frame: context.nextFrame, channel: context.channel })), 
      saveFrame: assign({
        frames: (context, event) => ({...context.frames, [context.nextFrame]: event.data}),
      }),
      useFrame: assign({
        frame: (context) => context.nextFrame,
        rawImage: (context, event) => context.frames[context.nextFrame],
      }),
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default createChannelMachine;
