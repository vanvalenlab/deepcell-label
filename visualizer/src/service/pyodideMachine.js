/* eslint-disable import/no-webpack-loader-syntax */
import PyodideWorker from 'worker-loader!./workers/worker';
import { Machine, send, sendParent } from 'xstate';
import { fromWebWorker } from './from-web-worker';

const pyodideMachine = Machine(
  {
    id: 'pyodide',
    context: {},
    invoke: {
      id: 'worker',
      src: fromWebWorker(() => new PyodideWorker()),
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          EDIT: {
            target: 'editing',
            actions: [
              'sendToWorker',
              (c, e) => console.log('edit sent by main', e),
              () => console.time('edit'),
            ],
          },
          EDITED: {
            actions: [(c, e) => console.log('EDITED received in idle state', e)],
          },
        },
      },
      editing: {
        after: {
          1000: {
            target: 'idle',
            actions: (c, e) => console.log('returning to idle after 1 second'),
          },
        },
        on: {
          EDITED: {
            target: 'idle',
            actions: [
              (c, e) => console.log('EDITED received by main', e),
              () => console.timeEnd('edit'),
            ],
          },
        },
      },
    },
  },
  {
    actions: {
      sendToWorker: send(
        (_, { buffer, ...event }) =>
          buffer !== undefined ? { ...event, buffer, _transfer: [buffer] } : event,
        { to: 'worker' }
      ),
      sendEdited: sendParent((_, event) => ({
        type: 'EDITED',
        data: event.data,
      })),
      sendError: sendParent((_, event) => ({
        type: 'ERROR',
        error: event.data.error,
      })),
    },
  }
);

export default pyodideMachine;
