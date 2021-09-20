import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createLabeledMachine from './labeled/labeledMachine';
import createRawMachine from './raw/rawMachine';

const { pure, respond } = actions;

const createImageMachine = ({ projectId }) =>
  Machine(
    {
      id: 'image',
      context: {
        projectId,
        frame: 0,
        numFrames: 1,
        numFeatures: 1,
        numChannels: 1,
        rawRef: null,
        labeledRef: null,
      },
      initial: 'loading',
      states: {
        loading: {
          on: {
            PROJECT: { target: 'setUpActors' },
          },
        },
        setUpActors: {
          entry: 'spawnActors',
          always: { target: 'setUpUndo' },
        },
        setUpUndo: {
          entry: 'addActorsToUndo',
          always: { target: 'idle' },
        },
        idle: {
          on: {
            SET_FRAME: [{ cond: 'newFrame', actions: 'setFrame' }],
          },
        },
      },
      on: {
        // send events to children
        EDITED: { actions: forwardTo('labeled') },
        TOGGLE_COLOR_MODE: { actions: forwardTo('raw') },
        // send events to parent
        // LABELED_ARRAY: { actions: 'forwardToParent' },
        // LABELS: { actions: 'forwardToParent' },
        // FEATURE: { actions: ['setFeature', 'forwardToParent'] },
        // CHANNEL: { actions: ['setChannel', 'forwardToParent'] },
        GRAYSCALE: { actions: 'forwardToParent' },
        COLOR: { actions: 'forwardToParent' },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
      },
    },
    {
      guards: {
        newFrame: (context, event) => context.frame !== event.frame,
      },
      actions: {
        forwardToParent: sendParent((_, event) => event),
        // create child actors to fetch raw & labeled data
        spawnActors: assign({
          numFrames: (_, { numFrames }) => numFrames,
          rawRef: ({ projectId }, { numFrames, numChannels }) =>
            spawn(createRawMachine(projectId, numChannels, numFrames), 'raw'),
          labeledRef: ({ projectId }, { numFrames, numFeatures }) =>
            spawn(createLabeledMachine(projectId, numFeatures, numFrames), 'labeled'),
        }),
        addActorsToUndo: pure(context => {
          const { rawRef, labeledRef } = context;
          return [
            sendParent({ type: 'ADD_ACTOR', actor: labeledRef }),
            sendParent({ type: 'ADD_ACTOR', actor: rawRef }),
          ];
        }),
        setFrame: assign({ frame: (_, { frame }) => frame }),
        save: respond(({ frame }) => ({ type: 'RESTORE', frame })),
        restore: pure((_, { frame }) => {
          return [send({ type: 'SET_FRAME', frame }), respond('RESTORED')];
        }),
      },
    }
  );

export default createImageMachine;
