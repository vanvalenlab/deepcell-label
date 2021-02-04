/* eslint-disable comma-dangle */
import { Machine, assign, sendParent } from 'xstate';
import $ from 'jquery';

const getModel = () => window.model;

const backendMachine = Machine({
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
        src: (context, event) => $.ajax({
          type: 'POST',
          url: `${document.location.origin}/api/edit/${getModel().projectID}/${event.action}`,
          data: event.args,
        }),
        onDone: {
          target: 'loaded',
          actions: assign({ data: (_, event) => event.data }),
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
        src: () => $.ajax({
          type: 'POST',
          url: `${document.location.origin}/api/undo/${getModel().projectID}`
        }),
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
        id: 'undo',
        src: () => $.ajax({
          type: 'POST',
          url: `${document.location.origin}/api/redo/${getModel().projectID}`
        }),
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
        src: (context, event) => {
          const promise = $.ajax({
            type: 'POST',
            url: `${document.location.origin}/api/changedisplay/${getModel().projectID}/${event.dimension}/${event.value}`,
          });
          promise.then(() => { getModel()[event.dimension] = event.value });
          return promise;
        },
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
        src: (context, event) => {
          const promise = $.ajax({
            type: 'POST',
            url: `${document.location.origin}/api/rgb/${getModel().projectID}/${!getModel().rgb}`,
          });
          promise.then(() => { getModel().rgb = !getModel().rgb });
          return promise;
        },
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
          actions: [
            (context) => getModel().handlePayload(context.data),
            sendParent('LOADED'),
          ]
        }
      }
    },
    error: {
      on: {
        '': {
          target: 'idle',
          actions: [
            (context) => console.log(context.error),
            sendParent('ERROR'),
          ]
        }
      }
    }
  }
});

export default backendMachine;