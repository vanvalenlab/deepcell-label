/** Manages cell type labels.
 * Broadcasts CELLTYPES event on cellTypes event bus.
 * Updates cellTypes based on edits to cells with CELLS, REPLACE, DELETE, NEW, and SWAP events.
 * Edits cellTypes with ADD_CELL, ADD_CELLTYPE, REMOVE_CELL, REMOVE_CELLTYPE, EDIT_COLOR, EDIT_NAME events.
 */

 import equal from 'fast-deep-equal';
 import { assign, Machine, send } from 'xstate';
 import { pure } from 'xstate/lib/actions';
 import { fromEventBus } from '../eventBus';
 import Cells from '../../cells';
 import { combine } from './utils';
 
// Adapted from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
const hexToRgb = (hex) => {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return [
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255,
		1
	];
}

 const createCellTypesMachine = ({ eventBuses, undoRef }) =>
   Machine({
		id: 'cellTypes',
		entry: send('REGISTER_LABELS', { to: undoRef }), 
		invoke: [
			{ id: 'eventBus', src: fromEventBus('cellTypes', () => eventBuses.cellTypes) },
			{ src: fromEventBus('cellTypes', () => eventBuses.load, 'LOADED') },
			{ src: fromEventBus('cellTypes', () => eventBuses.cells) }, // listen for edit events (REPLACE, SWAP, REMOVE) and CELLS (generic updates)
		],
		context: {
			cellTypes: [],
			cells: null,
			colorMap: null,
			undoRef: undoRef,
			historyRef: null,
			edit: null,
		},
		initial: 'loading',
		states: {
			loading: {
				type: 'parallel',
				states: {
					getCellTypes: {
						initial: 'waiting',
						states: {
							waiting: {
								on: {
									LOADED: { actions: ['setCellTypes', 'setCells', 'setColorMap', 'updateColorMap'], target: 'done' },
								},
							},
							done: { type: 'final' },
						},
					},
					getHistoryRef: {
						initial: 'waiting',
						states: {
							waiting: {
								on: {
									LABEL_HISTORY: { target: 'done', actions: 'setHistoryRef' },
								},
							},
							done: { type: 'final' },
						},
					},
				},
				onDone: { target: 'loaded' },
			},
			loaded: {
				type: 'parallel',
				states: {
					edit: {
						initial: 'idle',
						states: {
							idle: {
								entry: 'sendCellTypes',
								on: {
									// From editCellTypesMachine
									ADD_CELL: { actions: 'addCell', target: 'editing' },
									ADD_CELLTYPE: { actions: ['addCellType', 'setMaxId'], target: 'editing' },
									REMOVE_CELLTYPE: { actions: 'removeCellType', target: 'editing' },
									REMOVE_CELL: { actions: 'removeCell', target: 'editing' },
									EDIT_COLOR: { actions: 'editColor', target: 'editing' },
									EDIT_NAME: { actions: 'editName', target: 'editing' },
								},
							},
							editing: {
								entry: 'setEditEvent',
								type: 'parallel',
								states: {
									getEdit: {
										entry: 'startEdit',
										initial: 'idle',
										states: {
											idle: { on: { SAVE: { target: 'done', actions: 'setEdit' } } },
											done: { type: 'final' },
										},
									},
									getEdits: {
										initial: 'editing',
										states: {
											editing: {
												on: {
													EDITED_CELLTYPES: { target: 'done', actions: ['setEditedCellTypes', 'setColorMap', 'updateColorMap'] },
												},
											},
											done: { type: 'final' },
										},
									},
								},
								onDone: {
									target: 'idle',
									actions: 'finishEditing',
								},
							},
						},
					},
					update: {
						on: {
							// from CELLS event bus
							// REPLACE: { actions: ['replace', 'sendCellTypes'] },
							// DELETE: { actions: ['delete', 'sendCellTypes'] },
							// SWAP: { actions: ['swap', 'sendCellTypes'] },
							// EDITED_CELLS: { actions: 'updateFromCells' },
							CELLS: { actions: 'setCells' },
							RESTORE: { actions: ['setColorMap', 'updateColorMap', 'restore'] },
						},
					},
				},
			},
		},
	},
	{
		actions: {
			setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
			setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
			setCells: assign({ cells: (_, evt) => evt.cells }),
			setColorMap: assign({
				colorMap: (ctx) => {
					let numCells = new Cells(ctx.cells).getNewCell();
					let colorMap = Array(numCells).fill([0, 0, 0, 0]);
					return colorMap;
				}
			}),
			setEditEvent: assign({ editEvent: (ctx, evt) => evt }),
			startEdit: send('SAVE', { to: (ctx) => ctx.undoRef }),
			setEdit: assign({ edit: (ctx, evt) => evt.edit }),
			setEditedCellTypes: assign({ editedCellTypes: (ctx, evt) => evt.cellTypes }),
			setMaxId: assign({ maxId: (ctx) => {
					const ids = ctx.cellTypes.map(cellType => cellType.id);
					if (ids.length === 0) {
						return 0
					}
					return Math.max.apply(null, ids);
				}
			}),
			sendCellTypes: send((ctx) => ({ type: 'CELLTYPES', cellTypes: ctx.cellTypes }), {
				to: 'eventBus',
			}),
			updateColorMap: assign({colorMap: (ctx, evt) => {
				let numTypes = evt.cellTypes.length;
				let newColorMap = ctx.colorMap;
				for (let i = 0; i < numTypes; i++) {
					let numCells = evt.cellTypes[i].cells.length;
					for (let j = 0; j < numCells; j++) {
						let oldColor = newColorMap[evt.cellTypes[i].cells[j]];
						let newColor = hexToRgb(evt.cellTypes[i].color);
						const sr = newColor[0];
						const sg = newColor[1];
						const sb = newColor[2];
						const r = oldColor[0] + sr - oldColor[0] * sr;
						const g = oldColor[1] + sg - oldColor[1] * sg;
						const b = oldColor[2] + sb - oldColor[2] * sb;
						newColorMap[evt.cellTypes[i].cells[j]] = [r, g, b, 1];
					}
				}
				return newColorMap;
			}}),
			finishEditing: pure((ctx) => {
				return [
					assign({ cellTypes: (ctx) => ctx.editedCellTypes }),
					send(
					{ 
						type: 'SNAPSHOT',
						before: { type: 'RESTORE', cellTypes: ctx.cellTypes },
						after: { type: 'RESTORE', cellTypes: ctx.editedCellTypes },
						edit: ctx.edit,
					},
					{ to: ctx.historyRef }
					),
				];
			}),
			addCell: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => (cellType.id === evt.cellType && !cellType.cells.includes(evt.cell))
						? {...cellType, cells: [...cellType.cells, evt.cell].sort()}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			removeCell: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => cellType.id === evt.cellType
						? {...cellType, cells: cellType.cells.filter(
								cell => !(cell === evt.cell)
						)}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			addCellType: send((ctx, evt) => {
				let cellTypes;
				cellTypes = [...ctx.cellTypes, {id: ctx.maxId + 1, name: `Untitled ${ctx.maxId + 1}`, color: evt.color, cells: []}];
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			removeCellType: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.filter(item => !(item.id === evt.cellType));
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			editColor: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => cellType.id === evt.cellType
						? {...cellType, color: evt.color}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			editName: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => cellType.id === evt.cellType
						? {...cellType, name: evt.name}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),
			restore: pure((ctx, evt) => {
				return [
					assign({ cellTypes: evt.cellTypes }),
					send({ type: 'CELLTYPES', cellTypes: evt.cellTypes }, { to: 'eventBus' }),
				];
			}),
		},
	}
   );
 
 export default createCellTypesMachine;
 