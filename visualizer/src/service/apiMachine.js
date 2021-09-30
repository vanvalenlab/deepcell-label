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
  const uploadRoute = `${document.location.origin}/api/upload/${bucket}/${projectId}`;
  const options = { method: 'POST' };
  return fetch(uploadRoute, options).then(checkResponseCode);
}

function download(context, event) {
  const { projectId } = context;
  console.log('downloading');
  const downloadRoute = `${document.location.origin}/api/download/${projectId}`;
  const options = { method: 'GET' };
  return fetch(downloadRoute, options).then(response => response.blob());
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
            // DOWNLOAD: {
            //   actions: ({ projectId }) => (window.location = `/api/download/${projectId}`),
            // },
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
          entry: () => console.log('downloading'),
          invoke: {
            src: download,
            onDone: { target: 'idle', actions: [(c, e) => console.log(e), 'download'] },
            onError: {
              target: 'idle',
              actions: [(c, e) => console.log(e), 'sendError'],
            },
          },
        },
      },
    },
    {
      actions: {
        download: (c, event) => {
          console.log(event);
          const blob = event.data;
          const link = document.createElement('a');
          link.href = blob;
          console.log(blob);
          link.download = 'test.npz';
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
