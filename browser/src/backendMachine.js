/* eslint-disable comma-dangle */
import { Machine, assign, sendParent } from 'xstate';
import $ from 'jquery';

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
      edit: (context, event) => $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/edit/${getModel().projectID}/${event.action}`,
        data: event.args,
      }),
      undo: () => $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/undo/${getModel().projectID}`
      }),
      redo: () => $.ajax({
        type: 'POST',
        url: `${document.location.origin}/api/redo/${getModel().projectID}`
      }),
      setFrame: (context, event) => {
        const promise = $.ajax({
          type: 'POST',
          url: `${document.location.origin}/api/changedisplay/${getModel().projectID}/${event.dimension}/${event.value}`,
        });
        promise.then(() => { getModel()[event.dimension] = event.value });
        return promise;
      },
      toggleRGB: (context, event) => {
        const promise = $.ajax({
          type: 'POST',
          url: `${document.location.origin}/api/rgb/${getModel().projectID}/${!getModel().rgb}`,
        });
        promise.then(() => { getModel().rgb = !getModel().rgb });
        return promise;
      },
    }
  }
);

export default backendMachine;
