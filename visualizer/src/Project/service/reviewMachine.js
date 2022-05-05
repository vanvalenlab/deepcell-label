/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, Machine, spawn } from 'xstate';
import createLoadMachine from './loadMachine';
import createProjectMachine from './projectMachine';

function createReviewMachine(projectIds) {
  return Machine(
    {
      id: 'review',
      context: {
        projectIds,
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
        ACCEPT: { actions: ['accept', 'nextProject'] },
        REJECT: { actions: ['reject', 'nextProject'] },
      },
    },
    {
      actions: {
        spawnProjects: assign({
          projects: ({ projectIds: ids }) =>
            Object.fromEntries(ids.map((id) => [id, spawn(createProjectMachine(id))])),
          loaders: ({ projectIds: ids }) =>
            Object.fromEntries(ids.map((id) => [id, spawn(createLoadMachine(id))])),
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
        nextProject: assign({
          projectId: ({ judgments, projectIds, projectId }) => {
            const index = projectIds.indexOf(projectId);
            const reordered = projectIds.slice(index + 1).concat(projectIds.slice(0, index));
            return reordered.find((id) => !(id in judgments)) || projectId;
          },
        }),
      },
    }
  );
}

export default createReviewMachine;
