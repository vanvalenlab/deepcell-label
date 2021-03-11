import { Machine, assign } from 'xstate';

function invokeFetchFrame(context) {
  const { frame, feature, channel } = context;

  return fetch(`http:/0.0.0.0:5000/project/`)
    .then(response => response.json())
    .then(json => json.data.children.map(child => child.data));
}

const createFrameMachine = (frame, feature, channel) => {
  return Machine({
    id: 'subreddit',
    initial: 'loading',
    context: {
      frame, // subreddit name passed in
      feature,
      channel,
      rawImage: null,
      labelImage: null,
      labelArray: null,
    },
    states: {
      loading: {
        invoke: {
          id: 'fetch-subreddit',
          src: invokeFetchSubreddit,
          onDone: {
            target: 'loaded',
            actions: assign({
              posts: (_, event) => event.data,
              lastUpdated: () => Date.now()
            })
          },
          onError: 'failure'
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
    }
  });
};

const sliceMachine = Machine(
  {
    id: 'slice',
    initial: 'idle',
    context: {
      frame: 0,
      feature: 0,
      channel: 0,

    },
  },
  {
    actions: {}
  },
);

export default sliceMachine;