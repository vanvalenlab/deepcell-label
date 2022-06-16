/** Records the current project state in IDB so that it can be restored when closing.
 * MVP only records the labeled data state, not the UI state or the undo/redo history.
 */
import IdbWorker from 'worker-loader!./idbWebWorker'; // eslint-disable-line import/no-webpack-loader-syntax
import { assign, Machine, send, sendParent } from 'xstate';
import Cells from '../cells';
import { fromEventBus } from './eventBus';
import { fromWebWorker } from './from-web-worker';

function createIDBMachine({ projectId, eventBuses }) {
  return Machine(
    {
      context: {
        projectId,
        project: {
          raw: null, // Uint8Array[][][]
          labeled: null, // Int32Array[][][]
          cells: null, // list of cells, not the Cells object
          divisions: null, // list of divisions
        },
      },
      invoke: [
        { src: fromWebWorker(() => new IdbWorker()), id: 'idb' },
        { src: fromEventBus('IDB', () => eventBuses.arrays, 'LABELED') },
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
                actions: [(c, e) => console.log(c, e), 'setProject', 'setLoaded'],
                target: 'promptForceLoadOutput',
              },
              {
                actions: [(c, e) => console.log(c, e), 'setProject', 'setLoaded', 'sendLoaded'],
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
              actions: ['setProject', 'putProject'],
              target: 'idle',
            },
          },
        },
        idle: {
          on: {
            LABELED: { actions: ['updateLabeled', 'putProject'] },
            CELLS: { actions: ['updateCells', 'putProject'] },
            DIVISIONS: { actions: ['updateDivisions', 'putProject'] },
            SPOTS: { actions: ['updateSpots', 'putProject'] },
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
        updateLabeled: assign({
          project: (ctx, evt) => {
            const { t, feature } = evt;
            const labeled = ctx.project.labeled.map((arr, i) =>
              i === feature ? arr.map((arr, j) => (j === t ? evt.labeled : arr)) : arr
            );
            return { ...ctx.project, labeled };
          },
        }),
        updateCells: assign({
          project: (ctx, evt) => ({ ...ctx.project, cells: evt.cells.cells }),
        }),
        updateDivisions: assign({
          project: (ctx, evt) => ({ ...ctx.project, divisions: evt.divisions }),
        }),
        updateSpots: assign({
          project: (ctx, evt) => ({ ...ctx.project, spots: evt.spots }),
        }),
        setProject: assign((ctx, evt) => ({
          project: {
            raw: evt.raw,
            labeled: evt.labeled,
            cells: evt.cells.cells, // LOADED sends Cells object, need to get cells list
            divisions: evt.divisions,
            spots: evt.spots,
          },
        })),
        setLoaded: assign({
          loadedEvent: (ctx, evt) => ({ ...evt, cells: new Cells(evt.cells) }),
        }),
        sendLoaded: sendParent((ctx) => ctx.loadedEvent),
        forwardToParent: sendParent((ctx, evt) => evt),
        putProject: send(
          (ctx) => ({ type: 'PUT_PROJECT', projectId: ctx.projectId, project: ctx.project }),
          { to: 'idb' }
        ),
      },
    }
  );
}

export default createIDBMachine;
