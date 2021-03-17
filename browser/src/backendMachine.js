import { Machine, assign, sendParent } from 'xstate';

/** Returns a Promise for a DeepCell Label API call based on the event. */
function getApiService(context, event) {
  switch (event.type) {
    case 'EDIT':
      return edit(context, event);
    case 'UNDO':
      return undo(context, event);
    case 'REDO':
      return redo(context, event);
    case 'SETFRAME':
      return setFrame(context, event);
    case 'TOGGLERGB':
      return toggleRGB(context, event);
  }
}

function edit(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/edit/${window.model.projectID}/${event.action}`,
    { method: 'POST', body: new URLSearchParams(event.args) });
}

function undo(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/undo/${window.model.projectID}`,
    { method: 'POST' });
}

function redo(context, event) {
  return fetchErrorWrapper(
    `${document.location.origin}/api/redo/${window.model.projectID}`,
    { method: 'POST' });
}

function setFrame(context, event) {
  const promise = fetchErrorWrapper(
    `${document.location.origin}/api/changedisplay/${window.model.projectID}/${event.dimension}/${event.value}`,
    { method: 'POST' },
  );
  // update index after receiving response
  promise.then(() => { window.model[event.dimension] = event.value });
  return promise;
}

function toggleRGB(context, event) {
  const promise = fetchErrorWrapper(
    `${document.location.origin}/api/rgb/${window.model.projectID}/${!window.model.rgb}`,
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

const backendMachine = Machine(
  {
    id: 'backend',
    initial: 'idle',
    context: {
      data: null,
      error: null,
    },
    states: {
      idle: {
        exit: sendParent('LOADING'),
        on: {
          EDIT: 'loading',
          UNDO: 'loading',
          REDO: 'loading',
          SETFRAME: 'loading',
          TOGGLERGB: 'loading',
        },
      },
      loading: {
        invoke: {
          id: 'labelAPI',
          src: getApiService,
          onDone: 'loaded',
          onError: 'error',
        }
      },
      loaded: {
        always: {
          target: 'idle',
          actions: ['handlePayload', sendParent('LOADED')],
        }
      },
      error: {
        always: {
          target: 'idle',
          actions: sendParent((_, event) => ({ type: 'ERROR', error: event.data.error })),
        }
      }
    }
  },
  {
    actions: {
      saveError: assign({ error: (_, event) => event.data.error }),
      saveData: assign({ data: (_, event) => event.data }),
      handlePayload: (_, event) => window.model.handlePayload(event.data),
    },
  }
);

export default backendMachine;
