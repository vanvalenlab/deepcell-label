import * as tf from '@tensorflow/tfjs';
import { Dense } from '@tensorflow/tfjs-layers/dist/layers/core';
import { categoricalCrossentropy } from '@tensorflow/tfjs-layers/dist/losses';
import Cells from '../../cells';
import { meanFieldLogits, RandomFeatureGaussianProcess } from './tensorflow/gaussianProcessLayer';
import { SNGP } from './tensorflow/sngp';
import { SpectralNormalization } from './tensorflow/spectralNormalizationLayer';

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
    const inputMax = inputTensor.max(0, true);
    const inputMin = inputTensor.min(0, true);
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
 * @returns Prediction map between cell id and cell type id prediction and array of uncertainties
 */
function getPredictions(pred, unlabeled, threshold, mode) {
  let j = 0;
  let predMap = {};
  const uncertainties = [];
  if (mode === 'over') {
    for (let i = 0; i < unlabeled.length; i++) {
      if (unlabeled[i] === true) {
        const prediction = Math.max(...pred[j]);
        if (prediction + threshold < 1) {
          predMap[i] = argMax(pred[j]);
        }
        uncertainties.push(1 - prediction);
        j += 1;
      } else {
        uncertainties.push(NaN);
      }
    }
  } else if (mode === 'under') {
    for (let i = 0; i < unlabeled.length; i++) {
      if (unlabeled[i] === true) {
        const prediction = Math.max(...pred[j]);
        if (prediction + threshold > 1) {
          predMap[i] = argMax(pred[j]);
        }
        uncertainties.push(1 - prediction);
        j += 1;
      } else {
        uncertainties.push(NaN);
      }
    }
  } else {
    for (let i = 0; i < unlabeled.length; i++) {
      if (unlabeled[i] === true) {
        uncertainties.push(1 - Math.max(...pred[j]));
        j += 1;
      } else {
        uncertainties.push(NaN);
      }
    }
  }
  return { predMap, uncertainties };
}

/** Use embedding size and number of classes, instantiate a model
 * @param {number} inputShape embedding size
 * @param {number} units number of classes that can be predicted
 * @returns Instantiated tfjs model
 */
