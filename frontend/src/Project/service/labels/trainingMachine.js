/** Perform tensorflow.js training using embeddings and labeled cell types as input data
 */

import * as tf from '@tensorflow/tfjs';
import { actions, assign, Machine, send } from 'xstate';
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
}

/** Get list of labels for a given cell
 * @param {Array} cellTypes List of cell type objects
 * @param {Array} cells A cell's ID
 * @returns List of cell type labels for a given cell
 */
export function getLabelsFromCell(cellTypes, cell) {
  const types = cellTypes.filter((cellType) => cellType.cell.includes(cell));
  const labels = types.map((cellType) => cellType.id);
  return labels;
}

/** Assuming that each cell only has one label, finds a cell's label
 * @param {Array} cellTypes List of cell type objects
 * @param {Array} cell A cell's ID
 * @returns Cell type label of given cell
 */
export function getLabelFromCell(cellTypes, cell) {
  const type = cellTypes.filter((cellType) => cellType.cells.includes(cell))[0];
  return type.id;
}

/** Get list of all labeled cells
 * @param {Array} cellTypes List of cell type objects
 * @returns List of cells with labeled cell types across all frames
 */
export function getCellList(cellTypes) {
  const cellsList = cellTypes.map((cellType) => cellType.cells).flat();
  return [...new Set(cellsList)];
}

/** Get list of labeled cells at current time
 * @param {Array} cellTypes List of cell type objects
 * @param {Array} cellsAtTime List of cells at current frame
 * @returns List of cells with labeled cell types at current frame
 */
export function getCellListAtTime(cellTypes, cellsAtTime) {
  const cellsList = getCellList(cellTypes);
  const cellsListAtTime = cellsList.filter((cell) => cellsAtTime.includes(cell));
  return cellsListAtTime;
}

/** Consolidate embedding and labeled cells into a tensor ready for training
 * @returns Tensors for training and validation data / labels, normalization range
 */
function convertToTensor(cells, embedding, cellTypes, maxId, valSplit) {
  // Convert cells and embedding lists into tensors

  return tf.tidy(() => {
    // Convert to tensor
    const inputs = cells.map((i) => embedding[i]);
    const labels = cells.map((cell) => getLabelFromCell(cellTypes, cell) - 1);
    const numExamples = inputs.length;
    const unshuffledInput = tf.tensor2d(inputs, [numExamples, inputs[0].length]);
    const unshuffledLabels = tf.oneHot(tf.tensor1d(labels, 'int32'), maxId);

    // Shuffle training data
    let indices = [...Array(cells.length).keys()];
    tf.util.shuffle(indices);
    const inputTensor = unshuffledInput.gather(indices);
    const labelTensor = unshuffledLabels.gather(indices);

    // Normalize input data
    const inputMax = inputTensor.max();
    const inputMin = inputTensor.min();

    const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));

    // Split training data
    const trainSize = Math.ceil(numExamples * valSplit);
    const valSize = numExamples - trainSize;
    const [trainInputs, valInputs] = tf.split(normalizedInputs, [trainSize, valSize], 0);
    const [trainLabels, valLabels] = tf.split(labelTensor, [trainSize, valSize], 0);

    return {
      trainInputs: trainInputs,
      trainLabels: trainLabels,
      valInputs: valInputs,
      valLabels: valLabels,
      // Return the min/max bounds so we can use them later.
      inputMax,
      inputMin,
    };
  });
}

/** Calculates the unlabeled cells to consider and predict on
 * @param {array} cells List of all cells or cells on current frame
 * @param {array} embedding Array with embedding for each cell in cells
 * @returns Array describing if each cell is labeled or not and a corresponding
 * tensor containing the relevant embeddings
 */
function getUnlabeledTensor(cells, embedding) {
  const unlabeled = embedding.map((vector, cell) =>
    cells.includes(cell) || vector.every((c) => isNaN(c)) ? false : true
  );
  const unlabeledList = embedding.filter(
    (vector, cell) => !cells.includes(cell) && !vector.every((c) => isNaN(c))
  );
  const unlabeledTensor = tf.tensor2d(unlabeledList);
  return {
    unlabeled: unlabeled,
    unlabeledTensor: unlabeledTensor,
  };
}

