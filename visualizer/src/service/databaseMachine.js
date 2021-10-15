/** Creates the database to store projects.
 * Includes stores for projects, raw image array, label image arrays, labels, and action history.
 */

// helpful resource: https://developers.google.com/web/ilt/pwa/working-with-indexeddb
// uses the IDB Promised wrapper library

import { openDB } from 'idb';
import _ from 'lodash';
import { assign, Machine, send, sendParent } from 'xstate';

// import { Project, RawArray, LabelArray } from "./types";

// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
// The basic pattern that IndexedDB encourages is the following:
// Open a database.
// Create an object store in the database.
// Start a transaction and make a request to do some database operation, like adding or retrieving data.
// Wait for the operation to complete by listening to the right kind of DOM event.
// Do something with the results (which can be found on the request object).

// interface
// GET: sends project data in bulk to its parent
// UPDATE: updates label arrays or labels
// UNDO: rolls back an update and sends the changed array or labels to parent
// REDO: redoes an update ands sends the changed arrays or labels to parent

// object stores in database
// projects: project attributes
// raw:
// segmentation:
// labels:

const splitRawBuffer = (buffer, numChannels, numFrames, projectId) => {
  const length = buffer.byteLength / numChannels / numFrames / 4; // 4 bytes for int32
  const frames = [];
  for (let i = 0; i < numChannels; i++) {
    for (let j = 0; j < numFrames; j++) {
      const array = new Float32Array(buffer, (i * numFrames + j) * length * 4, length);
      frames.push({ buffer: array, project: projectId, channel: i, frame: j });
    }
  }
  return frames;
};

const splitLabeledBuffer = (buffer, numFeatures, numFrames, projectId) => {
  const length = buffer.byteLength / numFeatures / numFrames / 4; // 4 bytes for int32
  const frames = [];
  for (let i = 0; i < numFeatures; i++) {
    for (let j = 0; j < numFrames; j++) {
      const array = new Int32Array(buffer, (i * numFrames + j) * length * 4, length);
      frames.push({ buffer: array, project: projectId, feature: i, frame: j });
    }
  }
  return frames;
};

/** Takes a flattened list of raw buffers
 * and creates a nested list with channels first then frames.
 */
function nest(buffers, level1, level2) {
  return _(buffers)
    .groupBy(level1)
    .toPairs()
    .sortBy(pair => pair[0])
    .map(pair => pair[1])
    .map(group =>
      _(group)
        .sortBy(level2)
        .map(x => x.buffer)
        .value()
    )
    .value();
}

function upgrade(db) {
  if (!db.objectStoreNames.contains('projects')) {
    db.createObjectStore('projects', { keyPath: 'projectId' });
  }

  if (!db.objectStoreNames.contains('raw')) {
    const rawStore = db.createObjectStore('raw', {
      keyPath: ['project', 'channel', 'frame'],
    });
    rawStore.createIndex('project', 'project', { unique: false });
  }

  if (!db.objectStoreNames.contains('labeled')) {
    const labeledStore = db.createObjectStore('labeled', {
      keyPath: ['project', 'feature', 'frame'],
    });
    labeledStore.createIndex('project', 'project', { unique: false });
  }
}

const createDatabaseMachine = ({ projectId }) =>
  Machine(
    {
      context: {
        db: null,
        projectId,
      },
      initial: 'createDB',
      states: {
        createDB: {
          invoke: {
            src: () => openDB('dcl', 1, { upgrade }),
            onDone: {
              target: 'idle',
              actions: [assign({ db: (_, event) => event.data }), send('GET')],
            },
          },
        },
        idle: {
          on: {
            GET: 'getting',
            UPDATE: 'updating',
            // UNDO: {},
            // REDO: {},
          },
        },
        getting: {
          invoke: {
            src: 'getProject',
            onDone: [
              { cond: 'projectExists', target: 'idle', actions: 'sendProject' },
              { target: 'fetching' },
            ],
            onError: { target: 'idle', actions: 'log' },
          },
        },
        fetching: {
          invoke: {
            src: 'fetchProject',
            onDone: { target: 'creating', actions: 'log' },
            onError: { target: 'idle', actions: 'log' },
          },
        },
        creating: {
          invoke: {
            src: 'createProject',
            onDone: { target: 'getting', actions: 'log' },
            onError: { target: 'idle', actions: 'log' },
          },
        },
        // TODO: rework to allow updates while update is happening
        // spawn promise instead of invoking in separate state
        updating: {
          invoke: {
            src: (context, event) => {},
            onDone: 'idle',
            onError: { target: 'idle', actions: 'log' },
          },
        },
      },
    },
    {
      guards: {
        projectExists: (_, event) => event.data[0] !== undefined,
      },
      services: {
        // return an IDB promise with project data in database
        getProject: context => {
          const { db, projectId } = context;
          const tx = db.transaction(['projects', 'raw', 'labeled']);
          const projectStore = tx.objectStore('projects');
          const rawStore = tx.objectStore('raw');
          const rawIndex = rawStore.index('project');
          const labeledStore = tx.objectStore('labeled');
          const labeledIndex = labeledStore.index('project');
          return Promise.all([
            projectStore.get(projectId),
            rawIndex.getAll(projectId),
            labeledIndex.getAll(projectId),
            tx.done,
          ]);
        },
        // return a promise with project data
        fetchProject: context => {
          const { projectId } = context;
          const project = fetch(`/api/project/${projectId}`).then(response => response.json());
          const raw = fetch(`/dev/raw/${projectId}`).then(response => response.arrayBuffer());
          const labeled = fetch(`/dev/labeled/${projectId}`).then(response =>
            response.arrayBuffer()
          );

          const splitBuffers = ([project, raw, labeled]) => {
            const { numChannels, numFeatures, numFrames } = project;
            return [
              project,
              splitRawBuffer(raw, numChannels, numFrames, projectId),
              splitLabeledBuffer(labeled, numFeatures, numFrames, projectId),
            ];
          };

          return Promise.all([project, raw, labeled]).then(splitBuffers);
        },
        // put the project data into the database
        createProject: (context, event) => {
          const { db } = context;
          const [project, raw, labeled] = event.data;
          const tx = db.transaction(['projects', 'raw', 'labeled'], 'readwrite');
          const projectStore = tx.objectStore('projects');
          const rawStore = tx.objectStore('raw');
          const labeledStore = tx.objectStore('labeled');
          return Promise.all([
            projectStore.add(project),
            ...raw.map(x => rawStore.add(x)),
            ...labeled.map(x => labeledStore.add(x)),
            tx.done,
          ]);
        },
        // updateProject: (context, event) => {
        //   const { db } = context;
        // },
      },
      actions: {
        sendProject: sendParent((context, event) => {
          const [project, raw, labeled] = event.data;
          return {
            type: 'PROJECT',
            project,
            raw: nest(raw, 'channel', 'frame'),
            labeled: nest(labeled, 'feature', 'frame'),
          };
        }),
        log: (context, event) => console.log(context, event),
      },
    }
  );

export default createDatabaseMachine;
