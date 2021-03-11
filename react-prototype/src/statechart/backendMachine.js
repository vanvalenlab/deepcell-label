import { Machine, assign, sendParent } from 'xstate';

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
          EDIT: 'edit',
          UNDO: 'undo',
          REDO: 'redo',
          SETFRAME: 'setFrame',
          TOGGLERGB: 'toggleRGB',
        },
      },
      edit: {
        invoke: {
          id: 'edit',
          src: 'edit',
          onDone: {
            target: 'loaded',
            actions: [
              assign({ data: (_, event) => event.data }),
            ],
          },
          onError: {
            target: 'error',
            actions: assign({ error: (_, event) => event.error }),
          }
        }
      },
      undo: {
        invoke: {
          id: 'undo',
          src: 'undo',
          onDone: {
            target: 'loaded',
            actions: assign({ data: (_, event) => event.data }),
          },
          onError: {
            target: 'error',
            actions: assign({ error: (_, event) => event.error }),
          }
        },
      },
      redo: {
        invoke: {
          id: 'redo',
          src: 'redo',
          onDone: {
            target: 'loaded',
            actions: assign({ data: (_, event) => event.data }),
          },
          onError: {
            target: 'error',
            actions: assign({ error: (_, event) => event.error }),
          }
        },
      },
      setFrame: {
        invoke: {
          id: 'setFrame',
          src: 'setFrame',
          onDone: {
            target: 'loaded',
            actions: assign({ data: (_, event) => event.data }),
          },
          onError: {
            target: 'error',
            actions: assign({ error: (_, event) => event.error }),
          }
        },
      },
      toggleRGB: {
        invoke: {
          id: 'toggleRGB',
          src: 'toggleRGB',
          onDone: {
            target: 'loaded',
            actions: assign({ data: (_, event) => event.data }),
          },
          onError: {
            target: 'error',
            actions: [(_, event) => console.log(event), assign({ error: (_, event) => event.error })],
          }
        },
      },
      loaded: {
        on: {
          '': {
            target: 'idle',
            actions: ['handlePayload', sendParent('LOADED')]
          }
        }
      },
      error: {
        on: {
          '': {
            target: 'idle',
            actions: [(context) => console.log(context.error), 'logError', sendParent('ERROR')]
          }
        }
      }
    }
  },
  {
    actions: {
      logError: (context) => console.log(context.error),
      handlePayload: (context) => window.model.handlePayload(context.data),
    },
    services: {
      edit: (context, event) => fetch(
        `${document.location.origin}/api/edit/${window.model.projectID}/${event.action}`,
        { method: 'POST', body: new URLSearchParams(event.args) },
      ).then(response => response.json()),
      undo: () => fetch(
        `${document.location.origin}/api/undo/${window.model.projectID}`,
        { method: 'POST' },
      ).then(response => response.json()),
      redo: () => fetch(
        `${document.location.origin}/api/redo/${window.model.projectID}`,
        { method: 'POST' },
      ).then(response => response.json()),
      setFrame: (context, event) => {
        const promise = fetch(
          `${document.location.origin}/api/changedisplay/${window.model.projectID}/${event.dimension}/${event.value}`,
          { method: 'POST' },
        );
        promise.then(() => { window.model[event.dimension] = event.value });
        return promise.then(response => response.json());
      },
      toggleRGB: (context, event) => {
        const promise = fetch(
          `${document.location.origin}/api/rgb/${window.model.projectID}/${!window.model.rgb}`,
          { method: 'POST' },
        );
        promise.then(() => { window.model.rgb = !window.model.rgb });
        return promise.then(response => response.json());
      },
    }
  }
);

export default backendMachine;
