/* eslint-disable */
// import pyodide from 'pyodide';
import segment from '!!raw-loader!./segment.py';
import { createMachine, sendParent } from 'xstate';
import { interpretInWebWorker } from '../from-web-worker';

let pyodide;
let pyFuncs;

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
  pyFuncs = pyodide.runPython(segment);
  console.timeEnd('runPython');
  service.send('PYTHON_READY');
  self.pyFuncs = pyFuncs;
  return pyFuncs;
}

setupPyodide();

const pyodideMachine = createMachine(
  {
    id: 'pyodideWorker',
    context: {
      pyFuncs: null,
    },
    initial: 'setUp',
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
            actions: [sendParent('EDITED'), (c, e) => console.log('EDIT received', e)],
          },
        },
      },
    },
  },
  {
    actions: {
      // setPyFuncs: assign({ pyFuncs: (_, { data }) => data }),
      // edit:
      sendEdited: sendParent((_, e) => ({
        type: 'EDITED',
        buffer: e?.buffer,
        // _transfer: [e?.buffer],
      })),
    },
  }
);

const service = interpretInWebWorker(pyodideMachine);
service.start();
self.pyodideService = service;
