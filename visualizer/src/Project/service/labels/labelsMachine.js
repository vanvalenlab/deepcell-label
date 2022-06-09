/** Manages spots labels. */

import { assign, Machine } from 'xstate';
import createArraysMachine from './arraysMachine';
import createCellsMachine from './cellsMachine';
import createLineageMachine from './lineageMachine';
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
          actors.lineageRef = spawn(createLineageMachine(context), 'lineage');
          actors.spotsRef = spawn(createSpotsMachine(context), 'spots');
          return actors;
        }),
      },
    }
  );
}

export default createLabelsMachine;
