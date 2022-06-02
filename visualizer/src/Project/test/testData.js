import Cells from '../cells';

export const EMPTY = {
  raw: [[[new Uint8Array([0])]]],
  labeled: [[[new Int32Array([0])]]],
  cells: new Cells([]),
};

export const ONE_CHANNEL = {
  raw: [[[new Uint8Array([1])]]],
  labeled: [[[new Int32Array([0])]]],
  cells: new Cells([]),
};

export const TWO_CHANNELS = {
  raw: [[[new Uint8Array([1])]], [[[new Uint8Array([1])]]]],
  labeled: [[[new Int32Array([0])]]],
  cells: new Cells([]),
};

export const TWO_FRAMES = {
  raw: [[[new Uint8Array([1])], [new Uint8Array([1])]]],
  labeled: [[[new Int32Array([0])], [new Int32Array([0])]]],
  cells: new Cells([]),
};

export const ONE_CELL = {
  raw: [[[new Uint8Array([0])]]],
  labeled: [[[new Int32Array([1])]]],
  cells: new Cells([{ cell: 1, value: 1, t: 0 }]),
};

export const TWO_CELLS = {
  raw: [[[new Uint8Array([0, 0]), new Uint8Array([0, 0])]]],
  labeled: [[[new Int32Array([1, 0]), new Int32Array([0, 2])]]],
  cells: new Cells([
    { cell: 1, value: 1, t: 0 },
    { cell: 2, value: 2, t: 0 },
  ]),
};

export const THREE_BY_THREE_CELL = {
  raw: [[[new Uint8Array([0, 0, 0]), new Uint8Array([0, 0, 0]), new Uint8Array([0, 0, 0])]]],
  labeled: [[[new Int32Array([1, 1, 1]), new Int32Array([1, 1, 1]), new Int32Array([1, 1, 1])]]],
  cells: new Cells([{ cell: 1, value: 1, t: 0 }]),
};
