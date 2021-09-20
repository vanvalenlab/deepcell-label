import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createChannelMachine from './channelMachine';
import createColorMachine from './colorMachine';
import createGrayscaleMachine from './grayscaleMachine';

const { pure, respond } = actions;

function fetchRaw(context) {
  const { projectId, numChannels, numFrames } = context;
  const pathToRaw = `/dev/raw/${projectId}`;

  const splitBuffer = buffer => {
    const length = buffer.byteLength / numChannels / numFrames / 4; // 4 bytes per element in Float32Array
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const array = new Float32Array(buffer, (i * numFrames + j) * length * 4, length);
        // const blob = new Blob([array], {type: 'application/octet-stream'});
        frames.push(array);
      }
      channels.push(frames);
    }

    return channels;
  };

  return fetch(pathToRaw)
    .then(response => response.arrayBuffer())
    .then(splitBuffer);
}

const colorState = {
  entry: [sendParent('COLOR'), assign({ isGrayscale: false })],
  on: { TOGGLE_COLOR_MODE: 'grayscale' },
};

const grayscaleState = {
  entry: [sendParent('GRAYSCALE'), assign({ isGrayscale: true })],
  on: {
    TOGGLE_COLOR_MODE: 'color',
    RESET: { actions: 'forwardToChannel' },
    CHANNEL: { actions: 'setChannel' },
  },
};

const displayState = {
  initial: 'initial',
  states: {
    initial: {
      always: [
        { cond: ({ isGrayscale }) => isGrayscale, target: 'grayscale' },
        { target: 'color' },
      ],
    },
    grayscale: grayscaleState,
    color: colorState,
  },
};

const createRawMachine = (projectId, numChannels, numFrames) =>
  Machine(
    {
      context: {
        projectId,
        numChannels,
        numFrames,
        channels: [], // channel machines
        channelNames: [],
        colorMode: null,
        grayscaleMode: null,
        isGrayscale: Number(numChannels) === 1,
      },
      entry: 'spawnColorModes',
      initial: 'loading',
      states: {
        loading: {
          invoke: {
            src: fetchRaw,
            onDone: { target: 'idle', actions: 'spawnChannels' },
          },
        },
        idle: displayState,
      },
      on: {
        TOGGLE_INVERT: { actions: 'forwardToChannel' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
        SET_FRAME: { actions: 'forwardToChannels' },
        // CHANNEL: { actions: sendParent((c, e) => e) },
        SET_CHANNEL: { actions: 'forwardToDisplay' },
      },
    },
    {
      actions: {
        /** Creates a channel machines and names */
        spawnChannels: assign({
          channels: ({ numChannels }, event) => {
            const channels = [];
            for (let i = 0; i < numChannels; i++) {
              const frames = event.data[i];
              const channel = spawn(createChannelMachine(i, frames), `channel${i}`);
              channels.push(channel);
            }
            return channels;
          },
          channelNames: ({ numChannels }) => {
            const names = [];
            for (let i = 0; i < numChannels; i++) {
              names.push(`channel ${i}`);
            }
            return names;
          },
        }),
        spawnColorModes: assign({
          grayscaleMode: context => spawn(createGrayscaleMachine(context), 'grayscaleMode'),
          colorMode: context => spawn(createColorMachine(context), 'colorMode'),
        }),
        forwardToDisplay: forwardTo(({ isGrayscale }) =>
          isGrayscale ? 'grayscaleMode' : 'colorMode'
        ),
        forwardToChannels: pure(({ channels }) => channels.map(channel => forwardTo(channel))),
        save: respond(({ channel, isGrayscale }) => ({ type: 'RESTORE', isGrayscale })),
        restore: pure((context, event) =>
          context.isGrayscale === event.isGrayscale ? [] : [send({ type: 'TOGGLE_COLOR_MODE' })]
        ),
      },
    }
  );

export default createRawMachine;
