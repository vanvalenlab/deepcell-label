import { assign, Machine } from 'xstate';

function validate(context, event) {
  const { projectId, feature } = context;
  const uploadRoute = `${document.location.origin}/api/validate/${projectId}/${feature}`;
  const options = { method: 'GET' };
  return fetch(uploadRoute, options).then(checkResponseCode);
}

function checkResponseCode(response) {
  return response.json().then(json => {
    return response.ok ? json : Promise.reject(json);
  });
}

function createValidateMachine({ projectId, feature }) {
  return Machine(
    {
      id: 'validate',
      context: {
        projectId,
        feature,
        warnings: [],
      },
      on: {
        VALIDATE_LABELS: 'validating',
      },
      initial: 'idle',
      states: {
        idle: {},
        validating: {
          invoke: {
            src: validate,
            onDone: {
              target: 'idle',
              actions: [(c, e) => console.log(e), 'setWarnings'],
            },
            onError: 'idle',
          },
        },
      },
    },
    {
      services: {},
      guards: {},
      actions: {
        setWarnings: assign({
          warnings: (_, { data }) => data,
        }),
      },
    }
  );
}

export default createValidateMachine;
