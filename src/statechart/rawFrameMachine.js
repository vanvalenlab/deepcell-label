import { Machine, assign, sendParent } from 'xstate';

// only send context updates for these fields
const filterContext = ({ rawImage }) => pickBy({ rawImage }, (v) => v !== undefined);

function fetchRawFrame(context) {
  const { projectId, channel, frame } = context;

  const fetchRaw = fetch(`/api/raw/${projectId}/${channel}/${frame}`)
    .then(response => response.json());
  return fetchRaw.then(loadIntoImage);
}

/**
 * Promise that resolves once the raw image is loaded into an Image & ready to render
 * @param {Object} data Label API response containing a raw image in data.imgs.raw
 * @returns 
 */
const loadIntoImage = data => new Promise(
  (resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = data;
  }
)

const createRawFrameMachine = ({ projectId, channel, frame }) => Machine(
  {
    context: {
      projectId,
      channel,
      frame,
      rawImage: null,
    },
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          id: 'fetch-raw-frame',
          src: fetchRawFrame,
          onDone: {
            target: 'loaded',
            actions: 'assignImage',
          },
          onError: {
            target: 'failure',
          },
        },
      },
      loaded: {
        entry: 'bubbleUp',
        on: {
          GETBUBBLEUP: { actions: 'bubbleUp' },
        }
      },
      failure: {},
    },
  },
  {
    actions: {
      bubbleUp: sendParent((context) => ({
        type: 'BUBBLEUP',
        context: filterContext(context),
      })),
      assignImage: assign({ rawImage: (context, event) => event.data }),
    }
  }
);

export default createRawFrameMachine;
