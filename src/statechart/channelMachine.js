import { Machine, assign, sendParent } from 'xstate';

function fetchRaw(context) {
  const { projectId, channel, loadingFrame: frame } = context;
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

const createChannelMachine = (projectId, channel, numFrames) => Machine(
  {
    id: `channel${channel}`,
    context: {
      projectId,
      channel,
      numFrames,
      frame: 0,
      loadingFrame: null,
      brightness: 0,
      contrast: 0,
      invert: false,
      grayscale: false,
      frames: {},
      rawImage: new Image(),
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
          { cond: 'loadedFrame', target: 'idle', actions: 'sendRawLoaded' },
          { target: 'loading' },
        ]
      },
      loading: {
        invoke: {
          src: fetchRaw,
          onDone: { target: 'idle', actions: ['saveFrame', 'sendRawLoaded'] },
          onError: { target: 'idle', actions: (context, event) => console.log(event) },
        },
      },
    },
    on: {
      // fetching
      LOADFRAME: {
        target: 'checkLoaded',
        actions: assign({ loadingFrame: (context, event) => event.frame }),
      },
      FRAME: { actions: 'useFrame' },
      CHANNEL: { actions: 'useFrame' },
      // image settings
      TOGGLEINVERT: { actions: 'toggleInvert' },
      TOGGLEGRAYSCALE: { actions: 'toggleGrayscale' },
      SETBRIGHTNESS: { actions: 'setBrightness' },
      SETCONTRAST: { actions: 'setContrast' },
    }
  },
  {
    guards: {
      loadedFrame: (context, event) => context.loadingFrame in context.frames,
      newFrame: (context, event) => context.frame !== event.frame,
      canPreload: ({ frames, numFrames }) => Object.keys(frames).length !== numFrames,
    },
    actions: {
      // fetching
      sendRawLoaded: sendParent((context) => ({ type: 'RAWLOADED', frame: context.loadingFrame, channel: context.channel })), 
      saveFrame: assign({
        frames: (context, event) => ({...context.frames, [context.loadingFrame]: event.data}),
      }),
      useFrame: assign({
        frame: (context, event) => event.frame,
        rawImage: (context, event) => context.frames[event.frame],
      }),
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
      // image settings
      toggleInvert: assign({ invert: (context) => !context.invert }),
      toggleGrayscale: assign({ grayscale: (context) => !context.grayscale }),
      setBrightness: assign({ brightness: (_, event) => Math.min(1, Math.max(-1, event.brightness)) }),
      setContrast: assign({ contrast: (_, event) => Math.min(1, Math.max(-1, event.contrast)) }),
    }
  }
);

export default createChannelMachine;
