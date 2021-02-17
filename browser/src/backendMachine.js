import { Machine, assign, sendParent } from 'xstate';

const getModel = () => window.model;

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
              // (_, event) => console.log(event),
              // (_, event) => console.log(event.data.json()),
              assign({ data: (_, event) => event.data }),
              (context) => console.log(context.data),
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
            actions: assign({ error: (_, event) => event.error }),
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
            actions: ['logError', sendParent('ERROR')]
          }
        }
      }
    }
  },
  {
    actions: {
      logError: (context) => console.log(context.error),
      handlePayload: (context) => getModel().handlePayload(context.data),
    },
    services: {
      edit: (context, event) => fetch(
        `${document.location.origin}/api/edit/${getModel().projectID}/${event.action}`,
        { method: 'POST', body: new URLSearchParams(event.args) },
      ).then(response => response.json()),
      undo: () => fetch(
        `${document.location.origin}/api/undo/${getModel().projectID}`,
        { method: 'POST' },
      ).then(response => response.json()),
      redo: () => fetch(
        `${document.location.origin}/api/redo/${getModel().projectID}`,
        { method: 'POST' },
      ).then(response => response.json()),
      setFrame: (context, event) => {
        const promise = fetch(
          `${document.location.origin}/api/changedisplay/${getModel().projectID}/${event.dimension}/${event.value}`,
          { method: 'POST' },
        );
        promise.then(() => { getModel()[event.dimension] = event.value });
        return promise.then(response => response.json());
      },
      toggleRGB: (context, event) => {
        const promise = fetch(
          `${document.location.origin}/api/rgb/${getModel().projectID}/${!getModel().rgb}`,
          { method: 'POST' },
        );
        promise.then(() => { getModel().rgb = !getModel().rgb });
        return promise.then(response => response.json());
      },
    }
  }
);

export default backendMachine;
