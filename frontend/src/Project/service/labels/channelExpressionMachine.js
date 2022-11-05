/** Makes calculations related to channel expression (mean, total, etc.) for
 * plotting and cell type clustering.
 */

 import { assign, Machine } from 'xstate';
 import Cells from '../../cells';
 import { fromEventBus } from '../eventBus';
 
 const createChannelExpressionMachine = ({ eventBuses }) =>
   Machine(
     {
       id: 'channelExpression',
       invoke: [
         { id: 'arrays', src: fromEventBus('channelExpression', () => eventBuses.arrays, 'LABELED') },
         { id: 'cells', src: fromEventBus('channelExpression', () => eventBuses.cells, 'CELLS') },
         { id: 'load', src: fromEventBus('channelExpression', () => eventBuses.load, 'LOADED') },
         { src: fromEventBus('channelExpression', () => eventBuses.image, 'SET_T') },
       ],
       context: {
         t: 0,
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
                  CALCULATE: { target: 'calculating' }
                },
              },
              calculating: {
                entry: 'calculate',
                always: 'idle',
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
         calculate: assign({ calculations: (ctx, evt) => {
            const { t, labeled, raw, numCells } = ctx;
            const width = labeled[0].length;
            const height = labeled.length;
            const numChannels = raw.length;
            let totalValues = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            let cellSizes = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            let channelMeans = Array.from({length: numChannels}, () => new Array(numCells).fill(0));
            for (let c = 0; c < numChannels; c++) {
              for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                  let cell = labeled[i][j];
                  if (cell > 0) {
                    totalValues[c][cell] = totalValues[c][cell] + raw[c][t][i][j];
                    cellSizes[c][cell] = cellSizes[c][cell] + 1;
                  }
                };
              };
            };
            if (evt.stat === 'Total') {
              for (let i = 0; i < numCells; i++) {
                if (cellSizes[0][i] === 0) {
                  for (let c = 0; c < numChannels; c++) {
                    totalValues[c][i] = NaN;
                  }
                }
              }
              return totalValues;
            }
            else if (evt.stat === 'Mean') {
              for (let c = 0; c < numChannels; c++) {
                for (let i = 0; i < numCells; i++) {
                  channelMeans[c][i] = totalValues[c][i] / cellSizes[c][i];
                };
              };
              return channelMeans;
            }
            return null;
         }}),
       },
     }
   );
 
 export default createChannelExpressionMachine;
 