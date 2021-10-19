/* eslint-disable import/no-webpack-loader-syntax */
import PyodideWorker from 'worker-loader!./workers/worker';
import { assign, Machine, send, sendParent } from 'xstate';
import { fetchSemanticLabels } from './fetch';
import { fromWebWorker } from './from-web-worker';

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
                (c, e) => console.log(c, e),
                send(
                  (c, e) => ({
                    type: 'DIMENSIONS',
                    height: e.project.height,
                    width: e.project.width,
                  }),
                  { to: 'worker' }
                ),
                assign((_, { project, raw, labeled }) => ({
                  numChannels: project.numChannels,
                  numFeatures: project.numFeatures,
                  numFrames: project.numFrames,
                  channels: raw,
                  features: labeled,
                })),
              ],
            },
          },
        },
        loading: {
          type: 'parallel',
          onDone: 'idle',
          states: {
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
                'update',
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
        update: assign({
          features: ({ features }, { frame, feature, buffer }) => {
            features[feature][frame] = buffer;
            return features;
          },
        }),
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
