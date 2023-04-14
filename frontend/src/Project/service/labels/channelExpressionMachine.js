/** Makes calculations related to channel expression (mean, total, etc.) for
 * plotting and cell type clustering.
 */

import { UMAP } from 'umap-js';
import { actions, assign, Machine, send } from 'xstate';
import { pure } from 'xstate/lib/actions';
import Cells from '../../cells';
import { fromEventBus } from '../eventBus';

const { choose } = actions;

export function calculateMean(ctx) {
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
  let totalValues = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let cellSizes = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let channelMeans = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
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
}

export function calculateMeanWhole(ctx) {
  const { feature, labeledFull, raw, cells, numCells } = ctx;
  const width = labeledFull[0][0][0].length;
  const height = labeledFull[0][0].length;
  const numFrames = raw[0].length;
  const numChannels = raw.length;
  const cellStructure = new Cells(cells);
  let valueMappings = [];
  for (let t = 0; t < numFrames; t++) {
    let mapping = {};
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const value = labeledFull[feature][t][i][j];
        if (mapping[value] === undefined) {
          mapping[value] = cellStructure.getCellsForValue(value, t, feature);
        }
      }
    }
    valueMappings.push(mapping);
  }
  let totalValues = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let cellSizes = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let channelMeans = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  for (let c = 0; c < numChannels; c++) {
    for (let t = 0; t < numFrames; t++) {
      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const cellList = valueMappings[t][labeledFull[feature][t][i][j]];
          for (const cell of cellList) {
            totalValues[c][cell] = totalValues[c][cell] + raw[c][t][i][j];
            cellSizes[c][cell] = cellSizes[c][cell] + 1;
          }
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
}

export function calculateTotal(ctx) {
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
  let totalValues = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let cellSizes = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
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
}

export function calculateTotalWhole(ctx) {
  const { feature, labeledFull, raw, cells, numCells } = ctx;
  const width = labeledFull[0][0][0].length;
  const height = labeledFull[0][0].length;
  const numFrames = raw[0].length;
  const numChannels = raw.length;
  const cellStructure = new Cells(cells);
  let valueMappings = [];
  for (let t = 0; t < numFrames; t++) {
    let mapping = {};
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const value = labeledFull[feature][t][i][j];
        if (mapping[value] === undefined) {
          mapping[value] = cellStructure.getCellsForValue(value, t, feature);
        }
      }
    }
    valueMappings.push(mapping);
  }
  let totalValues = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  let cellSizes = Array.from({ length: numChannels }, () => new Array(numCells).fill(0));
  for (let c = 0; c < numChannels; c++) {
    for (let t = 0; t < numFrames; t++) {
      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const cellList = valueMappings[t][labeledFull[feature][t][i][j]];
          for (const cell of cellList) {
            totalValues[c][cell] = totalValues[c][cell] + raw[c][t][i][j];
            cellSizes[c][cell] = cellSizes[c][cell] + 1;
          }
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
}

export function calculatePosition(ctx) {
  const { t, feature, labeled, cells, numCells } = ctx;
  const width = labeled[0].length;
  const height = labeled.length;
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
  let totalX = new Array(numCells).fill(0);
  let totalY = new Array(numCells).fill(0);
  let cellSizes = new Array(numCells).fill(0);
  let centroidsX = new Array(numCells).fill(0);
  let centroidsY = new Array(numCells).fill(0);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const cellList = valueMapping[labeled[i][j]];
      for (const cell of cellList) {
        totalX[cell] = totalX[cell] + j;
        totalY[cell] = totalY[cell] + height - 1 - i;
        cellSizes[cell] = cellSizes[cell] + 1;
      }
    }
  }
  for (let i = 0; i < numCells; i++) {
    centroidsX[i] = totalX[i] / cellSizes[i];
    centroidsY[i] = totalY[i] / cellSizes[i];
  }
  return [centroidsX, centroidsY];
}

const createChannelExpressionMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'channelExpression',
      invoke: [
        {
          id: 'eventBus',
          src: fromEventBus('channelExpression', () => eventBuses.channelExpression),
        },
        {
          id: 'channelExpression',
          src: fromEventBus('channelExpression', () => eventBuses.channelExpression, 'CALCULATION'),
        },
        {
          id: 'arrays',
          src: fromEventBus('channelExpression', () => eventBuses.arrays, [
            'LABELED',
            'LABELED_FULL',
          ]),
        },
        { id: 'cells', src: fromEventBus('channelExpression', () => eventBuses.cells, 'CELLS') },
        { id: 'load', src: fromEventBus('channelExpression', () => eventBuses.load, 'LOADED') },
        { src: fromEventBus('channelExpression', () => eventBuses.image, 'SET_T') },
        { src: fromEventBus('channelExpression', () => eventBuses.labeled, 'SET_FEATURE') },
      ],
      context: {
        t: 0,
        feature: 0,
        labeled: null,
        labeledFull: null,
        whole: false,
        raw: null,
        cells: null,
        numCells: null,
        channelX: 0,
        channelY: 1,
        calculations: null, // Calculations made across all frames
        embeddings: null, // Imported calculations / embeddings
        reduction: null, // The actual data calculated by the request
        calculation: null, // The type of calculation made (eg. Mean, Total)
        embeddingColorType: 'label', // Whether to use labels or uncertainty for the embedding plot
      },
      initial: 'loading',
      on: {
        LABELED: { actions: 'setLabeled' },
        LABELED_FULL: { actions: 'setLabeledFull' },
        CELLS: { actions: ['setCells', 'setNumCells'] },
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
                    LOADED: {
                      actions: ['setRaw', 'setLabeledFull', 'setEmbeddings'],
                      target: 'done',
                    },
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
                TOGGLE_WHOLE: { actions: 'toggleWhole' },
                CALCULATE: { target: 'calculating' },
                CALCULATE_UMAP: { target: 'visualizing' },
                CHANGE_COLORMAP: {
                  actions: 'setColorMap',
                },
                CHANNEL_X: { actions: 'setChannelX' },
                CHANNEL_Y: { actions: 'setChannelY' },
              },
            },
            calculating: {
              entry: choose([
                {
                  cond: (ctx, evt) => evt.stat === 'Mean' && !ctx.whole,
                  actions: ['setStat', 'calculateMean'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Total' && !ctx.whole,
                  actions: ['setStat', 'calculateTotal'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Mean' && ctx.whole,
                  actions: ['setStat', 'calculateMeanWhole'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Total' && ctx.whole,
                  actions: ['setStat', 'calculateTotalWhole'],
                },
                {
                  cond: (_, evt) => evt.stat === 'Position',
                  actions: 'calculatePosition',
                },
              ]),
              always: 'idle',
            },
            visualizing: {
              entry: choose([
                {
                  cond: (ctx, evt) => evt.stat === 'Mean' && !ctx.whole,
                  actions: ['setStat', 'calculateMean'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Total' && !ctx.whole,
                  actions: ['setStat', 'calculateTotal'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Imported' && !ctx.whole,
                  actions: send('VISUALIZE'),
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Mean' && ctx.whole,
                  actions: ['setStat', 'calculateMeanWhole'],
                },
                {
                  cond: (ctx, evt) => evt.stat === 'Total' && ctx.whole,
                  actions: ['setStat', 'calculateTotalWhole'],
                },
              ]),
              on: {
                CALCULATION: {
                  actions: 'calculateUmap',
                  target: 'idle',
                },
                VISUALIZE: {
                  actions: 'importUmap',
                  target: 'idle',
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        setRaw: assign({ raw: (_, evt) => evt.raw }),
        setLabeled: assign({ labeled: (_, evt) => evt.labeled }),
        setLabeledFull: assign({ labeledFull: (_, evt) => evt.labeled }),
        setCells: assign({ cells: (_, evt) => evt.cells }),
        setNumCells: assign({ numCells: (_, evt) => new Cells(evt.cells).getNewCell() }),
        setT: assign({ t: (_, evt) => evt.t }),
        setFeature: assign({ feature: (_, evt) => evt.feature }),
        setStat: assign({ calculation: (_, evt) => evt.stat }),
        setEmbeddings: assign({ embeddings: (_, evt) => evt.embeddings }),
        setChannelX: assign({ channelX: (_, evt) => evt.channelX }),
        setChannelY: assign({ channelY: (_, evt) => evt.channelY }),
        toggleWhole: assign({ whole: (ctx) => !ctx.whole }),
        setColorMap: assign({ embeddingColorType: (_, evt) => evt.colorMap }),
        calculateMean: pure((ctx) => {
          const channelMeans = calculateMean(ctx);
          return [
            assign({ calculations: channelMeans }),
            send({ type: 'CALCULATION', calculations: channelMeans }, { to: 'eventBus' }),
          ];
        }),
        calculateMeanWhole: pure((ctx) => {
          const channelMeans = calculateMeanWhole(ctx);
          return [
            assign({ calculations: channelMeans }),
            send({ type: 'CALCULATION', calculations: channelMeans }, { to: 'eventBus' }),
          ];
        }),
        calculateTotal: pure((ctx) => {
          const totalValues = calculateTotal(ctx);
          return [
            assign({ calculations: totalValues }),
            send({ type: 'CALCULATION', calculations: totalValues }, { to: 'eventBus' }),
          ];
        }),
        calculateTotalWhole: pure((ctx) => {
          const totalValues = calculateTotalWhole(ctx);
          return [
            assign({ calculations: totalValues }),
            send({ type: 'CALCULATION', calculations: totalValues }, { to: 'eventBus' }),
          ];
        }),
        calculatePosition: assign({ reduction: (ctx) => calculatePosition(ctx) }),
        calculateUmap: assign({
          reduction: (ctx) => {
            const { raw, calculations } = ctx;
            const numChannels = raw.length;
            let vectors = [];
            let maxes = Array(numChannels).fill(0);
            let mins = Array(numChannels).fill(Infinity);
            for (let i = 0; i < calculations[0].length; i++) {
              let vector = [];
              for (let c = 0; c < numChannels; c++) {
                const calc = calculations[c][i];
                if (isNaN(calc)) {
                  vector.push(0);
                } else {
                  if (calc > maxes[c]) {
                    maxes[c] = calc;
                  }
                  if (calc < mins[c]) {
                    mins[c] = calc;
                  }
                  vector.push(calc);
                }
              }
              if (!calculations.every((channel) => isNaN(channel[i]))) {
                vectors.push(vector);
              }
            }
            vectors = vectors.map((vector) =>
              vector.map((calc, i) =>
                maxes[i] === 0 ? 0 : (calc - mins[i]) / (maxes[i] - mins[i])
              )
            );
            const umap = new UMAP();
            const embeddings = umap.fit(vectors);
            let x = [];
            let y = [];
            let embeddingCount = 0;
            for (let i = 0; i < calculations[0].length; i++) {
              if (calculations.every((channel) => isNaN(channel[i]))) {
                x.push(NaN);
                y.push(NaN);
              } else {
                x.push(embeddings[embeddingCount][0]);
                y.push(embeddings[embeddingCount][1]);
                embeddingCount++;
              }
            }
            return [x, y];
          },
        }),
        importUmap: assign({
          reduction: (ctx) => {
            const { embeddings } = ctx;
            const vectors = embeddings.filter((vector) => !vector.every((e) => e === 0));
            const umap = new UMAP();
            const fitted = umap.fit(vectors);
            const x = [];
            const y = [];
            let vectorIndex = 0;
            for (let i = 0; i < embeddings.length; i++) {
              if (embeddings[i].every((e) => e === 0)) {
                x.push(NaN);
                y.push(NaN);
              } else {
                x.push(fitted[vectorIndex][0]);
                y.push(fitted[vectorIndex][1]);
                vectorIndex++;
              }
            }
            return [x, y];
          },
        }),
      },
    }
  );

export default createChannelExpressionMachine;
