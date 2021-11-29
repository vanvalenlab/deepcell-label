import axios from 'axios';
import { Machine, sendParent } from 'xstate';

/** Returns a Promise for a DeepCell Label API call based on the event. */
function getApiService(context, event) {
  switch (event.type) {
    case 'EDIT':
      return edit(context, event);
    case 'BACKEND_UNDO':
      return undo(context, event);
    case 'BACKEND_REDO':
      return redo(context, event);
  }
}

function edit(context, event) {
  const editRoute = `${document.location.origin}/api/edit/${context.projectId}/${event.action}`;
  const options = { method: 'POST', body: new URLSearchParams(event.args) };
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
  const form = new FormData();
  form.append('id', projectId);
  form.append('bucket', bucket);
  form.append('format', new URLSearchParams(window.location.search).get('track') ? 'trk' : 'npz');
  return axios.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function download(context, event) {
  const { projectId } = context;
  const format = new URLSearchParams(window.location.search).get('track') ? 'trk' : 'npz';
  const promise = axios.get('/api/download', {
    params: { id: projectId, format: format },
    responseType: 'blob',
  });
  promise.then(response => console.log(response));
  const filename = promise.then(response => {
    const regex = /filename=(.*)$/;
    const header = response.headers['content-disposition'];
    let filename = header.match(regex)[1] ?? `${projectId}.npz`;
    // Strip quotes
    filename = filename.replaceAll('"', '');
    // Remove leading folders
    if (filename.includes('/')) {
      filename = filename.slice(filename.lastIndexOf('/') + 1);
    }
    return filename;
  });
  const url = promise.then(response => URL.createObjectURL(response.data));
  return Promise.all([filename, url]);
}

function checkResponseCode(response) {
  return response.json().then(json => {
    return response.ok ? json : Promise.reject(json);
  });
}

const createApiMachine = ({ projectId, bucket }) =>
  Machine(
    {
      id: 'api',
      context: {
        projectId,
        bucket,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            EDIT: 'loading',
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
            onError: {
              target: 'idle',
              actions: 'sendError',
            },
          },
        },
        uploading: {
          invoke: {
            src: upload,
            onDone: 'idle',
            onError: {
              target: 'idle',
              actions: 'sendError',
            },
          },
        },
        downloading: {
          invoke: {
            src: download,
            onDone: { target: 'idle', actions: 'download' },
            onError: {
              target: 'idle',
              actions: 'sendError',
            },
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
        sendEdited: sendParent((_, event) => ({
          type: 'EDITED',
          data: event.data,
        })),
        sendError: sendParent((_, event) => ({
          type: 'ERROR',
          error: event.data.error,
        })),
      },
    }
  );

export default createApiMachine;
