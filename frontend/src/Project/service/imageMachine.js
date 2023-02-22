/** Manages the controls the image, such as what time to show.
 *
 * Spawns rawMachine and labeledMachine to control the raw and labeled images.
 */

import { actions, assign, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from './eventBus';
import createLabeledMachine from './labeledMachine';
import createRawMachine from './raw/rawMachine';

const { pure, respond } = actions;

const createImageMachine = ({ projectId, eventBuses, undoRef }) =>
  Machine(
    {
      id: 'image',
      entry: [send('REGISTER_UI', { to: undoRef }), 'spawnActors'],
      invoke: [
        { id: 'eventBus', src: fromEventBus('image', () => eventBuses.image) },
        { src: fromEventBus('labeled', () => eventBuses.load, 'DIMENSIONS') },
      ],
      context: {
        projectId,
        duration: 1,
        numFeatures: 1,
        numChannels: 1,
        t: 0,
        rawRef: null,
        labeledRef: null,
        eventBuses,
        undoRef,
      },
      on: {
        DIMENSIONS: { actions: 'setDimensions' },
        SET_T: { actions: ['setT', 'sendToEventBus'] },
        SAVE: { actions: 'save' },
        RESTORE: { actions: 'restore' },
        // Needed to rerender canvas
        ADD_LAYER: { actions: sendParent((c, e) => e) },
        FETCH_LAYERS: { actions: sendParent((c, e) => e) },
        REMOVE_LAYER: { actions: sendParent((c, e) => e) },
      },
    },
    {
      actions: {
        setDimensions: assign({
          duration: (context, event) => event.duration,
          numFeatures: (context, event) => event.numFeatures,
          numChannels: (context, event) => event.numChannels,
        }),
        setT: assign({ t: (_, { t }) => t }),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
        spawnActors: assign((context) => ({
          rawRef: spawn(createRawMachine(context), 'raw'),
          labeledRef: spawn(createLabeledMachine(context), 'labeled'),
        })),
        save: respond(({ t }) => ({ type: 'RESTORE', t })),
        restore: pure((_, { t }) => {
          return [send({ type: 'SET_T', t }), respond('RESTORED')];
        }),
      },
    }
  );

export default createImageMachine;
