import { Machine, assign } from 'xstate';

/**
 * Promise that resolves once the raw image is loaded into an Image & ready to render
 * @param {Object} data Label API response containing a raw image in data.imgs.raw
 * @returns 
 */
const loadRawIntoImage = data => new Promise(
  (resolve, reject) => {
    const rawImage = new Image();
    rawImage.onload = () => resolve(rawImage);
    rawImage.src = data.imgs.raw;
  }
)

/**
 * Promise that resolves once the label image is loaded into an Image & ready to render
 * @param {Object} data Label API response containing a label image in data.imgs.segmented
 * @returns 
 */
const loadLabelIntoImage = data => new Promise(
  (resolve, reject) => {
    const labelImage = new Image();
    labelImage.onload = () => resolve(labelImage);
    labelImage.src = data.imgs.segmented;
  }
)

const repackageImages = (rawImage, labelImage, labelArray) => new Promise(
  (resolve, reject) => {
    resolve({
      rawImage: rawImage,
      labelImage: labelImage,
      labelArray: labelArray
    })
  }
)

function fetchProject(context) {
  const { projectId } = context;
  const loadProject = fetch(`/api/project/${projectId}`)
    .then(response => response.json());
  const loadRaw = loadProject.then(loadRawIntoImage);
  const loadLabel = loadProject.then(loadLabelIntoImage);
  return Promise.all([loadProject, loadRaw, loadLabel])
    .then(data => repackageImages(data[1], data[2], data[0].imgs.seg_arr));
}

function fetchFrame(context) {
  const { projectId, frame } = context;

  const loadFrame = fetch(`/api/changedisplay/${projectId}/frame/${frame}`, { method: 'POST' })
    .then(response => response.json());
  const loadRaw = loadFrame.then(loadRawIntoImage);
  const loadLabel = loadFrame.then(loadLabelIntoImage);
  return Promise.all([loadFrame, loadRaw, loadLabel])
    .then(data => repackageImages(data[1], data[2], data[0].imgs.seg_arr));
}

function fetchChannel(context) {
  const { projectId, channel, labelImage, labelArray } = context;

  const loadChannel = fetch(`/api/changedisplay/${projectId}/channel/${channel}`, { method: 'POST' })
    .then(response => response.json());
  const loadRaw = loadChannel.then(loadRawIntoImage);
  return loadRaw.then(data => repackageImages(data, labelImage, labelArray));
}

function fetchFeature(context) {
  const { projectId, feature, rawImage } = context;

  const loadFeature = fetch(`/api/changedisplay/${projectId}/feature/${feature}`, { method: 'POST' })
    .then(response => response.json());
  const loadLabel = loadFeature.then(loadLabelIntoImage);
  return Promise.all([loadLabel, loadFeature]).then(data => repackageImages(rawImage, data[0], data[1].imgs.seg_arr));
}


const createFrameMachine = (projectId, frame, feature, channel) => {
  return Machine({
    id: `${projectId}-frame`,
    initial: 'loading',
    context: {
      projectId,
      frame,
      feature,
      channel,
      rawImage: new Image(),
      labelImage: new Image(),
      labelArray: [[]],
      lastUpdated: null,
    },
    states: {
      loading: {
        invoke: {
          id: 'fetch-project',
          src: fetchProject,
          onDone: {
            target: 'loaded',
            actions: 'handlePayload',
          },
          onError: {
            target: 'failure',
          },
        }
      },
      loadFrame: {
        invoke: {
          id: 'fetch-frame',
          src: fetchFrame,
          onDone: {
            target: 'loaded',
            actions: 'handlePayload',
          },
          onError: {
            target: 'failure',
          },
        }
      },
      loadChannel: {
        invoke: {
          id: 'fetch-channel',
          src: fetchChannel,
          onDone: {
            target: 'loaded',
            actions: 'handlePayload',
          },
          onError: {
            target: 'failure',
          },
        }
      },
      loadFeature: {
        invoke: {
          id: 'fetch-feature',
          src: fetchFeature,
          onDone: {
            target: 'loaded',
            actions: 'handlePayload',
          },
          onError: {
            target: 'failure',
          },
        }
      },
      loaded: {
        on: {
          REFRESH: 'loading'
        }
      },
      failure: {
        on: {
          RETRY: 'loading'
        }
      }
    },
    on: {
      SETFRAME: {
        target: '.loadFrame',
        cond: 'newFrame',
        actions: assign({ frame: (context, event) => event.frame }),
      },
      SETCHANNEL: {
        target: '.loadChannel',
        cond: 'newChannel',
        actions: assign({ channel: (context, event) => event.channel }),
      },
      SETFEATURE: {
        target: '.loadFeature',
        cond: 'newFeature',
        actions: assign({ feature: (context, event) => event.feature }),
      },
    },
  },
  {
    guards: {
      newFrame: (context, event) => context.frame !== event.frame,
      newChannel: (context, event) => context.channel !== event.channel,
      newFeature: (context, event) => context.feature !== event.feature,
    },
    actions: {
      handlePayload: assign({
        rawImage: (context, event) => event.data.rawImage,
        labelImage: (context, event) => event.data.labelImage,
        labelArray: (context, event) => event.data.labelArray,
      }),
    }  
  });
};

export default createFrameMachine;