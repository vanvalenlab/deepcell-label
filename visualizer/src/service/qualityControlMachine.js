/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, Machine, spawn } from 'xstate';
import createProjectMachine from './projectMachine';

// TODO: refactor bucket
function createQualityControlMachine(projectIds, bucket) {
  return Machine(
    {
      id: 'qualityControl',
      context: {
        projectIds,
        bucket,
        projectId: projectIds[0],
        projects: {},
        judgments: {},
      },
      entry: 'spawnProjects',
      initial: 'idle',
      states: {
        idle: {},
      },
      on: {},
    },
    {
      actions: {
        spawnProjects: assign({
          projects: ({ projectIds, bucket }) =>
            Object.fromEntries(
              projectIds.map(projectId => [
                projectId,
                // TODO: refactor buckets
                spawn(createProjectMachine(projectId, bucket)),
              ])
            ),
        }),
      },
    }
  );
}

export default createQualityControlMachine;
