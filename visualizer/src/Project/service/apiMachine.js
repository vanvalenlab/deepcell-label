import * as zip from '@zip.js/zip.js';
import { flattenDeep } from 'lodash';
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
  const { labeled, raw, overlaps, writeMode, lineage, frame } = context;
  const { action, args } = event;
  const edit = { width: labeled[0].length, height: labeled.length, action, args, writeMode };

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  // Required files
  await zipWriter.add('edit.json', new zip.TextReader(JSON.stringify(edit)));
  await zipWriter.add(
    'overlaps.json',
    new zip.TextReader(JSON.stringify(overlaps.overlaps.filter((o) => o.z === frame)))
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

/** Creates a blob for a zip file with all project data. */
async function makeExportZip(context) {
  const { rawArrays, labeledArrays, overlaps, lineage } = context;
  const dimensions = {
    width: rawArrays[0][0][0].length,
    height: rawArrays[0][0].length,
    numFrames: rawArrays[0].length,
    numChannels: rawArrays.length,
    numFeatures: labeledArrays.length,
  };
  console.log(labeledArrays);
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  await zipWriter.add('dimensions.json', new zip.TextReader(JSON.stringify(dimensions)));
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(flattenDeep(labeledArrays))));
  await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(flattenDeep(rawArrays))));
  await zipWriter.add('overlaps.json', new zip.TextReader(JSON.stringify(overlaps)));
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

/** Sends a zip to the DeepCell Label API to be repackaged for upload to an S3 bucket. */
async function upload(context) {
  const { projectId, bucket } = context;
  const form = new FormData();
  const zipBlob = await makeExportZip(context);
  form.append('labels', zipBlob, 'labels.zip');
  form.append('id', projectId);
  form.append('bucket', bucket);

  const options = {
    method: 'POST',
    body: form,
    'Content-Type': 'multipart/form-data',
  };
  return fetch(`${document.location.origin}/api/upload`, options).then(checkResponseCode);
}

/** Sends a zip to the DeepCell Label API to be repackaged for download by the user.
 * @return {Promise.<URL>} A promise that resolves to an object URL for the repackaged zipfile.
 */
async function download(context) {
  const { projectId } = context;
  const form = new FormData();
  const zipBlob = await makeExportZip(context);
  console.log(zipBlob, projectId);
  form.append('labels', zipBlob, 'labels.zip');
  form.append('id', projectId);

  const options = {
    method: 'POST',
    body: form,
    'Content-Type': 'multipart/form-data',
  };
  return fetch(`${document.location.origin}/api/download`, options)
    .then(checkResponseCode)
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob));
}

function checkResponseCode(response) {
  return response.ok ? response : Promise.reject(response);
}

async function parseResponseZip(response, width, height) {
  const blob = await response.blob();
  const reader = new zip.ZipReader(new zip.BlobReader(blob));
  const entries = await reader.getEntries();
  const labeledBlob = await entries[0].getData(new zip.BlobWriter());
  const overlapsJson = await entries[1].getData(new zip.TextWriter());
  // const labeled = JSON.parse(labeledJson).map((arr) => Int32Array.from(arr));
  const labeledBuffer = await labeledBlob.arrayBuffer();
  const labeled = splitRows(labeledBuffer, width, height);
  const overlaps = JSON.parse(overlapsJson);
  await reader.close();
  return { labeled, overlaps };
}

const createApiMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'api',
      invoke: [
        { id: 'eventBus', src: fromEventBus('api', () => eventBuses.api) },
        { id: 'arrays', src: fromEventBus('api', () => eventBuses.arrays) },
        { id: 'overlaps', src: fromEventBus('api', () => eventBuses.overlaps) },
        { src: fromEventBus('api', () => eventBuses.image) },
        { src: fromEventBus('api', () => eventBuses.labeled) },
      ],
      context: {
        projectId,
        bucket:
          new URLSearchParams(window.location.search).get('bucket') ?? 'deepcell-label-output',
        frame: 0,
        feature: 0,
        labeled: null, // current frame on display (for edit route)
        raw: null, // current frame on display (for edit route)
        rawArrays: null, // all frames and channels (for upload/download route)
        labeledArrays: null, // all frames and features (for upload/download route)
        overlaps: null,
        writeMode: 'overlap',
        initialLabels: null,
        historyRef: null, // to send snapshots for undo/redo history
      },
      initial: 'waitForLabels',
      on: {
        LABELED: { actions: 'setLabeled' },
        RAW: { actions: 'setRaw' },
        OVERLAPS: { actions: 'setOverlaps' },
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
            UPLOAD: 'uploading',
            DOWNLOAD: 'downloading',
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
        uploading: {
          initial: 'getArrays',
          states: {
            getArrays: {
              entry: 'getArrays',
              on: { ARRAYS: { target: 'upload', actions: 'setArrays' } },
            },
            upload: {
              invoke: {
                src: upload,
                onDone: 'uploaded',
              },
            },
            uploaded: { type: 'final' },
          },
          onDone: 'idle',
        },
        downloading: {
          entry: (c, e) => console.log(e),
          initial: 'getArrays',
          states: {
            getArrays: {
              entry: ['getArrays', (c, e) => console.log(e)],
              on: { ARRAYS: { target: 'download', actions: 'setArrays' } },
            },
            download: {
              entry: (c, e) => console.log(e),
              invoke: {
                src: download,
                onDone: { target: 'done', actions: [(c, e) => console.log(e), 'download'] },
                onError: 'done',
              },
            },
            done: { entry: (c, e) => console.log(e), type: 'final' },
          },
          onDone: 'idle',
        },
      },
    },
    {
      actions: {
        download: (ctx, event) => {
          const url = event.data;
          const link = document.createElement('a');
          link.href = url;
          link.download = `${ctx.projectId}.zip`;
          link.click();
        },
        setInitialLabels: assign((ctx) => ({
          initialLabels: {
            frame: ctx.frame,
            feature: ctx.feature,
            labeled: ctx.labeled,
            overlaps: ctx.overlaps.overlaps.filter((o) => o.z === ctx.frame),
          },
        })),
        sendEdited: send(
          (ctx, evt) => ({
            type: 'EDITED',
            frame: ctx.initialLabels.frame,
            feature: ctx.initialLabels.feature,
            labeled: evt.data.labeled,
            overlaps: evt.data.overlaps,
          }),
          { to: 'eventBus' }
        ),
        getArrays: send('GET_ARRAYS', { to: 'arrays' }),
        setArrays: assign((ctx, evt) => ({
          rawArrays: evt.rawArrays,
          labeledArrays: evt.labeledArrays,
        })),
        setRaw: assign((_, { raw }) => ({ raw })),
        setLabeled: assign((_, { labeled }) => ({ labeled })),
        setOverlaps: assign((_, { overlaps }) => ({ overlaps })),
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
              overlaps: evt.data.overlaps,
            },
          }),
          { to: (ctx) => ctx.historyRef }
        ),
      },
    }
  );

export default createApiMachine;
