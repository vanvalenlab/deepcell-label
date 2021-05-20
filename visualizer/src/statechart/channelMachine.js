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

const CHANNEL_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00'];

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
      range: [0, 255],
      color: channel <= 6 ? CHANNEL_COLORS[channel] : '#000000',
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
        actions: assign({ loadingFrame: (_, { frame }) => frame }),
      },
      FRAME: { actions: 'useFrame' },
      // CHANNEL: { actions: 'useFrame' },
      // image settings
      SETBRIGHTNESS: { actions: 'setBrightness' },
      SETCONTRAST: { actions: 'setContrast' },
      SETRANGE: { actions: 'setRange' },
    }
  },
  {
    guards: {
      loadedFrame: ({ frames, loadingFrame }) => loadingFrame in frames,
      newFrame: (context, event) => context.frame !== event.frame,
      canPreload: ({ frames, numFrames }) => Object.keys(frames).length !== numFrames,
    },
    actions: {
      // fetching
      sendRawLoaded: sendParent(({ loadingFrame, channel }) => ({ type: 'RAWLOADED', frame: loadingFrame, channel })), 
      saveFrame: assign({
        frames: ({ frames , loadingFrame }, { data }) => ({...frames, [loadingFrame]: data}),
      }),
      useFrame: assign({
        frame: (_, { frame }) => frame,
        rawImage: ({ frames }, { frame }) => frames[frame],
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
      setBrightness: assign({ brightness: (_, { brightness }) => Math.min(1, Math.max(-1, brightness)) }),
      setContrast: assign({ contrast: (_, { contrast }) => Math.min(1, Math.max(-1, contrast)) }),
      setRange: assign({
        range: (_, { range }) => [
          Math.max(0, Math.min(255, range[0])),
          Math.max(0, Math.min(255, range[1])),
        ]
      }),
    }
  }
);

export default createChannelMachine;
