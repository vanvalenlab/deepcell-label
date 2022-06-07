import { openDB } from 'idb';
import { actions, assign, createMachine, sendParent } from 'xstate';
import { interpretInWebWorker } from './from-web-worker';

const { respond } = actions;

const idbMachine = createMachine(
  {
    id: 'idbWebWorker',
    context: {
      db: null,
      projectId: null,
    },
    on: {
      PUT_PROJECT: 'putProject',
    },
    initial: 'getId',
    entry: (c, e) => console.log(c, e),
    states: {
      getId: {
        entry: (c, e) => console.log(c, e),
        on: {
          PROJECT_ID: { target: 'openDb', actions: 'setProjectId' },
        },
      },
      openDb: {
        entry: (c, e) => console.log(c, e),
        invoke: {
          src: 'openDB',
          onDone: { target: 'getProject', actions: 'setDb' },
        },
      },
      idle: {
        entry: (c, e) => console.log(c, e),
      },
      putProject: {
        invoke: { src: 'putProject', onDone: 'idle' },
      },
      getProject: {
        invoke: {
          src: 'getProject',
          onDone: [
            {
              cond: 'projectInDb',
              target: 'idle',
              actions: 'sendLoaded',
            },
            { target: 'idle', actions: 'sendProjectNotInDB' },
          ],
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
      putProject: (ctx, evt) => ctx.db.put('projects', evt.project, ctx.projectId),
    },
    actions: {
      setProjectId: assign({ projectId: (ctx, evt) => evt.projectId }),
      setDb: assign({ db: (ctx, evt) => evt.data }),
      sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
      sendLoaded: sendParent((ctx, evt) => ({
        type: 'LOADED',
        raw: evt.data.raw,
        labeled: evt.data.labeled,
        cells: evt.data.cells,
        divisions: evt.data.divisions,
        // spots: ctx.project.spots, // TODO: include spots in IDB
        message: 'from idb web worker machine',
      })),
    },
  }
);

const service = interpretInWebWorker(idbMachine);
service.start();
console.log(service);
