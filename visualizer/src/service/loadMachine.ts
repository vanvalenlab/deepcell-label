/** Fetches data from the project storage API, including raw image data, label image data, and labels. */

import { assign, createMachine } from 'xstate';

function fetchDimensions(context: Context) {
  const { projectId } = context;
  return fetch(`/api/project/${projectId}`).then((response) => response.json());
}

function fetchRaw(context: Context) {
  const { projectId, numChannels, numFrames, height, width } = context;
  if (!numChannels || !numFrames || !height || !width) {
    return Promise.reject(new Error('Missing dimensions'));
  }

  const splitBuffer = (buffer: ArrayBuffer) => {
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const frame = [];
        for (let k = 0; k < height; k++) {
          const row = new Uint8Array(buffer, ((i * numFrames + j) * height + k) * width, width);
          frame.push(row);
          // const blob = new Blob([array], {type: 'application/octet-stream'});
        }
        frames.push(frame);
      }
      channels.push(frames);
    }
    return channels;
  };

  return fetch(`/api/raw/${projectId}`)
    .then((response) => response.arrayBuffer())
    .then(splitBuffer);
}

function fetchLabeled(context: Context) {
  const { projectId, numFeatures, numFrames, height, width } = context;
  if (!numFeatures || !numFrames || !height || !width) {
    return Promise.reject(new Error('Missing dimensions'));
  }

  const splitBuffer = (buffer: ArrayBuffer) => {
    const features = [];
    for (let i = 0; i < numFeatures; i++) {
      const frames = [];
      for (let j = 0; j < numFrames; j++) {
        const frame = [];
        for (let k = 0; k < height; k++) {
          const row = new Int32Array(buffer, ((i * numFrames + j) * height + k) * width * 4, width);
          // const blob = new Blob([array], {type: 'application/octet-stream'});
          frame.push(row);
        }
        frames.push(frame);
      }
      features.push(frames);
    }

    return features;
  };

  return fetch(`/api/labeled/${projectId}`)
    .then((response) => response.arrayBuffer())
    .then(splitBuffer);
}

function fetchLabels(context: Context) {
  const { projectId } = context;
  const pathToLabeled = `/api/labels/${projectId}`;

  return fetch(pathToLabeled).then((res) => res.json());
}

interface Context {
  projectId: string;
  numChannels: number | null;
  numFrames: number | null;
  height: number | null;
  width: number | null;
  numFeatures: number | null;
  rawArrays: Array<Array<Array<Uint8Array>>> | null;
  labeledArrays: Array<Array<Array<Int32Array>>> | null;
  labels: any | null;
}

