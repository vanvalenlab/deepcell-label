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
  const editRoute = `${document.location.origin}/api/edit/${context.projectId}/${event.action}`;
  const options = { method: 'POST', body: new URLSearchParams(event.args) };
  return fetch(editRoute, options)
    .then(checkResponseCode);
}

function undo(context, event) {
  const undoRoute = `${document.location.origin}/api/undo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(undoRoute, options)
    .then(checkResponseCode);
}

function redo(context, event) {
  const redoRoute = `${document.location.origin}/api/redo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(redoRoute, options)
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
            actions: 'sendEdited',
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
      sendEdited: sendParent((_, event) => ({ type: 'EDITED', data: event.data })),
      sendError: sendParent((_, event) => ({ type: 'ERROR', error: event.data.error })),
    },
  }
);

export default createApiMachine;
