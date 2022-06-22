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
              target: 'loading',
              actions: 'sendLoaded',
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
          },
          RESTORED_SEGMENT: {
            target: '.putProject',
            actions: 'updateLabeled',
          },
          CELLS: { target: '.putProject', actions: 'updateCells' },
          DIVISIONS: {
            target: '.putProject',
            actions: 'updateDivisions',
          },
          SPOTS: { target: '.putProject', actions: 'updateSpots' },
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
      putProject: (ctx, evt) => ctx.db.put('projects', ctx.project, ctx.projectId),
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
      setProject: assign((ctx, evt) => ({
        project: { ...evt },
      })),
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
