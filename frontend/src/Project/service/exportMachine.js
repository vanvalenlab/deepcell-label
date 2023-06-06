/** Collects all labeled data to be repackaged by the server for exporting. */

import * as zip from '@zip.js/zip.js';
import { flattenDeep } from 'lodash';
import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

/** Creates a blob for a zip file with all project data. */
async function makeExportZip(context) {
  const { raw, labeled, channels, cells, cellTypes, divisions, spots } = context;
  const dimensions = {
    width: raw[0][0][0].length,
    height: raw[0][0].length,
    duration: raw[0].length,
    numChannels: raw.length,
    numFeatures: labeled.length,
    dtype: raw[0][0][0].constructor.name,
  };
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  await zipWriter.add('dimensions.json', new zip.TextReader(JSON.stringify(dimensions)));
  await zipWriter.add('labeled.dat', new zip.BlobReader(new Blob(flattenDeep(labeled))));
  await zipWriter.add('raw.dat', new zip.BlobReader(new Blob(flattenDeep(raw))));
  await zipWriter.add('channels.json', new zip.TextReader(JSON.stringify(channels)));
  await zipWriter.add('cells.json', new zip.TextReader(JSON.stringify(cells)));
  await zipWriter.add('cellTypes.json', new zip.TextReader(JSON.stringify(cellTypes)));
  await zipWriter.add('divisions.json', new zip.TextReader(JSON.stringify(divisions)));
  if (spots) {
    await zipWriter.add(
      'spots.csv',
      new zip.TextReader('x,y\n' + spots.map((e) => e.join(',')).join('\n'))
    );
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
        { id: 'arrays', src: fromEventBus('export', () => eventBuses.arrays, 'ARRAYS') },
        { id: 'raw', src: fromEventBus('export', () => eventBuses.raw, 'CHANNELS') },
        { id: 'cells', src: fromEventBus('export', () => eventBuses.cells, 'CELLS') },
        { id: 'divisions', src: fromEventBus('export', () => eventBuses.divisions, 'DIVISIONS') },
        { id: 'cellTypes', src: fromEventBus('export', () => eventBuses.cellTypes, 'CELLTYPES') },
        { id: 'spots', src: fromEventBus('export', () => eventBuses.spots, 'SPOTS') },
      ],
      context: {
        projectId,
        bucket:
          new URLSearchParams(window.location.search).get('bucket') ?? 'deepcell-label-output',
        raw: null,
        labeled: null,
        cells: null,
        cellTypes: null,
        divisions: null,
        spots: null,
      },
      on: {
        CELLS: { actions: 'setCells' },
        CELLTYPES: { actions: 'setCellTypes' },
        DIVISIONS: { actions: 'setDivisions' },
        SPOTS: { actions: 'setSpots' },
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
              on: { ARRAYS: { target: 'getChannels', actions: 'setArrays' } },
            },
            getChannels: {
              entry: 'getChannels',
              on: { CHANNELS: { target: 'upload', actions: 'setChannels' } },
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
              on: { ARRAYS: { target: 'getChannels', actions: 'setArrays' } },
            },
            getChannels: {
              entry: 'getChannels',
              on: { CHANNELS: { target: 'download', actions: 'setChannels' } },
            },
            download: {
              invoke: {
                src: download,
                onDone: { target: 'done', actions: 'download' },
                onError: { target: 'done', actions: (ctx, evt) => console.log(ctx, evt) },
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
        getChannels: send('GET_CHANNELS', { to: 'raw' }),
        setArrays: assign((ctx, evt) => ({
          raw: evt.raw,
          labeled: evt.labeled,
        })),
        setChannels: assign((_, evt) => ({
          channels: evt.channels,
        })),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
        setDivisions: assign({ divisions: (_, evt) => evt.divisions }),
        setSpots: assign({ spots: (_, evt) => evt.spots }),
      },
    }
  );

export default createExportMachine;
