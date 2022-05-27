import * as zip from '@zip.js/zip.js';
import { flattenDeep } from 'lodash';
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

/** Creates a blob for a zip file with all project data. */
async function makeExportZip(context) {
  const { raw, labeled, cells, lineage } = context;
  const dimensions = {
    width: raw[0][0][0].length,
    height: raw[0][0].length,
    numFrames: raw[0].length,
    numChannels: raw.length,
    numFeatures: labeled.length,
  };
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  await zipWriter.add('dimensions.json', new zip.TextReader(JSON.stringify(dimensions)));
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(flattenDeep(labeled))));
  await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(flattenDeep(raw))));
  await zipWriter.add('cells.json', new zip.TextReader(JSON.stringify(cells)));
  if (lineage) {
    await zipWriter.add('lineage.json', new zip.TextReader(JSON.stringify(lineage)));
  }

  const zipBlob = await zipWriter.close();
  return zipBlob;
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

const createExportMachine = ({ projectId, eventBuses }) =>
  Machine(
    {
      id: 'export',
      invoke: [
        { id: 'arrays', src: fromEventBus('export', () => eventBuses.arrays) },
        { id: 'cells', src: fromEventBus('export', () => eventBuses.cells) },
      ],
      context: {
        projectId,
        bucket:
          new URLSearchParams(window.location.search).get('bucket') ?? 'deepcell-label-output',
        raw: null,
        labeled: null,
        cells: null,
        // lineage: null,
      },
      on: {
        CELLS: { actions: 'setCells' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            UPLOAD: 'uploading',
            DOWNLOAD: 'downloading',
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
          initial: 'getArrays',
          states: {
            getArrays: {
              entry: 'getArrays',
              on: { ARRAYS: { target: 'download', actions: 'setArrays' } },
            },
            download: {
              invoke: {
                src: download,
                onDone: { target: 'done', actions: 'download' },
                onError: 'done',
              },
            },
            done: { type: 'final' },
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
        getArrays: send('GET_ARRAYS', { to: 'arrays' }),
        setArrays: assign((ctx, evt) => ({
          raw: evt.raw,
          labeled: evt.labeled,
        })),
        setCells: assign((_, { cells }) => ({ cells })),
      },
    }
  );

export default createExportMachine;
