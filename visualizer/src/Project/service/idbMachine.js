/** Records the current project state in IDB so that it can be restored when closing.
 * MVP only records the labeled data state, not the UI state or the undo/redo history.
 */
import { openDB } from 'idb';
import { assign, Machine, sendParent } from 'xstate';
import Cells from '../cells';
import { fromEventBus } from './eventBus';

function createIDBMachine({ projectId, eventBuses }) {
  return Machine(
    {
      context: {
        projectId,
        db: null,
        project: {
          raw: null,
          labeled: null,
          cells: null, // list of cells, not the Cells object
          divisions: null,
        },
      },
      invoke: [
        { src: fromEventBus('IDB', () => eventBuses.arrays, 'EDITED_SEGMENT') },
        { src: fromEventBus('IDB', () => eventBuses.cells, 'EDITED_CELLS') },
        { src: fromEventBus('IDB', () => eventBuses.load, 'LOADED') },
      ],
      initial: 'openDb',
      states: {
        openDb: {
          invoke: {
            src: 'openDB',
            onDone: { target: 'getProject', actions: 'setDb' },
          },
        },
        getProject: {
          invoke: {
            src: 'getProject',
            onDone: [
              {
                cond: 'projectInDb',
                target: 'idle',
                actions: ['setProject', 'sendLoaded'],
              },
              { target: 'loadProject', actions: 'sendProjectNotInDB' },
            ],
          },
        },
        loadProject: {
          on: {
            LOADED: {
              target: 'putProject',
              actions: 'loadProject',
            },
          },
        },
        putProject: {
          invoke: { src: 'putProject', onDone: 'idle' },
          on: {
            EDITED_SEGMENT: {
              target: 'putProject',
              actions: 'updateSegment',
            },
            EDITED_CELLS: {
              target: 'putProject',
              actions: 'updateCells',
            },
          },
        },
        idle: {
          on: {
            EDITED_SEGMENT: {
              target: 'putProject',
              actions: 'updateSegment',
            },
            EDITED_CELLS: {
              target: 'putProject',
              actions: 'updateCells',
            },
          },
        },
      },
    },
    {
      guards: {
        projectInDb: (ctx, evt) => evt.data !== undefined,
      },
      services: {
        putProject: (ctx) => ctx.db.put('projects', ctx.project, ctx.projectId),
        openDB: () =>
          openDB('deepcell-label', 2, {
            upgrade(db) {
              const store = db.createObjectStore('projects');
            },
          }),
        getProject: (ctx) => ctx.db.get('projects', ctx.projectId),
      },
      actions: {
        updateSegment: assign({
          project: (ctx, evt) => {
            const { frame, feature } = evt;
            const labeled = ctx.project.labeled.map((arr, i) =>
              i === feature ? arr.map((arr, j) => (j === frame ? evt.labeled : arr)) : arr
            );
            return { ...ctx.project, labeled };
          },
        }),
        updateCells: assign({
          project: (ctx, evt) => ({ ...ctx.project, cells: evt.cells.cells }),
        }),
        setDb: assign({ db: (ctx, evt) => evt.data }),
        setProject: assign((ctx, evt) => ({
          project: {
            raw: evt.data.raw,
            labeled: evt.data.labeled,
            cells: evt.data.cells,
            divisions: evt.data.divisions,
          },
        })),
        loadProject: assign((ctx, evt) => ({
          project: {
            raw: evt.raw,
            labeled: evt.labeled,
            cells: evt.cells.cells, // LOADED sends Cells object, need to get cells list
            divisions: evt.divisions,
          },
        })),
        sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
        sendLoaded: sendParent((ctx) => ({
          type: 'LOADED',
          raw: ctx.project.raw,
          labeled: ctx.project.labeled,
          spots: ctx.project.spots, // TODO: include spots in IDB
          divisions: ctx.project.divisions,
          cells: new Cells(ctx.project.cells),
          message: 'from idb machine',
        })),
      },
    }
  );
}

export default createIDBMachine;
