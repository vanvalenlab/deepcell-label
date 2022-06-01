/** Manages spots labels. */

import { assign, Machine } from 'xstate';
import createArraysMachine from './arraysMachine';
import createCellsMachine from './cellsMachine';
import createDivisionsMachine from './lineageMachine';
import createSpotsMachine from './spotsMachine';

function createLabelsMachine({ undoRef }) {
  return Machine(
    {
      id: 'spots',
      context: { undoRef },
      entry: 'spawnActors',
    },
    {
      actions: {
        spawnActors: assign((context) => {
          const actors = {};
          actors.arraysRef = spawn(createArraysMachine(context), 'arrays');
          actors.cellsRef = spawn(createCellsMachine(context), 'cells');
          actors.divisionsRef = spawn(createDivisionsMachine(context), 'divisions');
          actors.spotsRef = spawn(createSpotsMachine(context), 'spots');
          return actors;
        }),
      },
    }
  );
}

export default createLabelsMachine;
