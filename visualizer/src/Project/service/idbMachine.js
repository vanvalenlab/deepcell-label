/** Records the current project state in IDB so that it can be restored when closing.
 * MVP only records the labeled data state, not the UI state or the undo/redo history.
 */
import { openDB } from 'idb';
import { assign, Machine, sendParent } from 'xstate';
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
          overlaps: null,
          lineage: null,
          labels: null,
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
            const { frame, feature, labeled, overlaps } = evt;
            ctx.project.labeled[feature][frame] = labeled;
            return { ...ctx.project, labeled: ctx.project.labeled, overlaps };
          },
        }),
        setDb: assign({ db: (ctx, evt) => evt.data }),
        setProject: assign((ctx, evt) => ({
          project: {
            raw: evt.data.raw,
            labeled: evt.data.labeled,
            overlaps: evt.data.overlaps,
            lineage: evt.data.lineage,
            labels: evt.data.labels,
          },
        })),
        loadProject: assign((ctx, evt) => ({
          project: {
            raw: evt.raw,
            labeled: evt.labeled,
            overlaps: evt.overlaps,
            lineage: evt.lineage,
            labels: evt.labels,
          },
        })),
        sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
        sendLoaded: sendParent((ctx) => ({
          type: 'LOADED',
          raw: ctx.project.raw,
          labeled: ctx.project.labeled,
          labels: ctx.project.labels, // TODO: swap labels for cells?
          spots: ctx.project.spots, // TODO: include spots in IDB
          lineage: ctx.project.lineage,
          overlaps: ctx.project.overlaps,
          message: 'from idb machine',
        })),
      },
    }
  );
}

export default createIDBMachine;
