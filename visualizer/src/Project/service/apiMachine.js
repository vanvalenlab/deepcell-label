import * as zip from '@zip.js/zip.js';
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

async function edit(context, event) {
  const { labeledArray, rawArray, overlaps, writeMode, lineage } = context;
  const { action, args } = event;
  const editRoute = `${document.location.origin}/api/edit`;
  const usesRaw = action === 'active_contour' || action === 'threshold' || action === 'watershed';
  // const usesLineage = action === 'handle_draw' || action === 'threshold' || action === 'watershed';
  const width = labeledArray[0].length;
  const height = labeledArray.length;
  const edit = { width, height, action, args, writeMode };

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  // Required files
  await zipWriter.add('edit.json', new zip.TextReader(JSON.stringify(edit)));
  await zipWriter.add('overlaps.json', new zip.TextReader(JSON.stringify(overlaps)));
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(labeledArray)));
  // Optional files
  if (usesRaw) {
    await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(rawArray)));
  }
  if (lineage) {
    await zipWriter.add('lineage.json', new zip.TextReader(JSON.stringify(lineage)));
  }

  const zipBlob = await zipWriter.close();
  const form = new FormData();
  form.append('labels', zipBlob, 'labels.zip');

  const options = {
    method: 'POST',
    body: form,
    'Content-Type': 'multipart/form-data',
  };
  return fetch(editRoute, options).then(checkResponseCode);
}

function upload(context, event) {
  const { bucket, projectId } = context;
  const url = new URL(`${document.location.origin}/api/upload`);
  const track = new URLSearchParams(window.location.search).get('track');
  const form = new FormData();
  form.append('id', projectId);
  form.append('bucket', bucket);
  form.append('format', track ? 'trk' : 'npz');
  return fetch(url.toString(), {
    method: 'POST',
    body: form,
  }).then(checkResponseCode);
}

function download(context, event) {
  const { projectId } = context;
  const format = new URLSearchParams(window.location.search).get('track') ? 'trk' : 'npz';
  const url = new URL(`${document.location.origin}/api/download`);
  url.search = new URLSearchParams({ id: projectId, format: format }).toString();
  const promise = fetch(url.toString());
  promise.then((response) => console.log(response));
  const filename = promise.then((response) => {
    const regex = /filename=(.*)$/;
    const header = response.headers.get('content-disposition');
    let filename = header.match(regex)[1] ?? `${projectId}.npz`;
    // Strip quotes
    filename = filename.replaceAll('"', '');
    // Remove leading folders
    if (filename.includes('/')) {
      filename = filename.slice(filename.lastIndexOf('/') + 1);
    }
    return filename;
  });
  const blobUrl = promise
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob));
  return Promise.all([filename, blobUrl]);
}

function checkResponseCode(response) {
  return response.ok ? response : Promise.reject(response);
}

async function parseResponseZip(response) {
  const blob = await response.blob();
  const reader = new zip.ZipReader(new zip.BlobReader(blob));
  const entries = await reader.getEntries();
  const labeledJson = await entries[0].getData(new zip.TextWriter());
  const overlapsJson = await entries[1].getData(new zip.TextWriter());
  const labeled = JSON.parse(labeledJson).map((arr) => Int32Array.from(arr));
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
        frame: 0,
        feature: 0,
        actionFrame: 0,
        actionFeature: 0,
        labeledArray: null,
        rawArray: null,
        overlaps: null,
        writeMode: 'overlap',
      },
      initial: 'waitForLabels',
      on: {
        LABELED_ARRAY: { actions: 'setLabeledArray' },
        RAW_ARRAY: { actions: 'setRawArray' },
        OVERLAPS: { actions: 'setOverlaps' },
        SET_FRAME: { actions: 'setFrame' },
        SET_FEATURE: { actions: 'setFeature' },
        SET_WRITE_MODE: { actions: 'setWriteMode' },
      },
      states: {
        waitForLabels: {
          on: {
            LABELED_ARRAY: { actions: 'setLabeledArray', target: 'idle' },
          },
        },
        idle: {
          on: {
            EDIT: {
              target: 'loading',
              actions: assign((context) => ({
                actionFrame: context.frame,
                actionFeature: context.feature,
              })),
            },
            UPLOAD: 'uploading',
            DOWNLOAD: 'downloading',
          },
        },
        loading: {
          invoke: {
            id: 'labelAPI',
            src: edit,
            onDone: 'parseResponse',
            onError: 'idle',
          },
        },
        parseResponse: {
          invoke: {
            src: (ctx, evt) => parseResponseZip(evt.data),
            onDone: {
              target: 'idle',
              actions: 'sendEdited',
            },
            onError: {
              target: 'idle',
              actions: (context, event) => console.log(event),
            },
          },
        },
        uploading: {
          invoke: {
            src: upload,
            onDone: 'idle',
            onError: 'idle',
          },
        },
        downloading: {
          invoke: {
            src: download,
            onDone: { target: 'idle', actions: 'download' },
            onError: 'idle',
          },
        },
      },
    },
    {
      actions: {
        download: (_, event) => {
          const [filename, url] = event.data;
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
        },
        sendEdited: send(
          (context, event) => ({
            type: 'EDITED',
            frame: context.actionFrame,
            feature: context.actionFeature,
            labeled: event.data.labeled,
            overlaps: event.data.overlaps,
          }),
          { to: 'eventBus' }
        ),
        setRawArray: assign((_, { rawArray }) => ({ rawArray })),
        setLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
        setOverlaps: assign((_, { overlaps }) => ({ overlaps })),
        setFrame: assign((_, { frame }) => ({ frame })),
        setFeature: assign((_, { feature }) => ({ feature })),
        setWriteMode: assign((_, { writeMode }) => ({ writeMode })),
      },
    }
  );

export default createApiMachine;