/** Calculate a prediction map giving predictions and unlabeled cell ids
 * @param {array} pred Array of predicted cell classes "probabilities"
 * @param {array} unlabeled Array of unlabeled cell ids
 * @returns Prediction map between cell id and cell type id prediction
 */
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
}

/** Use embedding size and number of classes, instantiate a model
 * @param {number} inputShape embedding size
 * @param {number} units number of classes that can be predicted
 * @returns Instantiated tfjs model
 */
function createModel(inputShape, units) {
  // Sequential model
  const model = tf.sequential();
  // Add input layer
  model.add(tf.layers.dense({ inputShape: inputShape, units: 1, useBias: true }));
  // Add output layer
  model.add(tf.layers.dense({ units: units, activation: 'softmax' }));

  return model;
}

/** Given hyperparameters and an instantiated model, train the model for the
 * specified number of epochs.
 * @returns Promise containing the trained model.
 */
async function trainModel(
  model,
  trainInputs,
  trainLabels,
  valInputs,
  valLabels,
  sendBack,
  batchSize,
  epochs,
  lr
) {
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(lr),
    loss: trainLabels.shape[1] === 2 ? 'binaryCrossentropy' : 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return await model.fit(trainInputs, trainLabels, {
    batchSize,
    epochs,
    shuffle: true,
    validationData: [valInputs, valLabels],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        sendBack({ type: 'SET_EPOCH', epoch: epoch, logs: logs });
      },
    },
  });
}

/** Use trained model to calculate confusion matrix on validation data
 * @param {model} model The saved model trained in tfjs
 * @param {tensor} valInputs The validation input data (X)
 * @param {tensor} valLabels The validation labels (Y)
 * @returns Normalized confusion matrix in array form
 */
function calculateConfusion(model, valInputs, valLabels) {
  const pred = model.predict(valInputs);
  const numClasses = valLabels.arraySync()[0].length;
  const decodedPredictions = pred.arraySync().map((logits) => argMax(logits));
  const decodedLabels = valLabels.arraySync().map((oneHot) => argMax(oneHot));
  const confusionMatrix = tf.math
    .confusionMatrix(decodedLabels, decodedPredictions, numClasses)
    .arraySync();
  const normalized = confusionMatrix.map((row) => {
    const sum = row.reduce((partialSum, e) => partialSum + e, 0);
    return row.map((e) => e / sum);
  });
  return normalized;
}

/** Starts training a model using the currently labeled cell type data
 * @param {number} batchSize Size of each batch used in training
 * @param {list} calculations (X, Y) where X is embedding size, Y is number of cells
 * @param {list} cells List of cell objects that are being considered
 * @param {list} cellTypes List of cell type objects
 * @param {number} feature Current segmentation mask
 * @param {number} learningRate LR parameter used for optimizer
 * @param {number} numChannels Number of channels / embedding size
 * @param {number} numEpochs How many epochs to train for
 * @param {number} t Current "time" frame
 * @param {number} valSplit Decimal representing percent of data to use in training instead of testing
 * @param {boolean} whole Whether to consider cells across all frames or just this frame
 * @returns Sends message with object mapping cell ids to cell type id predictions
 */
async function train(ctx, evt, sendBack) {
  const {
    batchSize,
    calculations,
    cells,
    cellTypes,
    feature,
    learningRate,
    numChannels,
    numEpochs,
    t,
    valSplit,
    whole,
  } = ctx;
  const cellsAtTime = new Cells(cells).getCellsListAtTime(t, feature);

  // Reorder calculations into training set format
  let vectors = [];
  for (let i = 0; i < calculations[0].length; i++) {
    let vector = [];
    for (let c = 0; c < numChannels; c++) {
      vector.push(calculations[c][i]);
    }
    vectors.push(vector);
  }

  // Get the list of labeled cells to train on and number of cell types
  const cellList = whole ? getCellList(cellTypes) : getCellListAtTime(cellTypes, cellsAtTime);
  const ids = cellTypes.map((cellType) => cellType.id);
  let maxId = 0;
  if (ids.length > 0) {
    maxId = Math.max.apply(null, ids);
  }

  // Consolidate input and calculated data into Tensor
  const { trainInputs, trainLabels, valInputs, valLabels, inputMax, inputMin } = convertToTensor(
    cellList,
    vectors,
    cellTypes,
    maxId,
    valSplit
  );

  // Instantiate and train the model with the given parameters
  const model = createModel([trainInputs.shape[1]], trainLabels.shape[1]);
  await trainModel(
    model,
    trainInputs,
    trainLabels,
    valInputs,
    valLabels,
    sendBack,
    batchSize,
    numEpochs,
    learningRate
  );

  // Calculate final confusion matrix using the validation set
  const confusionMatrix = calculateConfusion(model, valInputs, valLabels);

  // Finish by sending the trained model back to machine
  sendBack({
    type: 'DONE',
    model: model,
    confusionMatrix: confusionMatrix,
    inputMax: inputMax,
    inputMin: inputMin,
  });
}

