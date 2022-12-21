/** Makes calculations related to channel expression (mean, total, etc.) for
 * plotting and cell type clustering.
 */

 import { actions, assign, Machine, send, sendParent } from 'xstate';
 import * as tf from '@tensorflow/tfjs';
 import { UMAP } from 'umap-js';
 import Cells from '../../cells';
 import { fromEventBus } from '../eventBus';
 
 const { choose } = actions;

 // https://stackoverflow.com/questions/11301438/return-index-of-greatest-value-in-an-array
 export function argMax(arr) {
    if (arr.length === 0) {
        return -1;
    }
    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
 };

 export function getLabelsFromCell(cellTypes, cell) {
    const types = cellTypes.filter((cellType) => cellType.cell.includes(cell));
    const labels = types.map((cellType) => cellType.id);
    return labels;
 };

 export function getLabelFromCell(cellTypes, cell) {
    // Assuming that there is only one label per cell
    const type = cellTypes.filter((cellType) => cellType.cells.includes(cell))[0];
    return type.id;
 };

 export function getCellList(cellTypes) {
    const cellsList = cellTypes.map((cellType) => cellType.cells).flat();
    return [...new Set(cellsList)];
 };

 function convertToTensor(cells, embedding, cellTypes, maxId) {
    // Convert cells and embedding lists into tensors

    return tf.tidy(() => {
      // Convert to tensor
      const inputs = cells.map(i => embedding[i]);
      const labels = cells.map(cell => getLabelFromCell(cellTypes, cell) - 1);
      const unshuffledInput = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
      const unshuffledLabels = tf.oneHot(tf.tensor1d(labels, 'int32'), maxId);

      // Shuffle training data
      let indices = [...Array(cells.length).keys()]
      tf.util.shuffle(indices);
      const inputTensor = unshuffledInput.gather(indices);
      const labelTensor = unshuffledLabels.gather(indices);

      // Normalize input data
      const inputMax = inputTensor.max();
      const inputMin = inputTensor.min();

      const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));

      return {
        inputs: normalizedInputs,
        labels: labelTensor,
        // Return the min/max bounds so we can use them later.
        inputMax,
        inputMin,
      }
    });
 };

 function getUnlabeledTensor(cells, embedding) {
    const unlabeled = embedding.map((vector, cell) => 
      cells.includes(cell) || vector.every((c) => isNaN(c)) ? false : true);
    const unlabeledList = embedding.filter((vector, cell) => 
      !cells.includes(cell) && !vector.every((c) => isNaN(c)));
    const unlabeledTensor = tf.tensor2d(unlabeledList);
    return {
      unlabeled: unlabeled,
      unlabeledTensor: unlabeledTensor,
    }
 };

 function getPredictions(pred, unlabeled) {
    const predArr = pred.arraySync();
    let j = 0;
    let predMap = {};
    for (let i = 0; i < unlabeled.length; i++) {
      if (unlabeled[i] === true) {
        predMap[i] = argMax(predArr[j]);
        j += 1;
      }
    }
    return predMap;
 };

 function createModel(inputShape, units) {
    // Sequential model
    const model = tf.sequential();
    // Add input layer
    model.add(tf.layers.dense({inputShape: inputShape, units: 1, useBias: true}));
    // Add output layer
    model.add(tf.layers.dense({units: units, activation: 'softmax'}));

    return model;
};

 async function trainModel(model, inputs, labels, sendBack, batchSize, epochs, lr) {
    // Prepare the model for training.
    model.compile({
      optimizer: tf.train.adam(lr),
      loss: (labels.shape[1] === 2) ? 'binaryCrossentropy' : 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return await model.fit(inputs, labels, {
      batchSize,
      epochs,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          sendBack({ type: 'SET_EPOCH', epoch: epoch, logs: logs });
        },
      },
   });
};

async function train(ctx, evt, sendBack) {
  const numChannels = ctx.raw.length;
  let vectors = [];
  for (let i = 0; i < ctx.calculations[0].length; i++) {
    let vector = [];
    for (let c = 0; c < numChannels; c++) {
      vector.push(ctx.calculations[c][i]);
    }
    vectors.push(vector);
  }
  const cells = getCellList(ctx.cellTypes);
  const ids = ctx.cellTypes.map(cellType => cellType.id);
  let maxId = 0;
  if (ids.length > 0) {
    maxId = Math.max.apply(null, ids);
  }
  const { inputs, labels, inputMax, inputMin } = convertToTensor(cells, vectors, ctx.cellTypes, maxId);

  const model = createModel([inputs.shape[1]], labels.shape[1]);
  await trainModel(model, inputs, labels, sendBack, evt.batchSize, evt.epochs, evt.lr);
  // Finish by sending the trained model back to parent
  sendBack({type: 'DONE', model: model, inputMax: inputMax, inputMin: inputMin, epoch: 0});
};

