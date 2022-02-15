import { assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

/** Returns a Promise for a DeepCell Label API call based on the event. */
function getApiService(context, event) {
  switch (event.type) {
    case 'EDIT':
      return edit(context, event);
    case 'BACKEND_UNDO':
      return undo(context, event);
    case 'BACKEND_REDO':
      return redo(context, event);
    default:
      return;
  }
}

function edit(context, event) {
  const { labeledArray, rawArray } = context;
  const { action, args } = event;
  const editRoute = `${document.location.origin}/api/edit/${action}`;
  // const usesRaw = action === 'handle_draw' || action === 'threshold' || action === 'watershed';

  const form = new FormData();
  for (const key in args) {
    form.append(key, args[key]);
  }
  form.append('labels', new Blob(labeledArray), 'labels');
  form.append('raw', new Blob(rawArray), 'raw');
  form.append('height', labeledArray.length);
  form.append('width', labeledArray[0].length);

  const options = {
    method: 'POST',
    body: form,
    'Content-Type': 'multipart/form-data',
  };
  return fetch(editRoute, options).then(checkResponseCode);
}

function undo(context, event) {
  const undoRoute = `${document.location.origin}/api/undo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(undoRoute, options).then(checkResponseCode);
}

function redo(context, event) {
  const redoRoute = `${document.location.origin}/api/redo/${context.projectId}`;
  const options = { method: 'POST' };
  return fetch(redoRoute, options).then(checkResponseCode);
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
  return response.json().then((json) => {
    return response.ok ? json : Promise.reject(json);
  });
}

const createApiMachine = ({ projectId, bucket, eventBuses }) =>
  Machine(
    {
      id: 'api',
      invoke: [
        { id: 'eventBus', src: fromEventBus('api', () => eventBuses.api) },
        { id: 'arrays', src: fromEventBus('api', () => eventBuses.arrays) },
        { src: fromEventBus('api', () => eventBuses.image) },
        { src: fromEventBus('api', () => eventBuses.labeled) },
      ],
      context: {
        projectId,
        bucket,
        frame: 0,
        feature: 0,
        actionFrame: 0,
        actionFeature: 0,
      },
      initial: 'idle',
      on: {
        LABELED_ARRAY: { actions: 'setLabeledArray' },
        RAW_ARRAY: { actions: 'setRawArray' },
        SET_FRAME: { actions: 'setFrame' },
        SET_FEATURE: { actions: 'setFeature' },
      },
      states: {
        idle: {
          on: {
            EDIT: {
              target: 'loading',
              actions: assign((context) => ({
                actionFrame: context.frame,
                actionFeature: context.feature,
              })),
            },
            BACKEND_UNDO: 'loading',
            BACKEND_REDO: 'loading',
            UPLOAD: 'uploading',
            DOWNLOAD: 'downloading',
          },
        },
        loading: {
          invoke: {
            id: 'labelAPI',
            src: getApiService,
            onDone: {
              target: 'idle',
              actions: 'sendEdited',
            },
            onError: 'idle',
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
            labeledArray: event.data.map((arr) => Int32Array.from(arr)),
          }),
          { to: 'eventBus' }
        ),
        setRawArray: assign((_, { rawArray }) => ({ rawArray })),
        setLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
      },
    }
  );

export default createApiMachine;
