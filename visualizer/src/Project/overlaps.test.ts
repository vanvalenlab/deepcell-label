import Cells from './overlaps';

test('cell matrix for frame with one cell', () => {
  const cells = new Cells([{ value: 1, cell: 1, z: 0 }]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0],
    [0, 1],
  ]);
});

test('empty cells makes empty matrix', () => {
  const empty = new Cells([]);

  expect(empty.getMatrix(0)).toEqual([[0]]);
});

test('no cells in frame makes empty matrix', () => {
  const cells = new Cells([{ value: 1, cell: 1, z: 0 }]);
  expect(cells.getMatrix(1)).toEqual([[0]]);
});

test('cell matrix with two cells in frame', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
  ]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
});

test('different cell matrix when there are different cells in different frames', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 1 },
  ]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0],
    [0, 1],
  ]);
  expect(cells.getMatrix(1)).toEqual([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 1],
  ]);
});

test('get matrix for frame with overlapping cells', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 1, 1],
  ]);
});

test('get frames for cell in 1 frame', () => {
  const cells = new Cells([{ value: 1, cell: 1, z: 0 }]);
  expect(cells.getFrames(1)).toEqual([0]);
});

test('get frames for cell in no frames', () => {
  const cells = new Cells([]);
  expect(cells.getFrames(1)).toEqual([]);
});

test('get frames for cell in two frames', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 1, cell: 1, z: 1 },
  ]);
  expect(cells.getFrames(1)).toEqual([0, 1]);
});

test('get frames for cell in nonconsecutive frames', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 1, cell: 1, z: 2 },
  ]);
  expect(cells.getFrames(1)).toEqual([0, 2]);
});

test('get frames for overlapping cell', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(cells.getFrames(1)).toEqual([0]);
});

test('get no cells in frames', () => {
  const cells = new Cells([]);
  expect(cells.getCells(0)).toEqual([]);
});

test('get one cell in frames', () => {
  const cells = new Cells([{ value: 1, cell: 1, z: 0 }]);
  expect(cells.getCells(0)).toEqual([1]);
});

test('get two cells in frames', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
  ]);
  expect(cells.getCells(0)).toEqual([1, 2]);
});

test('get overlapping cells in frames', () => {
  const cells = new Cells([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(cells.getCells(0)).toEqual([1, 2]);
});
