/** Perform tensorflow.js training using embeddings and labeled cell types as input data
 */

import { actions, assign, Machine, send } from 'xstate';
import { fromEventBus } from '../eventBus';
import { predict, train } from './trainingMachineUtils';

const { choose } = actions;

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
        embeddings: null,
        t: 0,
        feature: 0,
        cells: null,
        epoch: 0,
        numChannels: null, // from raw
        cellTypes: null,
        calculations: null,
        whole: false,
        uncertaintyThreshold: 0.5,
        predictionMode: 'over',
        // "Output" context
        confusionMatrix: null,
        trainCounts: null,
        valCounts: null,
        predUncertainties: null,
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
              actions: ['setCellTypes', 'setCells', 'setNumChannels', 'setEmbeddings'],
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
                THRESHOLD: { actions: 'setThreshold' },
                PREDICTION_MODE: { actions: 'setPredictionMode' },
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
                    {
                      cond: (ctx) => ctx.embedding === 'Imported',
                      actions: ['resetEpoch', 'resetLogs', send({ type: 'TRAIN', imported: true })],
                    },
                  ]),
                  on: {
                    CALCULATION: { actions: 'setCalculation', target: 'train' },
                    TRAIN: { target: 'train' },
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
                  actions: [
                    'saveModel',
                    'setConfusionMatrix',
                    'setTrainHistogram',
                    'setValHistogram',
                    'setRange',
                  ],
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
                    {
                      cond: (ctx) => ctx.embedding === 'Imported',
                      actions: send({ type: 'PREDICT', imported: true }),
                    },
                  ]),
                  on: {
                    CALCULATION: { actions: 'setCalculation', target: 'predict' },
                    PREDICT: { target: 'predict' },
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
                  actions: ['sendPredictions', 'setPredUncertainties'],
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
        setEmbeddings: assign({ embeddings: (_, evt) => evt.embeddings }),
        setNumEpochs: assign({ numEpochs: (_, evt) => evt.numEpochs }),
        setLearningRate: assign({ learningRate: (_, evt) => evt.learningRate }),
        setValSplit: assign({ valSplit: (_, evt) => evt.valSplit }),
        setThreshold: assign({ uncertaintyThreshold: (_, evt) => evt.uncertaintyThreshold }),
        setPredictionMode: assign({ predictionMode: (_, evt) => evt.predictionMode }),
        setNumChannels: assign({ numChannels: (_, evt) => evt.raw.length }),
        setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
        setT: assign({ t: (_, evt) => evt.t }),
        setFeature: assign({ feature: (_, evt) => evt.feature }),
        setEpoch: assign({ epoch: (_, evt) => evt.epoch }),
        setLogs: assign({
          valLogs: (ctx, evt) => ctx.valLogs.concat(ctx.valSplit < 1 ? [evt.logs.val_loss] : []),
          trainLogs: (ctx, evt) => ctx.trainLogs.concat([evt.logs.loss]),
        }),
        setCalculation: assign({ calculations: (_, evt) => evt.calculations }),
        setConfusionMatrix: assign({ confusionMatrix: (_, evt) => evt.confusionMatrix }),
        setTrainHistogram: assign({ trainCounts: (_, evt) => evt.trainCounts }),
        setValHistogram: assign({ valCounts: (_, evt) => evt.valCounts }),
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
        setPredUncertainties: assign({ predUncertainties: (_, evt) => evt.uncertainties }),
      },
    }
  );

export default createTrainingMachine;
