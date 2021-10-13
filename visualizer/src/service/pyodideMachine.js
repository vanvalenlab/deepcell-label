/* eslint-disable import/no-webpack-loader-syntax */
import PyodideWorker from 'worker-loader!./workers/worker';
import { assign, forwardTo, Machine, send, sendParent } from 'xstate';
import { fetchLabeled, fetchRaw, fetchSemanticLabels } from './fetch';
import { fromWebWorker } from './from-web-worker';

const loadRaw = {
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: fetchRaw,
        onDone: { target: 'done', actions: assign({ channels: (_, e) => e.data }) },
      },
    },
    done: {
      type: 'final',
    },
  },
};

const loadLabeled = {
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: fetchLabeled,
        onDone: { target: 'done', actions: assign({ features: (_, e) => e.data }) },
      },
    },
    done: {
      type: 'final',
    },
  },
};

const loadSemanticLabels = {
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: fetchSemanticLabels,
        onDone: { target: 'done', actions: assign({ semanticLabels: (_, e) => e.data }) },
      },
    },
    done: {
      type: 'final',
    },
  },
};

const createPyodideMachine = ({ projectId }) =>
  Machine(
    {
      id: 'pyodide',
      context: {
        projectId,
        numChannels: null,
        numFeatures: null,
        channel: null,
        frame: null,
        feature: null,
        channels: null,
        features: null,
        semanticLabels: null,
      },
      invoke: {
        id: 'worker',
        src: fromWebWorker(() => new PyodideWorker()),
      },
      on: {
        CHANNEL: { actions: assign({ channel: (_, event) => event.channel }) },
        FRAME: { actions: assign({ frame: (_, event) => event.frame }) },
        FEATURE: { actions: assign({ feature: (_, event) => event.feature }) },
      },
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            PROJECT: {
              target: 'loading',
              actions: [
                forwardTo('worker'),
                assign((_, { numChannels, numFeatures, numFrames }) => ({
                  numChannels,
                  numFeatures,
                  numFrames,
                })),
              ],
            },
          },
        },
        loading: {
          type: 'parallel',
          onDone: 'idle',
          states: {
            loadRaw,
            loadLabeled,
            loadSemanticLabels,
          },
        },
        idle: {
          on: {
            EDIT: {
              target: 'editing',
              actions: [
                'sendToWorker',
                (c, e) => console.log('edit sent by main', e),
                () => console.time('edit'),
              ],
            },
            EDITED: {
              actions: [(c, e) => console.log('EDITED received in idle state', e)],
            },
          },
        },
        editing: {
          after: {
            1000: {
              target: 'idle',
              actions: (c, e) => console.log('returning to idle after 1 second'),
            },
          },
          on: {
            EDITED: {
              target: 'idle',
              actions: [
                (c, e) => console.log('EDITED received by main', e),
                () => console.timeEnd('edit'),
              ],
            },
          },
        },
      },
    },
    {
      actions: {
        sendToWorker: send(
          ({ frame, feature, features }, event) => ({
            ...event,
            feature,
            frame,
            buffer: features[feature][frame],
          }),
          { to: 'worker' }
        ),
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

export default createPyodideMachine;
