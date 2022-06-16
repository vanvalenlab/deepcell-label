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
        { id: 'idb', src: fromWebWorker(() => new IdbWorker()) },
        { src: fromEventBus('IDB', () => eventBuses.arrays, 'LABELED') },
        { src: fromEventBus('IDB', () => eventBuses.cells, 'CELLS') },
        { src: fromEventBus('IDB', () => eventBuses.divisions, 'DIVISIONS') },
        { src: fromEventBus('IDB', () => eventBuses.spots, 'SPOTS') },
        { src: fromEventBus('IDB', () => eventBuses.load, 'LOADED') },
      ],
      entry: send((ctx) => ({ type: 'PROJECT_ID', projectId: ctx.projectId }), { to: 'idb' }),
      on: {},
      initial: 'getProject',
      states: {
        getProject: {
          on: {
            LOADED: { target: 'idle', actions: ['setProject', 'forwardLoadedToParent'] },
            PROJECT_NOT_IN_DB: { target: 'loadProject', actions: 'forwardToParent' },
          },
        },
        loadProject: {
          on: {
            LOADED: {
              target: 'idle',
              actions: ['setProject', 'putProject'],
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
      actions: {
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
        forwardLoadedToParent: sendParent((ctx, evt) => ({ ...evt, cells: new Cells(evt.cells) })),
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
