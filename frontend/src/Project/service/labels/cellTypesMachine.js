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

/** Removes cell from all cellTypes. */
function remove(cellTypes, cell) {
	return (
		cellTypes
			.map((cellType) => {
				let cells = cellType.cells;
				cells = cells.filter((oldCell) =>
					oldCell !== cell);
				return { ...cellType, cells };
			})
	  );
  }

function updateFromCells(cellTypes, cells) {
	return (
	  cellTypes
		// remove cells that no longer exist
		.map((cellType) => {
			let cellList = cellType.cells;
			cellList = cellList.filter((cell) =>
				cells.some((newCell) => newCell.cell === cell));
			return { ...cellType, cells: cellList };
		})
	);
}

 const createCellTypesMachine = ({ eventBuses, undoRef }) =>
   Machine({
		id: 'cellTypes',
		entry: send('REGISTER_LABELS', { to: undoRef }), 
		invoke: [
			{ id: 'eventBus', src: fromEventBus('cellTypes', () => eventBuses.cellTypes) },
			{ src: fromEventBus('cellTypes', () => eventBuses.load, 'LOADED') },
			{ src: fromEventBus('cellTypes', () => eventBuses.labeled, 'SET_FEATURE') },
			{ src: fromEventBus('cellTypes', () => eventBuses.cells) }, // listen for edit events (REPLACE, SWAP, REMOVE) and CELLS (generic updates)
		],
		context: {
			cellTypes: [],
			feature: 0,
			numCells: null,
			colorMap: null,
			isOn: [],
			opacities: [],
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
									LOADED: { actions: ['setCellTypes', 'setCells', 'setMaxId', 
														'setOpacities', 'setIsOn', 'updateColorMap'],
											  target: 'done' },
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
								entry: ['sendCellTypes', 'updateColorMap'],
								on: {
									// From editCellTypesMachine
									ADD_CELL: { actions: 'addCell', target: 'editing' },
									MULTI_ADD_CELLS: { actions: 'addCells', target: 'editing' },
									ADD_PREDICTIONS: { actions: 'addPredictions', target: 'editing' },
									MULTI_REMOVE_CELLS: { actions: 'removeCells', target: 'editing' },
									ADD_CELLTYPE: { actions: ['addCellType', 'addIsOn', 'addOpacity', 'setMaxId'], target: 'editing' },
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
													EDITED_CELLTYPES: { target: 'done', actions: 'setEditedCellTypes' },
												},
											},
											done: { type: 'final' },
										},
									},
								},
								onDone: {
									target: 'idle',
									actions: 'finishEditing'
								},
							},
						},
					},
					update: {
						on: {
							// from CELLS event bus
							// REPLACE: { actions: ['replace', 'sendCellTypes'] },
							DELETE: { actions: ['delete', 'sendCellTypes'] },
							// SWAP: { actions: ['swap', 'sendCellTypes'] },
							EDITED_CELLS: { actions: ['setCells', 'updateFromCells', 'updateColorMap'] },
							EDIT_IS_ON: { actions: ['editIsOn', 'updateColorMap'] },
							TOGGLE_ALL_ON: { actions: ['toggleAll', 'updateColorMap'] },
							TOGGLE_ALL_OFF: { actions: ['untoggleAll', 'updateColorMap'] },
							EDIT_OPACITY: { actions: ['editOpacities', 'updateColorMap'] },
							CELLS: { actions: 'setCells' },
							RESTORE: { actions: ['restore', 'updateColorMap'] },
							SET_FEATURE: { actions: ['setFeature', 'updateColorMap'] },
						},
					},
				},
			},
		},
	},
	{
		actions: {
			// Set specified context or parameters
			setHistoryRef: assign({ historyRef: (_, __, meta) => meta._event.origin }),
			setCellTypes: assign({ cellTypes: (_, evt) => evt.cellTypes }),
			setCells: assign({ numCells: (_, evt) => new Cells(evt.cells).getNewCell() }),
			setIsOn: assign({ isOn: (ctx) => Array(ctx.maxId + 1).fill(true) }),
			setOpacities: assign({ opacities: (ctx) => Array(ctx.maxId + 1).fill(0.3) }),
			setEditEvent: assign({ editEvent: (_, evt) => evt }),
			setFeature: assign({ feature: (_, evt) => evt.feature }),
			startEdit: send('SAVE', { to: (ctx) => ctx.undoRef }),
			setEdit: assign({ edit: (_, evt) => evt.edit }),
			setEditedCellTypes: assign({ editedCellTypes: (_, evt) => evt.cellTypes }),

			// Get the next highest id for the next cell type to add
			setMaxId: assign({ maxId: (ctx) => {
					const ids = ctx.cellTypes.map(cellType => cellType.id);
					if (ids.length === 0) {
						return 0
					}
					return Math.max.apply(null, ids);
				}
			}),

			// Send an event to event bus that cell types have been edited
			sendCellTypes: send((ctx) => ({ type: 'CELLTYPES', cellTypes: ctx.cellTypes }), {
				to: 'eventBus',
			}),

			// Re-calculate the color map for rendering cell types
			updateColorMap: pure(() => assign({ colorMap: (ctx) => { 
				let cellTypes = ctx.cellTypes.filter((cellType) => cellType.feature === ctx.feature);
				let numTypes = cellTypes.length;
				let newColorMap = Array(ctx.numCells).fill([0, 0, 0, 0]);
				for (let i = 0; i < numTypes; i++) {
					const cellType = cellTypes[i];
					let numCells = cellType.cells.length;
					if (ctx.isOn[cellType.id]) {
						for (let j = 0; j < numCells; j++) {
							let oldColor = newColorMap[cellType.cells[j]];
							let newColor = hexToRgb(cellType.color);
							const sr = newColor[0];
							const sg = newColor[1];
							const sb = newColor[2];
							const sa = ctx.opacities[cellType.id];
							const r = oldColor[0] + sr - oldColor[0] * sr;
							const g = oldColor[1] + sg - oldColor[1] * sg;
							const b = oldColor[2] + sb - oldColor[2] * sb;
							const a = oldColor[3]
							newColorMap[cellType.cells[j]] = [r, g, b, Math.max(sa, a)];
						}
					}
				}
				return newColorMap;
			}})),

			delete: pure((ctx, evt) => {
				let cellTypes = remove(ctx.cellTypes, evt.cell);
				const before = { type: 'RESTORE', cellTypes: ctx.cellTypes };
				const after = { type: 'RESTORE', cellTypes: cellTypes };
				return [
				  assign({ cellTypes }),
				  send({ type: 'SNAPSHOT', edit: evt.edit, before, after }, { to: ctx.historyRef }),
				];
			}),

			updateFromCells: pure((ctx, evt) => {
				let cellTypes = updateFromCells(ctx.cellTypes, evt.cells);
				if (!equal(cellTypes, ctx.cellTypes)) {
				  const before = { type: 'RESTORE', cellTypes: ctx.cellTypes };
				  const after = { type: 'RESTORE', cellTypes: cellTypes };
				  return [
					assign({ cellTypes }),
					send({ type: 'SNAPSHOT', edit: evt.edit, before, after }, { to: ctx.historyRef }),
					send({ type: 'CELLTYPES', cellTypes }, { to: 'eventBus' }),
				  ];
				}
				return [];
			}),

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

			// Add one cell to a specified cell type
			addCell: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => (cellType.id === evt.cellType && !cellType.cells.includes(evt.cell))
						? {...cellType, cells: [...cellType.cells, evt.cell].sort(function(a, b) {
							return a - b;})}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Add a list of cells to a specified cell type
			addCells: send((ctx, evt) => {
				let cellTypes;
				const oldCells = ctx.cellTypes.filter(cellType => (cellType.id === evt.cellType))[0].cells;
				const newCells = evt.cells.filter(cell => !oldCells.includes(cell));
				cellTypes = ctx.cellTypes.map(
					cellType => (cellType.id === evt.cellType)
						? {...cellType, cells: [...cellType.cells, ...newCells].sort(function(a, b) {
							return a - b;})}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Add a prediction map of cells with their label
			addPredictions: send((ctx, evt) => {
				let cellTypes = ctx.cellTypes;
				const pred = evt.predictions;
				for (var cell in pred) {
					cellTypes = cellTypes.map(
						cellType => (cellType.id === pred[cell] + 1 && !cellType.cells.includes(cell))
							? {...cellType, cells: [...cellType.cells, parseInt(cell)].sort(function(a, b) {
								return a - b;})}
							: cellType
					)
				}
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Remove a single cell from a specified cell type
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

			// Removes a list of cells from a specified cell type
			removeCells: send((ctx, evt) => {
				let cellTypes;
				const removedCells = evt.cells;
				cellTypes = ctx.cellTypes.map(
					cellType => (cellType.id === evt.cellType)
						? {...cellType, cells: cellType.cells.filter(
							cell => !(removedCells.includes(cell))
						)}
						: cellType
				);
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Add a new empty cell type with a specified color
			addCellType: send((ctx, evt) => {
				let cellTypes;
				cellTypes = [...ctx.cellTypes, {
					id: ctx.maxId + 1,
					feature: ctx.feature,
					name: `Untitled ${ctx.maxId + 1}`,
					color: evt.color,
					cells: []}];
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Remove a specified cell type
			removeCellType: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.filter(item => !(item.id === evt.cellType));
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Edit the color of a specified cell type
			editColor: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => cellType.id === evt.cellType
						? {...cellType, color: evt.color}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Edit the name of a specified cell type
			editName: send((ctx, evt) => {
				let cellTypes;
				cellTypes = ctx.cellTypes.map(
					cellType => cellType.id === evt.cellType
						? {...cellType, name: evt.name}
						: cellType
				)
				return { type: 'EDITED_CELLTYPES', cellTypes };
			}),

			// Toggle a specified cell type on/off for the color map
			editIsOn: assign({isOn: (ctx, evt) => {
				let isOn = ctx.isOn;
				isOn[evt.cellType] = !isOn[evt.cellType];
				return isOn;
			}}),

			// Toggle all cell types on for the color map
			toggleAll: assign({isOn: (ctx) => {
				let isOn = ctx.isOn.map(t => 1);
				return isOn;
			}}),

			// Toggle all cell types off for the color map
			untoggleAll: assign({isOn: (ctx) => {
				let isOn = ctx.isOn.map(t => 0);
				return isOn;
			}}),

			// Edit the opacity of a specified cell type
			editOpacities: assign({opacities: (ctx, evt) => {
				let opacities = ctx.opacities;
				opacities[evt.cellType] = evt.opacity;
				return opacities;
			}}),

			// Add a new cell type to track for color map toggling
			addIsOn: assign({ isOn: (ctx) => {
				let isOn = ctx.isOn;
				isOn.push(true);
				return isOn
			}}),

			// Add a new opacity to track for color map
			addOpacity: assign({ opacities: (ctx) => {
				let opacities = ctx.opacities;
				opacities.push(0.3);
				return opacities;
			}}),

			restore: pure((_, evt) => {
				return [
					assign({ cellTypes: evt.cellTypes }),
					send({ type: 'CELLTYPES', cellTypes: evt.cellTypes }, { to: 'eventBus' }),
				];
			}),
		},
	}
   );
 
 export default createCellTypesMachine;
 