/** Using the last saved trained model, predicts cell type labels
 * for all unlabeled cells in either the current frame or all frames
 * @param {list} calculations (X, Y) where X is embedding size, Y is number of cells
 * @param {list} cells List of cell objects that are being considered
 * @param {list} cellTypes List of cell type objects
 * @param {number} feature Current segmentation mask
 * @param {model} model Last saved model trained by tfjs
 * @param {number} numChannels Number of channels / embedding size
 * @param {tuple} range Min and max used for normalization
 * @param {number} t Current "time" frame
 * @param {boolean} whole Whether to consider cells across all frames or just this frame
 * @returns Sends message with object mapping cell ids to cell type id predictions
 */
async function predict(ctx, evt, sendBack) {
  const { calculations, cells, cellTypes, feature, model, numChannels, range, t, whole } = ctx;
  const cellsAtTime = new Cells(cells).getCellsListAtTime(t, feature);
  const [inputMin, inputMax] = range;

  // Reorder calculations into training set format
  let vectors = [];
  for (let i = 0; i < calculations[0].length; i++) {
    let vector = [];
    for (let c = 0; c < numChannels; c++) {
      vector.push(ctx.calculations[c][i]);
    }
    vectors.push(vector);
  }

  // Get the list of unlabeled cells to train on and consolidate into normalized Tensor
  const cellList = whole ? getCellList(cellTypes) : getCellListAtTime(cellTypes, cellsAtTime);
  const { unlabeled, unlabeledTensor } = getUnlabeledTensor(cellList, vectors);
  const normalized = unlabeledTensor.sub(inputMin).div(inputMax.sub(inputMin));

  // Use saved model to predict on unlabeled cells and send to machine
  const pred = model.predict(normalized);
  const predMap = await getPredictions(pred, unlabeled);
  sendBack({
    type: 'DONE',
    predMap: predMap,
  });
}

const createTrainingMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'training',
      invoke: [
        { id: 'eventBus', src: fromEventBus('training', () => eventBuses.training) },
        { id: 'load', src: fromEventBus('training', () => eventBuses.load, 'LOADED') },
        { id: 'cellTypes', src: fromEventBus('training', () => eventBuses.cellTypes) },
        { id: 'cells', src: fromEventBus('training', () => eventBuses.cells, 'CELLS') },
        {
          id: 'channelExpression',
          src: fromEventBus('training', () => eventBuses.channelExpression),
        },
        { src: fromEventBus('training', () => eventBuses.image, 'SET_T') },
        { src: fromEventBus('training', () => eventBuses.labeled, 'SET_FEATURE') },
      ],
      context: {
        // Hyperparameters
        batchSize: 1,
        numEpochs: 20,
        learningRate: 0.01,
        valSplit: 0.8,
        // "Input" context
        embedding: 'Mean',
        t: 0,
        feature: 0,
        cells: null,
        epoch: 0,
        numChannels: null, // from raw
        cellTypes: null,
        calculations: null,
        whole: false,
        // "Output" context
        confusionMatrix: null,
        range: null,
        model: null,
        valLogs: [],
        trainLogs: [],
        parameterLog: null,
      },
      initial: 'loading',
      on: {
        CELLS: { actions: 'setCells' },
        CELLTYPES: { actions: 'setCellTypes' },
        SET_T: { actions: 'setT' },
        SET_FEATURE: { actions: 'setFeature' },
      },
      states: {
        loading: {
          on: {
            LOADED: {
              actions: ['setCellTypes', 'setCells', 'setNumChannels'],
              target: 'loaded',
            },
          },
        },
        loaded: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                TRAIN: { target: 'training' },
                PREDICT: { target: 'predicting' },
                EMBEDDING: { actions: 'setEmbedding' },
                BATCH_SIZE: { actions: 'setBatchSize' },
                LEARNING_RATE: { actions: 'setLearningRate' },
                NUM_EPOCHS: { actions: 'setNumEpochs' },
                VAL_SPLIT: { actions: 'setValSplit' },
                TOGGLE_WHOLE: { actions: 'toggleWhole' },
              },
            },
            training: {
              initial: 'calculating',
              states: {
                calculating: {
                  entry: choose([
                    {
                      cond: (ctx) => ctx.embedding === 'Mean',
                      actions: ['resetEpoch', 'resetLogs', 'getMean'],
                    },
                    {
                      cond: (ctx) => ctx.embedding === 'Total',
                      actions: ['resetEpoch', 'resetLogs', 'getTotal'],
                    },
                  ]),
                  on: {
                    CALCULATION: { actions: 'setCalculation', target: 'train' },
                  },
                },
                train: {
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
                  },
                },
              },
              on: {
                CANCEL: { target: 'idle' },
                DONE: {
                  target: 'idle',
                  actions: ['saveModel', 'setConfusionMatrix', 'setRange'],
                },
              },
            },
            predicting: {
              initial: 'calculating',
              states: {
                calculating: {
                  entry: choose([
                    {
                      cond: (ctx) => ctx.embedding === 'Mean',
                      actions: 'getMean',
                    },
                    {
                      cond: (ctx) => ctx.embedding === 'Total',
                      actions: 'getTotal',
                    },
                  ]),
                  on: {
                    CALCULATION: { actions: 'setCalculation', target: 'predict' },
                  },
                },
                predict: {
                  invoke: {
                    id: 'predicting',
                    src: (ctx, evt) => (sendBack) => {
                      // TO-DO: handle errors in the predicting function
                      predict(ctx, evt, sendBack);
                    },
                    // onError: { target: 'idle', actions: (c, e) => console.log(c, e) },
                  },
                },
              },
              on: {
                DONE: {
                  target: 'idle',
                  actions: 'sendPredictions',
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        setBatchSize: assign({ batchSize: (_, evt) => evt.batchSize }),
        setCells: assign({
          cells: (ctx, evt) => evt.cells,
        }),
        setEmbedding: assign({ embedding: (_, evt) => evt.embedding }),
        setNumEpochs: assign({ numEpochs: (_, evt) => evt.numEpochs }),
        setLearningRate: assign({ learningRate: (_, evt) => evt.learningRate }),
        setValSplit: assign({ valSplit: (_, evt) => evt.valSplit }),
        setNumChannels: assign({ numChannels: (_, evt) => evt.raw.length }),
        setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
        setT: assign({ t: (_, evt) => evt.t }),
        setFeature: assign({ feature: (_, evt) => evt.feature }),
        setEpoch: assign({ epoch: (_, evt) => evt.epoch }),
        setLogs: assign({
          valLogs: (ctx, evt) => ctx.valLogs.concat([evt.logs.val_loss]),
          trainLogs: (ctx, evt) => ctx.trainLogs.concat([evt.logs.loss]),
        }),
        setCalculation: assign({ calculations: (_, evt) => evt.calculations }),
        setConfusionMatrix: assign({ confusionMatrix: (_, evt) => evt.confusionMatrix }),
        toggleWhole: assign({ whole: (ctx) => !ctx.whole }),
        getMean: send({ type: 'CALCULATE', stat: 'Mean' }, { to: 'channelExpression' }),
        getTotal: send({ type: 'CALCULATE', stat: 'Total' }, { to: 'channelExpression' }),
        resetLogs: assign({
          valLogs: [],
          trainLogs: [],
        }),
        resetEpoch: assign({ epoch: () => 0 }),
        saveModel: assign({ model: (_, evt) => evt.model }),
        setRange: assign({ range: (_, evt) => [evt.inputMin, evt.inputMax] }),
        sendPredictions: send((_, evt) => ({ type: 'ADD_PREDICTIONS', predictions: evt.predMap }), {
          to: 'cellTypes',
        }),
      },
    }
  );

export default createTrainingMachine;
