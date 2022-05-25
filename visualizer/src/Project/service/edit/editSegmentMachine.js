import * as zip from '@zip.js/zip.js';
import { assign, forwardTo, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

function splitRows(buffer, width, height) {
  const frame = [];
  for (let i = 0; i < height; i++) {
    const row = new Int32Array(buffer, width * i * 4, width);
    frame.push(row);
  }
  return frame;
}

/** Creates a blob for a zip file with all project . */
async function makeEditZip(context, event) {
  const { labeled, raw, cells, writeMode, lineage, frame } = context;
  const { action, args } = event;
  const edit = { width: labeled[0].length, height: labeled.length, action, args, writeMode };

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  // Required files
  await zipWriter.add('edit.json', new zip.TextReader(JSON.stringify(edit)));
  await zipWriter.add(
    'cells.json',
    new zip.TextReader(JSON.stringify(cells.cells.filter((o) => o.z === frame)))
  );
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(labeled)));
  // Optional files
  const usesRaw = action === 'active_contour' || action === 'threshold' || action === 'watershed';
  if (usesRaw) {
    await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(raw)));
  }
  if (lineage) {
    await zipWriter.add('lineage.json', new zip.TextReader(JSON.stringify(lineage)));
  }

  const zipBlob = await zipWriter.close();
  return zipBlob;
}

/** Sends a zip with labels to edit and to the DeepCell Label API for editing the labels in the zip. */
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

const createEditSegmentMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'editSegment',
      invoke: [
        { id: 'eventBus', src: fromEventBus('editSegment', () => eventBuses.api) },
        { id: 'arrays', src: fromEventBus('editSegment', () => eventBuses.arrays) },
        { id: 'cells', src: fromEventBus('editSegment', () => eventBuses.cells) },
        { src: fromEventBus('editSegment', () => eventBuses.image) },
        { src: fromEventBus('editSegment', () => eventBuses.labeled) },
      ],
      context: {
        frame: 0,
        feature: 0,
        labeled: null, // current frame on display (for edit route)
        raw: null, // current frame on display (for edit route)
        cells: null,
        writeMode: 'overlap',
        initialLabels: null,
        historyRef: null, // to send snapshots for undo/redo history
      },
      initial: 'waitForLabels',
      on: {
        LABELED: { actions: 'setLabeled' },
        RAW: { actions: 'setRaw' },
        CELLS: { actions: 'setCells' },
        SET_FRAME: { actions: 'setFrame' },
        SET_FEATURE: { actions: 'setFeature' },
        SET_WRITE_MODE: { actions: 'setWriteMode' },
        HISTORY_REF: { actions: 'setHistoryRef' }, // TODO: check that history ref is set before allowing edits
        EDITED: { actions: forwardTo('eventBus') },
      },
      states: {
        waitForLabels: {
          on: {
            LABELED: { actions: 'setLabeled', target: 'idle' },
          },
        },
        idle: {
          on: {
            EDIT: { target: 'editing', actions: 'setInitialLabels' },
          },
        },
        editing: {
          invoke: {
            id: 'labelAPI',
            src: edit,
            onDone: {
              target: 'idle',
              actions: [(c, e) => console.log(c, e), 'sendEdited', 'sendSnapshot'],
            },
            onError: { target: 'idle', actions: (c, e) => console.log(c, e) },
          },
        },
      },
    },
    {
      actions: {
        setInitialLabels: assign((ctx) => ({
          initialLabels: {
            frame: ctx.frame,
            feature: ctx.feature,
            labeled: ctx.labeled,
            cells: ctx.cells.cells.filter((o) => o.z === ctx.frame),
          },
        })),
        sendEdited: send(
          (ctx, evt) => ({
            type: 'EDITED',
            frame: ctx.initialLabels.frame,
            feature: ctx.initialLabels.feature,
            labeled: evt.data.labeled,
            cells: evt.data.cells,
          }),
          { to: 'eventBus' }
        ),
        setRaw: assign((_, { raw }) => ({ raw })),
        setLabeled: assign((_, { labeled }) => ({ labeled })),
        setCells: assign((_, { cells }) => ({ cells })),
        setFrame: assign((_, { frame }) => ({ frame })),
        setFeature: assign((_, { feature }) => ({ feature })),
        setWriteMode: assign((_, { writeMode }) => ({ writeMode })),
        // undo redo
        setHistoryRef: assign({ historyRef: (ctx, evt, meta) => meta._event.origin }),
        sendSnapshot: send(
          (ctx, evt) => ({
            type: 'SAVE_LABELS',
            initialLabels: ctx.initialLabels,
            editedLabels: {
              frame: ctx.initialLabels.frame,
              feature: ctx.initialLabels.feature,
              labeled: evt.data.labeled,
              cells: evt.data.cells,
            },
          }),
          { to: (ctx) => ctx.historyRef }
        ),
      },
    }
  );

export default createEditSegmentMachine;
