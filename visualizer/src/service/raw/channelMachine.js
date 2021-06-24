import quickselect from 'quickselect';
import { assign, Machine, sendParent } from 'xstate';

function fetchRaw(context) {
  const { projectId, channel, loadingFrame: frame } = context;
  const pathToRaw = `/api/raw/${projectId}/${channel}/${frame}`;

  return (
    fetch(pathToRaw)
      // .then(validateResponse)
      .then(readResponseAsBlob)
      .then(makeImageURL)
      .then(showImage)
  );
  // .catch(logError);
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

const createChannelMachine = (projectId, channel, numFrames) =>
  Machine(
    {
      id: `channel${channel}`,
      context: {
        projectId,
        channel,
        numFrames,
        frame: 0,
        loadingFrame: null,
        frames: {},
        rawImage: new Image(),
        // layer settings for grayscale mode
        invert: false,
        range: [0, 255],
        brightness: 0,
        contrast: 0,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            PRELOAD: {
              cond: 'canPreload',
              target: 'loading',
              actions: 'loadNextFrame',
            },
          },
        },
        checkLoaded: {
          always: [
            { cond: 'loadedFrame', target: 'idle', actions: 'sendRawLoaded' },
            { target: 'loading' },
          ],
        },
        loading: {
          invoke: {
            src: fetchRaw,
            onDone: { target: 'idle', actions: ['saveFrame', 'sendRawLoaded'] },
            onError: {
              target: 'idle',
              actions: (context, event) => console.log(event),
            },
          },
        },
      },
      on: {
        // fetching
        LOAD_FRAME: {
          target: 'checkLoaded',
          actions: assign({ loadingFrame: (_, { frame }) => frame }),
        },
        FRAME: { actions: 'useFrame' },
        TOGGLE_INVERT: { actions: 'toggleInvert' },
        SET_RANGE: { actions: 'setRange' },
        SET_BRIGHTNESS: { actions: 'setBrightness' },
        SET_CONTRAST: { actions: 'setContrast' },
      },
    },
    {
      guards: {
        loadedFrame: ({ frames, loadingFrame }) => loadingFrame in frames,
        newFrame: (context, event) => context.frame !== event.frame,
        canPreload: ({ frames, numFrames }) =>
          Object.keys(frames).length !== numFrames,
        emptyFrame: ({ rawImage }) => rawImage.src === '',
      },
      actions: {
        // fetching
        sendRawLoaded: sendParent(({ loadingFrame, channel }) => ({
          type: 'RAW_LOADED',
          frame: loadingFrame,
          channel,
        })),
        saveFrame: assign({
          frames: ({ frames, loadingFrame }, { data }) => ({
            ...frames,
            [loadingFrame]: data,
          }),
        }),
        useFrame: assign({
          frame: (_, { frame }) => frame,
          rawImage: ({ frames }, { frame }) => frames[frame],
        }),
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
        toggleInvert: assign({ invert: ({ invert }) => !invert }),
        setRange: assign({
          range: (_, { range }) => [
            Math.max(0, Math.min(255, range[0])),
            Math.max(0, Math.min(255, range[1])),
          ],
        }),
        setBrightness: assign({
          brightness: (_, { brightness }) =>
            Math.max(-1, Math.min(1, brightness)),
        }),
        setContrast: assign({
          contrast: (_, { contrast }) => Math.max(-1, Math.min(1, contrast)),
        }),
        setAutoRange: assign({
          range: ({ rawImage: img }) => {
            // modified from https://github.com/hms-dbmi/viv
            // get ImageData from rawImage
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const array = imageData.data
              .filter((v, i) => i % 4 === 1) // take only the first channel
              .filter(v => v > 0); // ignore the background
            const cutoffPercentile = 0.01;
            const topCutoffLocation = Math.floor(
              array.length * (1 - cutoffPercentile)
            );
            const bottomCutoffLocation = Math.floor(
              array.length * cutoffPercentile
            );
            quickselect(array, topCutoffLocation);
            quickselect(array, bottomCutoffLocation, 0, topCutoffLocation);
            return [
              array[bottomCutoffLocation] || 0,
              array[topCutoffLocation] || 255,
            ];
          },
        }),
      },
    }
  );

export default createChannelMachine;
