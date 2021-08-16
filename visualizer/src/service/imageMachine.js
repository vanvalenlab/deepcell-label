import { bind, unbind } from 'mousetrap';
import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createLabeledMachine from './labeled/labeledMachine';
import createRawMachine from './raw/rawMachine';

const { pure, respond } = actions;

const loadFrameState = {
  entry: ['loadRaw', 'loadLabeled'],
  initial: 'loading',
  states: {
    idle: {
      invoke: {
        src: 'listenForFrameHotkeys',
      },
    },
    loading: {
      on: {
        RAW_LOADED: {
          target: 'checkLoaded',
          actions: assign({ rawLoaded: true }),
        },
        LABELED_LOADED: {
          target: 'checkLoaded',
          actions: assign({ labeledLoaded: true }),
        },
        // wait until the new channel or feature has loaded
        CHANNEL: { actions: assign({ rawLoaded: false }) },
        FEATURE: { actions: assign({ labeledLoaded: false }) },
      },
    },
    checkLoaded: {
      always: [{ cond: 'isLoaded', target: 'idle', actions: 'useFrame' }, { target: 'loading' }],
    },
  },
  on: {
    LOAD_FRAME: {
      target: '.loading',
      cond: 'newLoadingFrame',
      actions: ['assignLoadingFrame', 'loadRaw', 'loadLabeled'],
    },
  },
};

const createImageMachine = ({ projectId }) =>
  Machine(
    {
      id: 'image',
      context: {
        projectId,
        frame: 0,
        loadingFrame: 0,
        numFrames: 1,
        numFeatures: 1,
        numChannels: 1,
        rawRef: null,
        labeledRef: null,
      },
      initial: 'waitForProject',
      states: {
        waitForProject: {
          on: {
            PROJECT: { target: 'setUpActors', actions: 'handleProject' },
          },
        },
        setUpActors: {
          always: { target: 'setUpUndo', actions: 'spawnActors' },
        },
        setUpUndo: {
          always: { target: 'loadFrame', actions: 'addActorsToUndo' },
        },
        loadFrame: loadFrameState,
      },
      on: {
        // send events to children
        EDITED: { actions: forwardTo('labeled') },
        TOGGLE_COLOR_MODE: { actions: forwardTo('raw') },
        // send events to parent
        LABELED_ARRAY: { actions: 'forwardToParent' },
        LABELS: { actions: 'forwardToParent' },
        FEATURE: { actions: ['setFeature', 'forwardToParent'] },
        CHANNEL: { actions: ['setChannel', 'forwardToParent'] },
        GRAYSCALE: { actions: 'forwardToParent' },
        COLOR: { actions: 'forwardToParent' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
      },
    },
    {
      services: {
        listenForFrameHotkeys:
          ({ frame, numFrames }) =>
          send => {
            const prevFrame = Math.max(0, frame - 1);
            const nextFrame = Math.min(frame + 1, numFrames - 1);
            bind('a', () => send({ type: 'LOAD_FRAME', frame: prevFrame }));
            bind('d', () => send({ type: 'LOAD_FRAME', frame: nextFrame }));
            return () => {
              unbind('a');
              unbind('d');
            };
          },
      },
      guards: {
        newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
        isLoaded: ({ rawLoaded, labeledLoaded }) => rawLoaded && labeledLoaded,
      },
      actions: {
        forwardToParent: sendParent((_, event) => event),
        handleProject: assign(
          (_, { frame, feature, channel, numFrames, numFeatures, numChannels }) => {
            return {
              frame,
              feature,
              channel,
              numFrames,
              numFeatures,
              numChannels,
              loadingFrame: frame,
            };
          }
        ),
        // create child actors to fetch raw & labeled data
        spawnActors: assign({
          rawRef: ({ projectId, numChannels, numFrames }) =>
            spawn(createRawMachine(projectId, numChannels, numFrames), 'raw'),
          labeledRef: ({ projectId, numFeatures, numFrames }) =>
            spawn(createLabeledMachine(projectId, numFeatures, numFrames), 'labeled'),
        }),
        addActorsToUndo: pure(context => {
          const { rawRef, labeledRef } = context;
          return [
            sendParent({ type: 'ADD_ACTOR', actor: labeledRef }),
            sendParent({ type: 'ADD_ACTOR', actor: rawRef }),
          ];
        }),
        loadLabeled: send(({ loadingFrame }) => ({ type: 'LOAD_FRAME', frame: loadingFrame }), {
          to: 'labeled',
        }),
        loadRaw: send(({ loadingFrame }) => ({ type: 'LOAD_FRAME', frame: loadingFrame }), {
          to: 'raw',
        }),
        assignLoadingFrame: assign({
          loadingFrame: (_, { frame }) => frame,
          rawLoaded: false,
          labeledLoaded: false,
        }),
        useFrame: pure(({ loadingFrame }) => {
          const frameEvent = { type: 'FRAME', frame: loadingFrame };
          return [
            assign({ frame: loadingFrame }),
            send(frameEvent, { to: 'raw' }),
            send(frameEvent, { to: 'labeled' }),
            sendParent(frameEvent),
          ];
        }),
        setFeature: assign({ feature: (_, { feature }) => ({ feature }) }),
        setChannel: assign({ channel: (_, { channel }) => ({ channel }) }),
        save: respond(({ frame }) => ({ type: 'RESTORE', frame })),
        restore: pure((_, { frame }) => {
          return [send({ type: 'LOAD_FRAME', frame }), respond('RESTORED')];
        }),
      },
    }
  );

export default createImageMachine;
