import { actions, assign, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from './eventBus';
import createLabeledMachine from './labeledMachine';
import createRawMachine from './raw/rawMachine';

const { pure, respond } = actions;

const createImageMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'image',
      invoke: [
        { id: 'eventBus', src: fromEventBus('image', () => eventBuses.image) },
        { id: 'undo', src: fromEventBus('image', () => eventBuses.undo) },
        { src: fromEventBus('labeled', () => eventBuses.load) },
      ],
      context: {
        projectId,
        numFrames: 1,
        numFeatures: 1,
        numChannels: 1,
        frame: 0,
        rawRef: null,
        labeledRef: null,
        eventBuses,
      },
      initial: 'setUpActors',
      states: {
        setUpActors: {
          always: { target: 'setUpUndo', actions: 'spawnActors' },
        },
        setUpUndo: {
          always: { target: 'idle', actions: 'addActorsToUndo' },
        },
        idle: {
          on: {
            DIMENSIONS: { actions: 'setDimensions' },
            SET_FRAME: { actions: ['setFrame', 'sendToEventBus'] },
            SAVE: { actions: 'save' },
            RESTORE: { actions: 'restore' },
            // Needed to rerender canvas
            ADD_LAYER: { actions: sendParent((c, e) => e) },
            REMOVE_LAYER: { actions: sendParent((c, e) => e) },
          },
        },
      },
    },
    {
      actions: {
        setDimensions: assign({
          numFrames: (context, event) => event.numFrames,
          numFeatures: (context, event) => event.numFeatures,
          numChannels: (context, event) => event.numChannels,
        }),
        setFrame: assign({ frame: (_, { frame }) => frame }),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
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
        save: respond(({ frame }) => ({ type: 'RESTORE', frame })),
        restore: pure((_, { frame }) => {
          return [send({ type: 'SET_FRAME', frame }), respond('RESTORED')];
        }),
      },
    }
  );

export default createImageMachine;