async function predict(ctx, evt) {
  const numChannels = ctx.raw.length;
  let vectors = [];
  for (let i = 0; i < ctx.calculations[0].length; i++) {
    let vector = [];
    for (let c = 0; c < numChannels; c++) {
      vector.push(ctx.calculations[c][i]);
    }
    vectors.push(vector);
  }
  const [inputMin, inputMax] = ctx.range;
  const cells = getCellList(ctx.cellTypes);
  const { unlabeled, unlabeledTensor } = getUnlabeledTensor(cells, vectors);
  const normalized = unlabeledTensor.sub(inputMin).div(inputMax.sub(inputMin));
  const pred = ctx.model.predict(normalized);
  const predMap = await getPredictions(pred, unlabeled);
  return predMap;
}

 const createChannelExpressionMachine = ({ eventBuses }) =>
   Machine(
     {
       id: 'channelExpression',
       invoke: [
         { id: 'arrays', src: fromEventBus('channelExpression', () => eventBuses.arrays, 'LABELED') },
         { id: 'cells', src: fromEventBus('channelExpression', () => eventBuses.cells, 'CELLS') },
         { id: 'load', src: fromEventBus('channelExpression', () => eventBuses.load, 'LOADED') },
         { id: 'cellTypes', src: fromEventBus('channelExpression', () => eventBuses.cellTypes) },
         { src: fromEventBus('channelExpression', () => eventBuses.image, 'SET_T') },
         { src: fromEventBus('channelExpression', () => eventBuses.labeled, 'SET_FEATURE') },
       ],
       context: {
         t: 0,
         feature: 0,
         epoch: 0,
         range: null,
         labeled: null, // currently displayed labeled frame (Int32Array[][])
         raw: null, // current displayed raw frame (?Array[][])
         cells: null,
         cellTypes: null,
         numCells: null,
         calculations: null,
         reduction: null,
         calculation: null,
         model: null,
         logs: [],
       },
       initial: 'loading',
       on: {
         LABELED: { actions: 'setLabeled' },
         RAW: { actions: 'setRaw' },
         CELLS: { actions: ['setCells', 'setNumCells'] },
         CELLTYPES: { actions: 'setCellTypes' },
         SET_T: { actions: 'setT' },
         SET_FEATURE: { actions: 'setFeature' },
       },
       states: {
          loading: {
            type: 'parallel',
            states: {
              getRaw: {
                initial: 'waiting',
                states: {
                  waiting: {
                    on: {
                      LOADED: { actions: ['setRaw', 'setCellTypes'], target: 'done' },
                    },
                  },
                  done: { type: 'final' },
                },
              },
              getLabels: {
                initial: 'waiting',
                states: {
                  waiting: {
                    on: {
                      LABELED: { actions: 'setLabeled', target: 'done' },
                    },
                  },
                  done: { type: 'final' },
                },
              },
            },
            onDone: { target: 'loaded' },
          },
          loaded: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  CALCULATE: { target: 'calculating' },
                  CALCULATE_UMAP: { target: 'visualizing' },
                  TRAIN: { target: 'training' },
                  PREDICT: { target: 'predicting' },
                },
              },
              calculating: {
                entry: choose([
                  {
                    cond: (_, evt) => evt.stat === 'Mean',
                    actions: ['setStat', 'calculateMean'],
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total',
                    actions: ['setStat', 'calculateTotal'],
                  },
                ]), 
                always: 'idle',
              },
              visualizing: {
                entry: choose([
                  {
                    cond: (_, evt) => evt.stat === 'Mean',
                    actions: ['setStat', 'resetLogs', 'calculateMean', 'calculateUmap'],
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total',
                    actions: ['setStat', 'resetLogs', 'calculateTotal', 'calculateUmap'],
                  },
                ]),
                always: 'idle',
              },
              training: {
                entry: choose([
                  {
                    cond: (_, evt) => evt.stat === 'Mean',
                    actions: ['setStat', 'calculateMean', 'resetLogs', 'resetVis'],
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total',
                    actions: ['setStat', 'calculateTotal', 'resetLogs', 'resetVis'],
                  },
                ]),
                invoke: {
                  id: 'training',
                  src: (ctx, evt) => (sendBack) => {
                    // TO-DO: handle errors in the training function
                    train(ctx, evt, sendBack);
                  },
                  // onError: { target: 'idle', actions: (c, e) => console.log(c, e) },
                },
                on: {
                  SET_EPOCH: { actions: ['setEpoch', 'setLogs'] },
                  DONE: {
                    target: 'idle',
                    actions: ['setEpoch', 'setModel', 'setRange'],
                  },
                }
              },
              predicting: {
                entry: choose([
                  {
                    cond: (_, evt) => evt.stat === 'Mean',
                    actions: ['setStat', 'calculateMean'],
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total',
                    actions: ['setStat', 'calculateTotal'],
                  },
                ]),
                invoke: {
                  id: 'predicting',
                  src: predict,
                  onDone: {
                    target: 'idle',
                    actions: 'sendPredictions',
                  },
                  // TODO: send error message to parent and display in UI
                  onError: { target: 'idle', actions: ['sendApiError', (c, e) => console.log(c, e)] },
                },
              }
            },
          },
       },
     },
     {
       actions: {
         setRaw: assign({ raw: (_, evt) => evt.raw }),
         setLabeled: assign({ labeled: (_, evt) => evt.labeled }),
         setCells: assign({ cells: (_, evt) => evt.cells }),
         setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
         setNumCells: assign({ numCells: (_, evt) => new Cells(evt.cells).getNewCell() }),
         setT: assign({ t: (_, evt) => evt.t }),
         setFeature: assign({ feature: (_, evt) => evt.feature }),
         setEpoch: assign({ epoch: (_, evt) => evt.epoch }),
         setLogs: assign({ logs: (ctx, evt) => ctx.logs.concat([evt.logs.loss]) }),
         resetLogs: assign({ logs: (_) => [] }),
         resetVis: assign({ reduction: (_) => null }),
         setStat: assign({ calculation: (_, evt) => evt.stat }),
         setModel: assign({ model: (_, evt) => evt.model }),
         setRange: assign({ range: (_, evt) => [evt.inputMin, evt.inputMax] }),
         sendPredictions: send((_, evt) => ({ type: 'ADD_PREDICTIONS', predictions: evt.data }), { to: 'cellTypes', }),
         calculateMean: assign({ calculations: (ctx) => {
            const { t, feature, labeled, raw, cells, numCells } = ctx;
            const width = labeled[0].length;
            const height = labeled.length;
            const numChannels = raw.length;
            const cellStructure = new Cells(cells);
            let valueMapping = {};
            for (let i = 0; i < height; i++) {
              for (let j = 0; j < width; j++) {
                const value = labeled[i][j];
                if (valueMapping[value] === undefined) {
                  valueMapping[value] = cellStructure.getCellsForValue(value, t, feature);
                }
              }
            }
            let totalValues = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            let cellSizes = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            let channelMeans = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            for (let c = 0; c < numChannels; c++) {
              for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                  const cellList = valueMapping[labeled[i][j]];
                  for (const cell of cellList) {
                    totalValues[c][cell] = totalValues[c][cell] + raw[c][t][i][j];
                    cellSizes[c][cell] = cellSizes[c][cell] + 1;
                  }
                }
              }
            }
            for (let c = 0; c < numChannels; c++) {
              for (let i = 0; i < numCells; i++) {
                channelMeans[c][i] = totalValues[c][i] / cellSizes[c][i];
              }
            }
            return channelMeans;
         }}),
         calculateTotal: assign({ calculations: (ctx) => {
          const { t, feature, labeled, raw, cells, numCells } = ctx;
          const width = labeled[0].length;
          const height = labeled.length;
          const numChannels = raw.length;
          const cellStructure = new Cells(cells);
            let valueMapping = {};
            for (let i = 0; i < height; i++) {
              for (let j = 0; j < width; j++) {
                const value = labeled[i][j];
                if (valueMapping[value] === undefined) {
                  valueMapping[value] = cellStructure.getCellsForValue(value, t, feature);
                }
              }
            }
          let totalValues = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
          let cellSizes = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
          for (let c = 0; c < numChannels; c++) {
            for (let i = 0; i < height; i++) {
              for (let j = 0; j < width; j++) {
                const cellList = valueMapping[labeled[i][j]];
                for (const cell of cellList) {
                  totalValues[c][cell] = totalValues[c][cell] + raw[c][t][i][j];
                  cellSizes[c][cell] = cellSizes[c][cell] + 1;
                }
              }
            }
          }
          for (let i = 0; i < numCells; i++) {
            if (cellSizes[0][i] === 0) {
              for (let c = 0; c < numChannels; c++) {
                totalValues[c][i] = NaN;
              }
            }
          }
          return totalValues;
         }}),
         calculateUmap: assign({reduction: (ctx) => {
            const {raw, calculations} = ctx;
            const numChannels = raw.length;
            let vectors = [];
            let maxes = Array(numChannels).fill(0);
            for (let i = 0; i < calculations[0].length; i++) {
              let vector = [];
              for (let c = 0; c < numChannels; c++) {
                const calc = calculations[c][i];
                if (isNaN(calc)) {
                  vector.push(0);
                }
                else {
                  if (calc > maxes[c]) {
                    maxes[c] = calc;
                  }
                  vector.push(calc);
                }
              }
              if (!calculations.every((channel) => isNaN(channel[i]))) {
                vectors.push(vector);
              }
            }
            vectors = vectors.map(vector => vector.map((calc, i) => (maxes[i] === 0) ? 0 : calc / maxes[i]));
            const umap = new UMAP();
            const embeddings = umap.fit(vectors);
            let x = [];
            let y = [];
            let embeddingCount = 0;
            for (let i = 0; i < calculations[0].length; i++) { 
              if (calculations.every((channel) => isNaN(channel[i]))) {
                x.push(NaN);
                y.push(NaN);
              }
              else {
                x.push(embeddings[embeddingCount][0]);
                y.push(embeddings[embeddingCount][1]);
                embeddingCount++;
              }
            }
            return [x, y];
         }}),
       },
     }
   );
 
 export default createChannelExpressionMachine;
 