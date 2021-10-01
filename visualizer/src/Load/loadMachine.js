import axios from 'axios';
import { assign, Machine } from 'xstate';

function submitExample(context) {
  const { exampleFile } = context;
  const formData = new FormData();
  formData.append('url', exampleFile);
  return axios.post('/api/project', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function submitUpload(context) {
  const { uploadFile, axes } = context;
  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('axes', axes);
  return axios.post('/api/project/dropped', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

const loadMachine = Machine(
  {
    context: {
      exampleFile: null,
      uploadFile: null,
      axes: 'ZYXC',
      errorText: '',
      track: false,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          SET_EXAMPLE_FILE: { actions: 'setExampleFile' },
          SET_UPLOAD_FILE: [
            { cond: 'isSingleFile', target: 'uploaded', actions: 'setUploadFile' },
            { target: 'error', actions: 'setSingleFileError' },
          ],
          SUBMIT_EXAMPLE: { target: 'submittingExample' },
        },
      },
      uploaded: {
        on: {
          SET_AXES: { actions: 'setAxes' },
          SUBMIT_UPLOAD: { target: 'submittingUpload' },
        },
      },
      submittingExample: {
        invoke: {
          src: submitExample,
          onDone: { actions: 'redirectToProject' },
          onError: { target: 'error', actions: [(c, e) => console.log(e), 'setErrorText'] },
        },
      },
      submittingUpload: {
        invoke: {
          src: submitUpload,
          onDone: { actions: 'redirectToProject' },
          onError: { target: 'error', actions: [(c, e) => console.log(e), 'setErrorText'] },
        },
      },
      error: {
        on: {
          SUBMIT_UPLOAD: { target: 'submittingUpload' },
          SUBMIT_EXAMPLE: { target: 'submittingExample' },
          SET_UPLOAD_FILE: [
            { cond: 'isSingleFile', target: 'uploaded', actions: 'setUploadFile' },
            { actions: 'setSingleFileError' },
          ],
        },
      },
    },
  },
  {
    guards: {
      isSingleFile: (_, { files }) => files.length === 1,
    },
    actions: {
      setExampleFile: assign({
        exampleFile: (_, { file }) => file,
        track: (_, { file }) => /\.trk$/.test(file),
      }),
      setUploadFile: assign({
        uploadFile: ({ uploadFile }, { files }) => {
          // Revoke the data uris of existing file previews to avoid memory leaks
          if (uploadFile) {
            URL.revokeObjectURL(uploadFile.preview);
          }
          const file = files[0];
          Object.assign(file, { preview: URL.createObjectURL(file) });
          return file;
        },
      }),
      setAxes: assign({ axes: (_, { axes }) => axes }),
      setErrorText: assign({ errorText: (_, event) => `${event.error}` }),
      setSingleFileError: assign({ errorText: 'Please upload a single file.' }),
      redirectToProject: ({ track }, event) => {
        const { projectId } = event.data.data;
        const url = `${document.location.origin}/project?projectId=${projectId}&download=true`;
        if (track) {
          url.append('&track=true');
        }
        window.location.href = url;
      },
    },
  }
);

export default loadMachine;