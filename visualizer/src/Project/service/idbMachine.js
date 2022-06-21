/** Records the current project state in IDB so that it can be restored when closing.
 * MVP only records the labeled data state, not the UI state or the undo/redo history.
 * Converts from cell list to Cells object.
 */
import IdbWorker from 'worker-loader!./idbWebWorker'; // eslint-disable-line import/no-webpack-loader-syntax
import { assign, forwardTo, Machine, send, sendParent } from 'xstate';
import Cells from '../cells';
import { fromEventBus } from './eventBus';
import { fromWebWorker } from './from-web-worker';

function createIDBMachine({ projectId, eventBuses }) {
  return Machine(
    {
      context: {
        projectId,
        loadedEvent: null, // hold onto LOADED event while prompting overwrite
      },
      invoke: [
        { src: fromWebWorker(() => new IdbWorker()), id: 'idb' },
        {
          src: fromEventBus('IDB', () => eventBuses.arrays, ['EDITED_SEGMENT', 'RESTORED_SEGMENT']),
        },
        { src: fromEventBus('IDB', () => eventBuses.cells, 'CELLS') },
        { src: fromEventBus('IDB', () => eventBuses.divisions, 'DIVISIONS') },
        { src: fromEventBus('IDB', () => eventBuses.spots, 'SPOTS') },
        { src: fromEventBus('IDB', () => eventBuses.load, 'LOADED') },
      ],
      initial: 'getProject',
      states: {
        getProject: {
          entry: 'getProject',
          on: {
            LOADED: [
              {
                cond: 'forceLoadOutput',
                actions: 'setLoaded',
                target: 'promptForceLoadOutput',
              },
              {
                actions: ['setLoaded', 'sendLoaded'],
                target: 'idle',
              },
            ],
            PROJECT_NOT_IN_DB: {
              actions: 'forwardToParent',
              target: 'loadProject',
            },
          },
        },
        promptForceLoadOutput: {
          on: {
            FORCE_LOAD_OUTPUT: {
              actions: sendParent('FORCE_LOAD_PROJECT_FROM_OUTPUT'),
              target: 'loadProject',
            },
            USE_LOCAL_PROJECT: {
              actions: 'sendLoaded',
              target: 'idle',
            },
          },
        },
        loadProject: {
          on: {
            LOADED: {
              actions: send((ctx, evt) => ({ ...evt, cells: evt.cells.cells }), { to: 'idb' }),
              target: 'idle',
            },
          },
        },
        idle: {
          on: {
            EDITED_SEGMENT: { actions: forwardTo('idb') },
            RESTORED_SEGMENT: { actions: forwardTo('idb') },
            CELLS: {
              actions: send((ctx, evt) => ({ ...evt, cells: evt.cells.cells }), { to: 'idb' }),
            },
            DIVISIONS: { actions: forwardTo('idb') },
            SPOTS: { actions: forwardTo('idb') },
          },
        },
      },
    },
    {
      guards: {
        forceLoadOutput: () =>
          new URLSearchParams(window.location.search).get('forceLoadOutput') === 'true',
      },
      actions: {
        getProject: send((ctx) => ({ type: 'PROJECT_ID', projectId: ctx.projectId }), {
          to: 'idb',
        }),
        setLoaded: assign({
          loaded: (ctx, evt) => ({ ...evt, cells: new Cells(evt.cells) }),
        }),
        sendLoaded: sendParent((ctx) => ctx.loaded),
        forwardToParent: sendParent((ctx, evt) => evt),
      },
    }
  );
}

export default createIDBMachine;
