import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createChannelMachine from './channelMachine';
import createColorMachine from './colorMachine';

const { pure, respond } = actions;

const checkDisplay = {
  always: [{ cond: ({ isGrayscale }) => isGrayscale, target: 'grayscale' }, { target: 'color' }],
};

const color = {
  entry: [sendParent('COLOR'), assign({ isGrayscale: false })],
  on: { TOGGLE_COLOR_MODE: 'grayscale' },
};

const grayscale = {
  entry: [sendParent('GRAYSCALE'), assign({ isGrayscale: true })],
  on: {
    TOGGLE_COLOR_MODE: 'color',
    RESET: { actions: 'forwardToChannel' },
    CHANNEL: { actions: 'setChannel' },
  },
};

const createRawMachine = (projectId, numChannels, numFrames) =>
  Machine(
    {
      context: {
        projectId,
        numChannels,
        numFrames,
        channel: 0,
        channels: [], // channel machines
        channelNames: [],
        colorMode: null,
        isGrayscale: Number(numChannels) === 1,
      },
      entry: ['spawnColorModes', 'spawnChannels'],
      initial: 'checkDisplay',
      states: {
        checkDisplay,
        grayscale,
        color,
      },
      on: {
        TOGGLE_INVERT: { actions: 'forwardToChannel' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
        SET_FRAME: { actions: 'forwardToChannels' },
        SET_CHANNEL: { cond: 'differentChannel', actions: 'setChannel' },
      },
    },
    {
      guards: {
        differentChannel: (context, event) => context.channel !== event.channel,
      },
      actions: {
        setChannel: assign({ channel: (_, { channel }) => channel }),
        /** Creates a channel machines and names */
        spawnChannels: assign({
          channels: ({ numChannels }, event) => {
            const channels = [];
            for (let i = 0; i < numChannels; i++) {
              const channel = spawn(createChannelMachine(i), `channel${i}`);
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
          colorMode: context => spawn(createColorMachine(context), 'colorMode'),
        }),
        forwardToChannels: pure(({ channels }) => channels.map(channel => forwardTo(channel))),
        save: respond(({ channel, isGrayscale }) => ({ type: 'RESTORE', isGrayscale, channel })),
        restore: pure((context, event) =>
          context.isGrayscale === event.isGrayscale
            ? [send({ type: 'SET_CHANNEL', channel: event.channel })]
            : [
                send({ type: 'SET_CHANNEL', channel: event.channel }),
                send({ type: 'TOGGLE_COLOR_MODE' }),
              ]
        ),
      },
    }
  );

export default createRawMachine;
