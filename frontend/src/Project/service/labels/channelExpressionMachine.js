/** Makes calculations related to channel expression (mean, total, etc.) for
 * plotting and cell type clustering.
 */

 import { actions, assign, Machine, send } from 'xstate';
 import { UMAP } from 'umap-js';
 import Cells from '../../cells';
 import { fromEventBus } from '../eventBus';
 
 const { choose } = actions;

 const createChannelExpressionMachine = ({ eventBuses }) =>
   Machine(
     {
       id: 'channelExpression',
       invoke: [
         { id: 'arrays', src: fromEventBus('channelExpression', () => eventBuses.arrays, 'LABELED') },
         { id: 'cells', src: fromEventBus('channelExpression', () => eventBuses.cells, 'CELLS') },
         { id: 'load', src: fromEventBus('channelExpression', () => eventBuses.load, 'LOADED') },
         { src: fromEventBus('channelExpression', () => eventBuses.image, 'SET_T') },
         { src: fromEventBus('channelExpression', () => eventBuses.labeled, 'SET_FEATURE') },
       ],
       context: {
         t: 0,
         feature: 0,
         labeled: null, // currently displayed labeled frame (Int32Array[][])
         raw: null, // current displayed raw frame (Uint8Array[][])
         cells: null,
         numCells: null,
         calculations: null,
       },
       initial: 'loading',
       on: {
         LABELED: { actions: 'setLabeled' },
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
                      LOADED: { actions: 'setRaw', target: 'done' },
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
                },
              },
              calculating: {
                entry: choose([
                  {
                    cond: (_, evt) => evt.stat === 'Mean UMAP',
                    actions: send('MEAN_UMAP')
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total UMAP',
                    actions: send('TOTAL_UMAP')
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Mean',
                    actions: send('MEAN')
                  },
                  {
                    cond: (_, evt) => evt.stat === 'Total',
                    actions: send('TOTAL')
                  },
                ]),
                on: {
                  MEAN_UMAP: {
                    actions: ['calculateMean', 'calculateUmap'],
                    target: 'idle'
                  },
                  TOTAL_UMAP: {
                    actions: ['calculateTotal', 'calculateUmap'],
                    target: 'idle'
                  },
                  MEAN: {
                    actions: 'calculateMean',
                    target: 'idle'
                  },
                  TOTAL: {
                    actions: 'calculateTotal',
                    target: 'idle'
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
         setCells: assign({ cells: (_, evt) => evt.cells }),
         setNumCells: assign({ numCells: (_, evt) => new Cells(evt.cells).getNewCell() }),
         setT: assign({ t: (_, evt) => evt.t }),
         setFeature: assign({ feature: (_, evt) => evt.feature }),
         calculateMean: assign({ calculations: (ctx) => {
            console.time('timing');
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
            console.timeEnd('timing');
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
         calculateUmap: assign({calculations: (ctx) => {
            const {raw, calculations} = ctx;
            const numChannels = raw.length;
            let vectors = [];
            for (let i = 0; i < calculations[0].length; i++) {
              let vector = [];
              for (let c = 0; c < numChannels; c++) {
                vector.push(calculations[c][i]);
              }
              vectors.push(vector);
            }
            const umap = new UMAP();
            const embeddings = umap.fit(vectors);
            let x = [];
            let y = [];
            for (let i = 0; i < embeddings.length; i++) { 
              x.push(embeddings[i][0]);
              y.push(embeddings[i][1]);
            }
            return [x, y];
         }})
       },
     }
   );
 
 export default createChannelExpressionMachine;
 