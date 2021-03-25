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
    case 'SETFRAME':
      return setFrame(context, event);
    case 'TOGGLERGB':
      return toggleRGB(context, event);
  }
}

function loadProject(context, event) {
  return fetchErrorWrapper(`${document.location.origin}/api/project/${context.projectID}`);
}

function edit(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/edit/${context.projectID}/${event.action}`,
    { method: 'POST', body: new URLSearchParams(event.args) });
}

function undo(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/undo/${context.projectID}`,
    { method: 'POST' });
}

function redo(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/redo/${context.projectID}`,
    { method: 'POST' });
}

function setFrame(context, event) {
  const promise = fetchErrorWrapper(
    `${document.location.origin}/api/changedisplay/${context.projectID}/${event.dimension}/${event.value}`,
    { method: 'POST' },
  );
  // update index after receiving response
  promise.then(() => { window.model[event.dimension] = event.value });
  return promise;
}

function toggleRGB(context, event) {
  const promise = fetchErrorWrapper(
    `${document.location.origin}/api/rgb/${context.projectID}/${!window.model.rgb}`,
    { method: 'POST' },
  );
  // update RGB flag after receiving response
  promise.then(() => { window.model.rgb = !window.model.rgb });
  return promise;
}

/** Wraps fetch so that response codes other than 200-299 are rejected. */
function fetchErrorWrapper(url, options) {
  return fetch(url, options).then(response => {
    return response.json().then(json => {
      return response.ok ? json : Promise.reject(json);
    });
  });
}

const apiMachine = Machine(
  {
    id: 'backend',
    initial: 'firstLoad',
    context: {
      projectID: '',
      data: null,
      error: null,
    },
    states: {
      firstLoad: {
        entry: sendParent('LOADING'),
        invoke: {
          id: 'load-project',
          src: loadProject,
          onDone: {
            target: 'idle',
            actions: 'sendProjectLoaded',
          },
          onError: {
            target: 'idle',
            actions: 'sendError',
          },
        }
      },
      idle: {
        on: {
          EDIT: 'loading',
          BACKENDUNDO: 'loading',
          BACKENDREDO: 'loading',
          SETFRAME: 'loading',
          TOGGLERGB: 'loading',
        },
      },
      loading: {
        entry: 'sendLoading',
        invoke: {
          id: 'labelAPI',
          src: getApiService,
          onDone: {
            target: 'idle',
            actions: 'sendLoaded',
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
      sendProjectLoaded: sendParent((_, event) => ({ type: 'PROJECTLOADED', project: event.data })),
      sendLoading: sendParent('LOADING'),
      sendLoaded: sendParent((_, event) => ({ type: 'LOADED', project: event.data })),
      sendError: sendParent((_, event) => ({ type: 'ERROR', error: event.data.error })),
    },
  }
);

export default apiMachine;
