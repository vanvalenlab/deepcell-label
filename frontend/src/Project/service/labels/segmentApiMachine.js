/** Edits the segmentation through the /api/edit route on the backend.
 * Creates an edit zip to send to /api/edit and parses the response zip to send an EDITED_SEGMENT event.
 */

import * as zip from '@zip.js/zip.js';
import { assign, Machine, sendParent } from 'xstate';
import { fromEventBus } from '../eventBus';

/** Splits a 1D Int32Array buffer into a 2D list of Int32Array with height and width. */
function splitRows(buffer, width, height) {
  const frame = [];
  for (let i = 0; i < height; i++) {
    const row = new Int32Array(buffer, width * i * 4, width);
    frame.push(row);
  }
  return frame;
}

/** Creates a zip file blob with images and labels to updated by the API. */
async function makeEditZip(context, event) {
  const { labeled, raw, cells, writeMode, t, c } = context;
  const { action, args } = event;
  const edit = { width: labeled[0].length, height: labeled.length, action, args, writeMode };

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  // Required files
  await zipWriter.add('edit.json', new zip.TextReader(JSON.stringify(edit)));
  await zipWriter.add(
    'cells.json',
    new zip.TextReader(JSON.stringify(cells.filter((cell) => cell.t === t && cell.c === c)))
  );
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(labeled)));
  // Optional files
  const usesRaw = action === 'active_contour' || action === 'threshold' || action === 'watershed';
  if (usesRaw) {
    await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(raw)));
  }

  const zipBlob = await zipWriter.close();
  return zipBlob;
}

/** Sends a label zip to the DeepCell Label API to edit. */
async function edit(context, event) {
  const form = new FormData();
  const zipBlob = await makeEditZip(context, event);
  form.append('labels', zipBlob, 'labels.zip');
  const width = context.labeled[0].length;
  const height = context.labeled.length;

  const options = {
    method: 'POST',
    body: form,
    'Content-Type': 'multipart/form-data',
  };
  return fetch(`${document.location.origin}/api/edit`, options)
    .then(checkResponseCode)
    .then((res) => parseResponseZip(res, width, height));
}

function checkResponseCode(response) {
  return response.ok ? response : Promise.reject(response);
}

/** Parses responses from the DeepCell Label API.
 * @param {Response} response - The response from the DeepCell Label API.
 * @param {number} width - The width of the segmentation array.
 * @param {number} height - The height of the segmentation array
 * @returns {Promise<{labeled: Int32Array[], cells: Cell[]}>} - The labeled segmentation array and cells from the DeepCell Label API after editing.
 */
async function parseResponseZip(response, width, height) {
  const blob = await response.blob();
  const reader = new zip.ZipReader(new zip.BlobReader(blob));
  const entries = await reader.getEntries();
  const labeledBlob = await entries[0].getData(new zip.BlobWriter());
  const cellsJson = await entries[1].getData(new zip.TextWriter());
  // const labeled = JSON.parse(labeledJson).map((arr) => Int32Array.from(arr));
  const labeledBuffer = await labeledBlob.arrayBuffer();
  const labeled = splitRows(labeledBuffer, width, height);
  const cells = JSON.parse(cellsJson);
  await reader.close();
  return { labeled, cells };
}

const createSegmentApiMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'editSegment',
      invoke: [
        {
          id: 'arrays',
          src: fromEventBus('editSegment', () => eventBuses.arrays, ['LABELED', 'RAW']),
        },
        { id: 'cells', src: fromEventBus('editSegment', () => eventBuses.cells, 'CELLS') },
        { src: fromEventBus('editSegment', () => eventBuses.image, 'SET_T') },
        { src: fromEventBus('editSegment', () => eventBuses.labeled, 'SET_FEATURE') },
      ],
      context: {
        t: 0,
        c: 0,
        editT: null,
        editC: null,
        labeled: null, // currently displayed labeled frame (Int32Array[][])
        raw: null, // current displayed raw frame (Uint8Array[][])
        cells: null,
        writeMode: 'exclude',
      },
      initial: 'waitForLabels',
      on: {
        LABELED: { actions: 'setLabeled' },
        RAW: { actions: 'setRaw' },
        CELLS: { actions: 'setCells' },
        SET_T: { actions: 'setT' },
        SET_FEATURE: { actions: 'setC' },
        SET_WRITE_MODE: { actions: 'setWriteMode' },
      },
      states: {
        // TODO: wait for raw and cells as well
        waitForLabels: {
          on: {
            LABELED: { actions: 'setLabeled', target: 'idle' },
          },
        },
        idle: {
          on: {
            EDIT: 'editing',
          },
        },
        editing: {
          entry: ['setEditT', 'setEditC'],
          invoke: {
            id: 'labelAPI',
            src: edit,
            onDone: {
              target: 'idle',
              actions: 'sendEdited',
            },
            // TODO: send error message to parent and display in UI
            onError: { target: 'idle', actions: ['sendApiError', (c, e) => console.log(c, e)] },
          },
        },
      },
    },
    {
      actions: {
        setEditT: assign({ editT: (ctx) => ctx.t }),
        setEditC: assign({ editC: (ctx) => ctx.c }),
        sendEdited: sendParent((ctx, evt) => ({
          type: 'EDITED_SEGMENT',
          labeled: evt.data.labeled,
          cells: evt.data.cells,
          t: ctx.editT,
          c: ctx.editC,
        })),
        sendApiError: sendParent('API_ERROR'),
        setRaw: assign({ raw: (_, evt) => evt.raw }),
        setLabeled: assign({ labeled: (_, evt) => evt.labeled }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        setT: assign({ t: (_, evt) => evt.t }),
        setC: assign({ c: (_, evt) => evt.feature }),
        setWriteMode: assign({ writeMode: (_, evt) => evt.writeMode }),
      },
    }
  );

export default createSegmentApiMachine;
