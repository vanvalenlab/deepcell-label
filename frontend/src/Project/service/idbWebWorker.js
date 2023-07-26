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
      channels: null, // list of channel names
      embeddings: null, // list of embedding vectors imported from a cell types model if applicable
      raw: null, // Uint8Array[][][]
      labeled: null, // Int32Array[][][]
      cells: null, // list of cells (not the Cells object) { value: number, cell, number, t: number}[]
      cellTypes: null, // list of cell types { id: number, name: string, color: string, cells: number[] }
      divisions: null, // list of divisions { parent: number, daughters: number[], t: number}[]
      spots: null, // list of spot coordinates [number, number][]
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
            target: '.putLabeled',
            actions: 'updateLabeled',
            internal: false,
          },
          RESTORED_SEGMENT: {
            target: '.putLabeled',
            actions: 'updateLabeled',
            internal: false,
          },
          CELLS: { target: '.putCells', actions: 'updateCells', internal: false },
          CELLTYPES: { target: '.putCellTypes', actions: 'updateCellTypes', internal: false },
          CHANNEL_NAMES: {
            target: '.putChannels',
            actions: 'updateChannels',
            internal: false,
          },
          DIVISIONS: {
            target: '.putDivisions',
            actions: 'updateDivisions',
            internal: false,
          },
          SPOTS: { target: '.putSpots', actions: 'updateSpots', internal: false },
        },
        initial: 'idle',
        states: {
          idle: {},
          putProject: {
            invoke: { src: 'putProject', onDone: 'idle' },
          },
          putLabeled: {
            invoke: { src: 'putLabeled', onDone: 'idle' },
          },
          putCells: {
            invoke: { src: 'putCells', onDone: 'idle' },
          },
          putCellTypes: {
            invoke: { src: 'putCellTypes', onDone: 'idle' },
          },
          putChannels: {
            invoke: { src: 'putChannels', onDone: 'idle' },
          },
          putDivisions: {
            invoke: { src: 'putDivisions', onDone: 'idle' },
          },
          putSpots: {
            invoke: { src: 'putSpots', onDone: 'idle' },
          },
        },
      },
    },
  },
  {
    guards: {
      projectInDb: (_, evt) => {
        // Return false if all values in evt.data are undefined
        return Object.values(evt.data).some((value) => value !== undefined);
      },
    },
    services: {
      openDB: () =>
        openDB('deepcell-label', 3, {
          upgrade(db) {
            const fields = [
              'cellTypes',
              'cells',
              'channels',
              'divisions',
              'embeddings',
              'labeled',
              'raw',
              'rawOriginal',
              'spots',
            ];
            for (const field of fields) {
              db.createObjectStore(field);
            }
          },
        }),
      getProject: async (ctx) => {
        const cellTypes = await ctx.db.get('cellTypes', ctx.projectId);
        const cells = await ctx.db.get('cells', ctx.projectId);
        const channels = await ctx.db.get('channels', ctx.projectId);
        const divisions = await ctx.db.get('divisions', ctx.projectId);
        const embeddings = await ctx.db.get('embeddings', ctx.projectId);
        const labeled = await ctx.db.get('labeled', ctx.projectId);
        const raw = await ctx.db.get('raw', ctx.projectId);
        const rawOriginal = await ctx.db.get('rawOriginal', ctx.projectId);
        const spots = await ctx.db.get('spots', ctx.projectId);
        const project = {
          cellTypes: cellTypes,
          cells: cells,
          channels: channels,
          divisions: divisions,
          embeddings: embeddings,
          labeled: labeled,
          raw: raw,
          rawOriginal: rawOriginal,
          spots: spots,
        };
        return project;
      },
      putProject: (ctx) => {
        ctx.db.put('cellTypes', ctx.cellTypes, ctx.projectId);
        ctx.db.put('cells', ctx.cells, ctx.projectId);
        ctx.db.put('channels', ctx.channels, ctx.projectId);
        ctx.db.put('divisions', ctx.divisions, ctx.projectId);
        ctx.db.put('embeddings', ctx.embeddings, ctx.projectId);
        ctx.db.put('labeled', ctx.labeled, ctx.projectId);
        ctx.db.put('raw', ctx.raw, ctx.projectId);
        ctx.db.put('rawOriginal', ctx.rawOriginal, ctx.projectId);
        ctx.db.put('spots', ctx.spots, ctx.projectId);
      },
      putLabeled: (ctx) => ctx.db.put('labeled', ctx.labeled, ctx.projectId),
      putCells: (ctx) => ctx.db.put('cells', ctx.cells, ctx.projectId),
      putCellTypes: (ctx) => ctx.db.put('cellTypes', ctx.cellTypes, ctx.projectId),
      putChannels: (ctx) => ctx.db.put('channels', ctx.channels, ctx.projectId),
      putDivisions: (ctx) => ctx.db.put('divisions', ctx.divisions, ctx.projectId),
      putSpots: (ctx) => ctx.db.put('spots', ctx.spots, ctx.projectId),
    },
    actions: {
      setProjectId: assign({ projectId: (_, evt) => evt.projectId }),
      setDb: assign({
        db: (_, evt) => evt.data,
      }),
      sendProjectNotInDB: sendParent('PROJECT_NOT_IN_DB'),
      sendLoaded: sendParent((_, evt) => ({
        type: 'LOADED',
        ...evt.data,
        message: 'from idb web worker machine',
      })),
      setProject: assign((_, evt) => {
        const { type, ...project } = evt;
        return project;
      }),
      setProjectFromDb: assign({
        cellTypes: (_, evt) => evt.data.cellTypes,
        cells: (_, evt) => evt.data.cells,
        channels: (_, evt) => evt.data.channels,
        divisions: (_, evt) => evt.data.divisions,
        embeddings: (_, evt) => evt.data.embeddings,
        labeled: (_, evt) => evt.data.labeled,
        raw: (_, evt) => evt.data.raw,
        rawOriginal: (_, evt) => evt.data.rawOriginal,
        spots: (_, evt) => evt.data.spots,
      }),
      updateLabeled: assign({
        labeled: (ctx, evt) => {
          const { t, c } = evt;
          const labeled = ctx.labeled.map((arr, i) =>
            i === c ? arr.map((arr, j) => (j === t ? evt.labeled : arr)) : arr
          );
          return labeled;
        },
      }),
      updateCells: assign({
        cells: (_, evt) => evt.cells,
      }),
      updateCellTypes: assign({
        cellTypes: (_, evt) => evt.cellTypes,
      }),
      updateChannels: assign({
        channels: (_, evt) => evt.channelNames,
      }),
      updateDivisions: assign({
        divisions: (_, evt) => evt.divisions,
      }),
      updateSpots: assign({
        spots: (_, evt) => evt.spots,
      }),
    },
  }
);

const service = interpretInWebWorker(idbMachine);
service.start();