function createModel(inputShape, units) {
  const input = tf.input({ shape: inputShape });
  const hiddenLayer = new SpectralNormalization(
    new Dense({ units: 32, useBias: true, activation: 'relu' })
  );
  const dropoutOne = tf.layers.dropout({ rate: 0.1 });
  const hiddenLayerTwo = new SpectralNormalization(new Dense({ units: 32, useBias: true }));
  const dropoutTwo = tf.layers.dropout({ rate: 0.1 });
  const outputLayer = new RandomFeatureGaussianProcess(units, 64);
  const output = outputLayer.apply(
    dropoutTwo.apply(hiddenLayerTwo.apply(dropoutOne.apply(hiddenLayer.apply(input))))
  );
  const model = new SNGP(input, output);
  model.summary();

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
  valSplit,
  sendBack,
  batchSize,
  epochs,
  lr,
  classWeight
) {
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(lr),
    loss: (target, output) => categoricalCrossentropy(target, output, true),
    metrics: ['accuracy'],
  });

  return await model.fit(trainInputs, trainLabels, {
    batchSize,
    epochs,
    shuffle: true,
    validationData: valSplit < 1 ? [valInputs, valLabels] : undefined,
    callbacks: {
      onEpochBegin: (epoch) => {
        if (epoch > 0) {
          model.layers[5].resetCovarianceMatrix();
        }
      },
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

/** Calculate histogram distribution for training/val sets
 * @param {tensor} trainLabels The training label data
 * @param {tensor} valLabels The validation labels
 * @returns Counts of each label in train and val
 */
function calculateHistograms(trainLabels, valLabels, cellTypes) {
  const decodedTrain = trainLabels.argMax(1).arraySync();
  const decodedVal = valLabels.argMax(1).arraySync();
  const trainCounts = {};
  const valCounts = {};

  const names = cellTypes.map((cellType) => cellType.name);

  for (const name of names) {
    trainCounts[name] = 0;
    valCounts[name] = 0;
  }

  for (const label of decodedTrain) {
    trainCounts[label + 1] = trainCounts[label + 1] ? trainCounts[label + 1] + 1 : 1;
  }

  for (const label of decodedVal) {
    valCounts[label + 1] = valCounts[label + 1] ? valCounts[label + 1] + 1 : 1;
  }

  return { trainCounts, valCounts };
}

function calculateClassWeight(cellTypes, maxId) {
  // Assume each sample belongs to one class
  const sorted = [...cellTypes].sort((a, b) => (a.id > b.id ? 1 : -1));
  let numExamples = new Array(maxId).fill(0);
  for (const cellType of sorted) {
    numExamples[cellType.id - 1] = cellType.cells.length;
  }
  const totalExamples = numExamples.reduce((acc, i) => acc + i, 0);
  const classWeightArray = numExamples.map((num) => (num === 0 ? 0 : totalExamples / num));
  const classWeights = classWeightArray.reduce((acc, weight, index) => {
    return { ...acc, [index]: weight };
  }, {});
  return classWeights;
}

function getProbabilities(logits, covariance) {
  const logitsAdjusted = meanFieldLogits(logits, covariance, Math.PI / 8);
  const probabilities = logitsAdjusted.softmax().arraySync();
  return probabilities;
}

/** Starts training a model using the currently labeled cell type data
 * @param {number} batchSize Size of each batch used in training
 * @param {array} calculations (X, Y) where X is embedding size, Y is number of cells
 * @param {array} cells List of cell objects that are being considered
 * @param {array} cellTypes List of cell type objects
 * @param {number} feature Current segmentation mask
 * @param {number} learningRate LR parameter used for optimizer
 * @param {number} numChannels Number of channels / embedding size
 * @param {number} numEpochs How many epochs to train for
 * @param {number} t Current "time" frame
 * @param {number} valSplit Decimal representing percent of data to use in training instead of testing
 * @param {boolean} whole Whether to consider cells across all frames or just this frame
 * @returns Sends message with object mapping cell ids to cell type id predictions
 */
export async function train(ctx, evt, sendBack) {
  const {
    batchSize,
    calculations,
    cells,
    feature,
    learningRate,
    numChannels,
    numEpochs,
    t,
    valSplit,
    whole,
  } = ctx;
  const cellTypes = ctx.cellTypes.filter((cellType) => cellType.feature === feature);
  const cellsAtTime = new Cells(cells).getCellsListAtTime(t, feature);

  // Check if using imported embedding
  let vectors = [];
  if (evt.imported) {
    vectors = ctx.embeddings;
  } else {
    // Otherwise, reorder calculations into training set format
    for (let i = 0; i < calculations[0].length; i++) {
      let vector = [];
      for (let c = 0; c < numChannels; c++) {
        vector.push(calculations[c][i]);
      }
      vectors.push(vector);
    }
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

  // Get class weights for weighted loss function
  const classWeight = calculateClassWeight(cellTypes, maxId);

  // Instantiate and train the model with the given parameters
  const model = createModel([trainInputs.shape[1]], trainLabels.shape[1]);
  await trainModel(
    model,
    trainInputs,
    trainLabels,
    valInputs,
    valLabels,
    valSplit,
    sendBack,
    batchSize,
    numEpochs,
    learningRate,
    classWeight
  );

  // Calculate final confusion matrix using the validation set
  const confusionMatrix =
    valSplit < 1 ? calculateConfusion(model, valInputs, valLabels) : undefined;
  // Calculate distribution of training and validation sets
  const { trainCounts, valCounts } = calculateHistograms(trainLabels, valLabels, cellTypes);

  // Finish by sending the trained model back to machine
  sendBack({
    type: 'DONE',
    model: model,
    confusionMatrix: confusionMatrix,
    inputMax: inputMax,
    inputMin: inputMin,
    trainCounts: trainCounts,
    valCounts: valCounts,
  });
}

/** Using the last saved trained model, predicts cell type labels
 * for all unlabeled cells in either the current frame or all frames
 * @param {array} calculations (X, Y) where X is embedding size, Y is number of cells
 * @param {array} cells List of cell objects that are being considered
 * @param {array} cellTypes List of cell type objects
 * @param {number} feature Current segmentation mask
 * @param {model} model Last saved model trained by tfjs
 * @param {number} numChannels Number of channels / embedding size
 * @param {tuple} range Min and max used for normalization
 * @param {number} t Current "time" frame
 * @param {boolean} whole Whether to consider cells across all frames or just this frame
 * @returns Sends message with object mapping cell ids to cell type id predictions
 */
export function predict(ctx, evt, sendBack) {
  const {
    calculations,
    cells,
    cellTypes,
    feature,
    model,
    numChannels,
    range,
    t,
    whole,
    uncertaintyThreshold,
    predictionMode,
  } = ctx;
  const cellsAtTime = new Cells(cells).getCellsListAtTime(t, feature);
  const [inputMin, inputMax] = range;

  // Check if using imported embedding
  let vectors = [];
  if (evt.imported) {
    vectors = ctx.embeddings;
  } else {
    // Otherwise, reorder calculations into training set format
    for (let i = 0; i < calculations[0].length; i++) {
      let vector = [];
      for (let c = 0; c < numChannels; c++) {
        vector.push(calculations[c][i]);
      }
      vectors.push(vector);
    }
  }

  // Get the list of unlabeled cells to train on and consolidate into normalized Tensor
  const cellList = whole ? getCellList(cellTypes) : getCellListAtTime(cellTypes, cellsAtTime);
  const { unlabeled, unlabeledTensor } = getUnlabeledTensor(cellList, vectors);
  const normalized = unlabeledTensor.sub(inputMin).div(inputMax.sub(inputMin));

  // Use saved model to predict on unlabeled cells and send to machine
  const [logits, covariance] = model.call(normalized);
  const pred = getProbabilities(logits, covariance);
  const { predMap, uncertainties } = getPredictions(
    pred,
    unlabeled,
    uncertaintyThreshold,
    predictionMode
  );
  sendBack({
    type: 'DONE',
    predMap: predMap,
    uncertainties: uncertainties,
  });
}
