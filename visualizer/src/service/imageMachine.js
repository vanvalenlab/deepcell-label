import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from './eventBus';
import createLabeledMachine from './labeled/labeledMachine';
import createRawMachine from './raw/rawMachine';

const { pure, respond } = actions;

const loadFrameState = {
  entry: ['loadRaw', 'loadLabeled'],
  initial: 'loading',
  states: {
    idle: {},
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

const createImageMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'image',
      invoke: [
        { id: 'eventBus', src: fromEventBus('image', () => eventBuses.image) },
        { id: 'undo', src: fromEventBus('image', () => eventBuses.undo) },
      ],
      context: {
        projectId,
        frame: 0,
        loadingFrame: 0,
        numFrames: 1,
        numFeatures: 1,
        numChannels: 1,
        rawRef: null,
        labeledRef: null,
        eventBuses,
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
        FEATURE: { actions: ['setFeature', 'sendToEventBus'] },
        CHANNEL: { actions: ['setChannel', 'sendToEventBus'] },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
        ADD_LAYER: { actions: sendParent('ADD_LAYER') },
      },
    },
    {
      guards: {
        newLoadingFrame: (context, event) => context.loadingFrame !== event.frame,
        isLoaded: ({ rawLoaded, labeledLoaded }) => rawLoaded && labeledLoaded,
      },
      actions: {
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
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
        spawnActors: assign((context) => ({
          rawRef: spawn(createRawMachine(context), 'raw'),
          labeledRef: spawn(createLabeledMachine(context), 'labeled'),
        })),
        addActorsToUndo: pure((context) => {
          const { rawRef, labeledRef } = context;
          return [
            send({ type: 'ADD_ACTOR', actor: labeledRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: rawRef }, { to: 'undo' }),
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
            send(frameEvent, { to: 'eventBus' }),
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
