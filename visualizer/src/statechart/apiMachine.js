import { Machine, assign, sendParent } from 'xstate';

/** Returns a Promise for a DeepCell Label API call based on the event. */
function getApiService(context, event) {
  switch (event.type) {
    case 'EDIT':
      return edit(context, event);
    case 'BACKENDUNDO':
      return undo(context, event);
    case 'BACKENDREDO':
      return redo(context, event);
  }
}

function edit(context, event) {
  const editLocation = `${document.location.origin}/api/edit/${context.projectId}/${event.action}`;
  const options = { method: 'POST', body: new URLSearchParams(event.args) };
  return fetch(editLocation, options)
    .then(checkResponseCode);
}

function undo(context, event) {
  const undoLocation = `${document.location.origin}/api/undo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(undoLocation, options)
    .then(checkResponseCode);
}

function redo(context, event) {
  const redoLocation = `${document.location.origin}/api/redo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(redoLocation, options)
    .then(checkResponseCode);
}

function checkResponseCode(response) {
  return response.json().then(json => {
    return response.ok ? json : Promise.reject(json);
  });
}

const createApiMachine = ({ projectId }) => Machine(
  {
    id: 'api',
    context: {
      projectId,
      data: null,
      error: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          EDIT: 'loading',
          BACKENDUNDO: 'loading',
          BACKENDREDO: 'loading',
        },
      },
      loading: {
        invoke: {
          id: 'labelAPI',
          src: getApiService,
          onDone: {
            target: 'idle',
            actions: [
              'sendLoaded',
              'saveData',
            ],
          },
          onError: {
            target: 'idle',
            actions: 'sendError',
          },
        }
      },
    }
  },
  {
    actions: {
      saveData: assign({ data: (context, event) => event.data }),
      saveError: assign({ error: (context, event) => event.data.error }),
      sendLoaded: sendParent((_, event) => ({ type: 'LOADED', data: event.data })),
      sendError: sendParent((_, event) => ({ type: 'ERROR', error: event.data.error })),
    },
  }
);

export default createApiMachine;