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
    initial: 'loading',
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
          src: fetchRaw,
          onDone: { target: 'loaded', actions: 'saveFrame' },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
      loaded: {
        entry: 'sendRawLoaded',
      }
    },
    on: {
      // fetching
      SETFRAME: {
        target: 'checkLoaded',
        actions: assign({ nextFrame: (context, event) => event.frame }),
      },
      FRAME: { target: 'idle', actions: 'useFrame' },
      CHANNEL: { target: 'idle', actions: 'useFrame' },
      // image settings
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      SETBRIGHTNESS: { actions: 'setBrightness' },
      SETCONTRAST: { actions: 'setContrast' },
    }
  },
  {
    guards: {
      loadedFrame: (context, event) => context.nextFrame in context.frames,
      newFrame: (context, event) => context.frame !== event.frame,
    },
    actions: {
      // fetching
      sendRawLoaded: sendParent((context) => ({ type: 'RAWLOADED', frame: context.nextFrame, channel: context.channel })), 
      saveFrame: assign({
        frames: (context, event) => ({...context.frames, [context.nextFrame]: event.data}),
      }),
      useFrame: assign({
        frame: (context, event) => event.frame,
        rawImage: (context, event) => context.frames[event.frame],
      }),
      // image settings
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default createChannelMachine;
