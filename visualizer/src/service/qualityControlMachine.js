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
      on: {
        SET_PROJECT: { actions: 'setProject' },
        ACCEPT: { actions: 'accept' },
        REJECT: { actions: 'reject' },
      },
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
        setProject: assign({
          projectId: (_, { projectId }) => projectId,
        }),
        accept: assign({
          judgments: ({ judgments, projectId }) => {
            judgments[projectId] = true;
            return judgments;
          },
        }),
        reject: assign({
          judgments: ({ judgments, projectId }) => {
            judgments[projectId] = false;
            return judgments;
          },
        }),
      },
    }
  );
}

export default createQualityControlMachine;
