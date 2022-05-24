/** Records the current project state in IDB so that it can be restored when closing.
 * MVP only records the labeled data state, not the UI state or the undo/redo history.
 */
import { openDB } from 'idb';
import { assign, Machine, sendParent } from 'xstate';
import Cells from '../overlaps';
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
          cells: null, // LOADED events send Cells object, but write list of cells to IDB
          lineage: null,
        },
      },
      invoke: [
        { src: fromEventBus('IDB', () => eventBuses.api) }, // Listen for EDITED
        { src: fromEventBus('IDB', () => eventBuses.load) }, // Listen for LOADED
      ],
      on: {
        EDITED: { target: '.putProject', actions: 'updateProject' },
      },
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
        },
        idle: {},
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
        updateProject: assign({
          project: (ctx, evt) => {
            console.log(ctx, evt);
            const { frame, feature, labeled } = evt;
            ctx.project.labeled[feature][frame] = labeled;
            const cells = [
              ...ctx.project.cells.filter((o) => o.z !== evt.frame),
              ...evt.cells.map((o) => ({ ...o, z: evt.frame })),
            ];
            return { ...ctx.project, labeled: ctx.project.labeled, cells };
          },
        }),
        setDb: assign({ db: (ctx, evt) => evt.data }),
        setProject: assign((ctx, evt) => ({
          project: {
            raw: evt.data.raw,
            labeled: evt.data.labeled,
            cells: evt.data.cells,
            lineage: evt.data.lineage,
          },
        })),
        loadProject: assign((ctx, evt) => ({
          project: {
            raw: evt.raw,
            labeled: evt.labeled,
            cells: evt.cells.cells, // LOADED sends Cells object, need to get cells list
            lineage: evt.lineage,
          },
        })),
        sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
        sendLoaded: sendParent((ctx) => ({
          type: 'LOADED',
          raw: ctx.project.raw,
          labeled: ctx.project.labeled,
          spots: ctx.project.spots, // TODO: include spots in IDB
          lineage: ctx.project.lineage,
          cells: new Cells(ctx.project.cells),
          message: 'from idb machine',
        })),
      },
    }
  );
}

export default createIDBMachine;
