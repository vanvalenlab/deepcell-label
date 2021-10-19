/* eslint-disable */
// import pyodide from 'pyodide';
import segment from '!!raw-loader!./segment.py';
import { actions, assign, createMachine, sendParent } from 'xstate';
import { interpretInWebWorker } from '../from-web-worker';

const { respond } = actions;

let pyodide;
let edit;

async function setupPyodide() {
  console.time('importScripts pyodide');
  const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/';
  importScripts(indexURL + 'pyodide.js');
  console.timeEnd('importScripts pyodide');

  console.time('loadPyodide');
  pyodide = await loadPyodide({ indexURL });
  console.timeEnd('loadPyodide');

  console.time('loadPackage');
  await pyodide.loadPackage(['numpy', 'matplotlib', 'scikit-image']);
  console.timeEnd('loadPackage');

  console.time('runPython');
  edit = pyodide.runPython(segment);
  console.timeEnd('runPython');
  service.send('PYTHON_READY');
  self.edit = edit;
  return edit;
}

const pyodideMachine = createMachine(
  {
    id: 'pyodideWorker',
    context: {
      height: null,
      width: null,
    },
    initial: 'setUp',
    on: {
      DIMENSIONS: { actions: assign((_, { height, width }) => ({ height, width })) },
    },
    states: {
      setUp: {
        on: {
          PYTHON_READY: 'idle',
        },
      },
      idle: {
        entry: () => console.log('pyodide set up in worker'),
        on: {
          EDIT: {
            actions: 'edit',
          },
        },
      },
    },
  },
  {
    actions: {
      edit: sendParent((context, event) => {
        const img = edit(context, event);
        const array = new Int32Array(img.getBuffer().data);
        return {
          type: 'EDITED',
          buffer: array,
          frame: event.frame,
          feature: event.feature,
        };
      }),
    },
  }
);

const service = interpretInWebWorker(pyodideMachine);
service.start();
self.pyodideService = service;
setupPyodide();
