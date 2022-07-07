/** Reads and writes project data to the projects table in the deepcell-label IndexedDB in a web worker.
 *
 * When initialized, waits for a PROJECT_ID event, then checks if that project is in the database.
 * If yes, responds with a LOADED event, and if not, responds with PROJECT_NOT_IN_DB and
 * waits for a LOADED event and writes the loaded data to the database.
 *
 * Once the project is in the database, the machine rewrites updated project data after receiving
 * EDITED_SEGMENT, RESTORED_SEGMENT, CELLS, DIVISIONS, and SPOTS events.
 */

import { openDB } from 'idb';
import { assign, createMachine, sendParent } from 'xstate';
import { interpretInWebWorker } from './from-web-worker';

const idbMachine = createMachine(
  {
    id: 'idbWebWorker',
    context: {
      db: null,
      projectId: null,
      project: {
        raw: null, // Uint8Array[][][]
        labeled: null, // Int32Array[][][]
        cells: null, // list of cells (not the Cells object) { value: number, cell, number, t: number}[]
        divisions: null, // list of divisions { parent: number, daughters: number[], t: number}[]
        spots: null, // list of spot coordinates [number, number][]
      },
    },
    initial: 'waitForId',
    states: {
      waitForId: {
        on: {
          PROJECT_ID: { target: 'openDb', actions: 'setProjectId' },
        },
      },
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
              actions: ['setProjectFromDb', 'sendLoaded'],
            },
            { target: 'loading', actions: 'sendProjectNotInDB' },
          ],
        },
      },
      loading: {
        on: {
          LOADED: { target: 'idle.putProject', actions: 'setProject' },
        },
      },
      idle: {
        on: {
          EDITED_SEGMENT: {
            target: '.putProject',
            actions: 'updateLabeled',
            internal: false,
          },
          RESTORED_SEGMENT: {
            target: '.putProject',
            actions: 'updateLabeled',
            internal: false,
          },
          CELLS: { target: '.putProject', actions: 'updateCells', internal: false },
          DIVISIONS: {
            target: '.putProject',
            actions: 'updateDivisions',
            internal: false,
          },
          SPOTS: { target: '.putProject', actions: 'updateSpots', internal: false },
        },
        initial: 'idle',
        states: {
          idle: {},
          putProject: {
            invoke: { src: 'putProject', onDone: 'idle' },
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
      openDB: () =>
        openDB('deepcell-label', 2, {
          upgrade(db) {
            db.createObjectStore('projects');
          },
        }),
      getProject: (ctx) => ctx.db.get('projects', ctx.projectId),
      putProject: (ctx) => ctx.db.put('projects', ctx.project, ctx.projectId),
    },
    actions: {
      setProjectId: assign({ projectId: (ctx, evt) => evt.projectId }),
      setDb: assign({ db: (ctx, evt) => evt.data }),
      sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
      sendLoaded: sendParent((ctx, evt) => ({
        type: 'LOADED',
        ...evt.data,
        message: 'from idb web worker machine',
      })),
      setProject: assign((ctx, evt) => {
        const { type, ...project } = evt;
        return { project };
      }),
      setProjectFromDb: assign({ project: (ctx, evt) => ({ ...evt.data }) }),
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
        project: (ctx, evt) => ({ ...ctx.project, cells: evt.cells }),
      }),
      updateDivisions: assign({
        project: (ctx, evt) => ({ ...ctx.project, divisions: evt.divisions }),
      }),
      updateSpots: assign({
        project: (ctx, evt) => ({ ...ctx.project, spots: evt.spots }),
      }),
    },
  }
);

const service = interpretInWebWorker(idbMachine);
service.start();