const createLoadMachine = (projectId: string) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2BDCA6NmCWAdlDhhADLoBGYysWAZmAC4DGAFoVAMQSoFhZCAN1QBrAbmyTOJTBWq0GzdpwTDULdEzx8A2gAYAuolAAHVLDza+JkAA9EAWgCMAZgDsWffvcAmfQAcrr7OACz6AJwAbAEANCAAnk6u+r5eUQCszlHR7kFROaEAvkXxkrIQMpIAggBOtegJdIysHEQABJUAtmAElnywPHwC6uIVFVWkdQ1NSq2cnXg9fTp9agQimtYEBsZIIOaW27YOCI4REVjhUdkh4aFRrhGu8Uln7vpY7k-OIb4hAWcGVcARKZVIEyIFWmjToNXqsKwDQA7nMVEQhvxBBsxBIIdIofCZnCpgjZii0W0oOtNlpVrtbIcrKsTk4YlgQnkQdEfBcInFEoh-s4vtl3O4MvoboEor5QaUQOUCcQiYjVbNkFQaJBKZxMSMcWMlaRJpgYRrScScFrkDqWujqeotvSjIyLMybPtTo5wlgIs59KFQgF-aFXCl3K9EKEsl4IqFfFFwr5g-75eDMJCVZa1TmmvqsLAmFo8ZnldCySSzZW3UcWV7EM4AlErr5gTEMu4ot99K5QlGEB8sJkMllfH4E848u4wYr8SaMbwsUWS+NlbWPQRWWcnmkZeEIu4g+GPAOYiKHlkMhFfBEsoeIiUFQRUBA4LZjfhCaR5DRmsoqQ3Y4Gx3DJQj9AMAgyGIPj7ftBR3VIsBDcNIjAu9fBSDJZ0-SpvzkG0qzfCAgPrUBTllUVnkBYMmxTKIB0ccdPCPVxR35YF-UiYoFVw01yEI0jPXI5I8ggwJoICWCg0YjwMmQpMoh8UJvlTQ8cPnL9s2rK17SpRZln6PohK3EDHDY8CuKgmDexkhDHCPK53BvEIxwuMDfA0ssF20iBzSI-ykXQVE9M4Ezt3MqUIIjMJUiPGIB2FZCMn8VwbinfxnJnXjNLw3zAvVOgKUkSBwpAoE92cFyIkCFMY1+RKVK8fQpygwE5X8XsvKkHyKytQqguRMqRJ3FJop8WLxweAU3jCAIvhjUJINSazgW6rM+tzHS1RtO0ALC-YmWAkbIpbf0YuTeKZujSUOQKX4luBb5R3W8sBve3aeswUrDvdY77CFKL-UlTtD0DGMIgHFT5MeqSQVCZ4VOyjMvryzaLW2jVPuGgHRs+c6Jsu6aBw8Txb2h-k7xBx8cu8rT0YCmtfrrYTcfMsDxvcSaroHCUviPQNMiDWVu2Ruc6bR97SB+sw-rI3GgXk6Cciets22yRiY2HHwucPANbyyZxXt6wqce9Dx5oJrmiYS+ywk8GN9AyKDxV+dXPNp1GDtllnTJO5NOe54n7KDeb8m8FqlJiO9je+kjmc3CK7mQu5bkBNwsheBDu3m0d-E7VSPHjbqzacBMzrcQm4uDt5HBSkUAh8C3Hj7QMnyKIA */
  createMachine(
    {
      context: {
        projectId,
        numFeatures: null,
        numFrames: null,
        height: null,
        width: null,
        numChannels: null,
        rawArrays: null,
        labeledArrays: null,
        labels: null,
      },
      tsTypes: {} as import('./loadMachine.typegen').Typegen0,
      schema: {
        context: {} as Context,
        services: {} as {
          'fetch dimensions': {
            data: {
              width: number;
              height: number;
              numChannels: number;
              numFrames: number;
              numFeatures: number;
            };
          };
          'fetch labels': {
            data: { labels: any };
          };
          'fetch raw array': {
            data: Array<Array<Array<Uint8Array>>>;
          };
          'fetch labeled array': {
            data: Array<Array<Array<Int32Array>>>;
          };
        },
      },
      id: 'load',
      initial: 'loading',
      states: {
        loading: {
          type: 'parallel',
          states: {
            loadLabels: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'fetch labels',
                    onDone: [
                      {
                        actions: 'set labels',
                        target: '#load.loading.loadLabels.loaded',
                      },
                    ],
                  },
                },
                loaded: {
                  type: 'final',
                },
              },
            },
            loadArrays: {
              initial: 'fetching dimensions',
              states: {
                'fetching dimensions': {
                  invoke: {
                    src: 'fetch dimensions',
                    onDone: [
                      {
                        actions: 'set dimensions',
                        target: '#load.loading.loadArrays.loadArrays',
                      },
                    ],
                  },
                },
                loadArrays: {
                  type: 'parallel',
                  states: {
                    raw: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'fetch raw array',
                            onDone: [
                              {
                                actions: 'set raw array',
                                target: '#load.loading.loadArrays.loadArrays.raw.loaded',
                              },
                            ],
                          },
                        },
                        loaded: {
                          type: 'final',
                        },
                      },
                    },
                    labeled: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'fetch labeled array',
                            onDone: [
                              {
                                actions: 'set labeled array',
                                target: '#load.loading.loadArrays.loadArrays.labeled.loaded',
                              },
                            ],
                          },
                        },
                        loaded: {
                          type: 'final',
                        },
                      },
                    },
                  },
                  onDone: {
                    target: '#load.loading.loadArrays.loaded',
                  },
                },
                loaded: {
                  type: 'final',
                },
              },
            },
          },
          onDone: {
            target: '#load.loaded',
          },
        },
        loaded: {
          type: 'final',
        },
      },
    },
    {
      services: {
        'fetch raw array': fetchRaw,
        'fetch labeled array': fetchLabeled,
        'fetch labels': fetchLabels,
        'fetch dimensions': fetchDimensions,
      },
      actions: {
        'set raw array': assign({
          rawArrays: (context, event) => event.data,
        }),
        'set labeled array': assign({
          labeledArrays: (context, event) => event.data,
        }),
        'set labels': assign({
          labels: (context, event) => event.data,
        }),
        'set dimensions': assign({
          numChannels: (context, event) => event.data.numChannels,
          numFeatures: (context, event) => event.data.numFeatures,
          numFrames: (context, event) => event.data.numFrames,
          height: (context, event) => event.data.height,
          width: (context, event) => event.data.width,
        }),
      },
    }
  );

export default createLoadMachine;
