import Overlaps from './overlaps';

test('overlap matrix for frame with one cell', () => {
  const overlaps = new Overlaps([{ value: 1, cell: 1, z: 0 }]);
  expect(overlaps.getMatrix(0)).toEqual([
    [0, 0],
    [0, 1],
  ]);
});

test('empty overlaps makes empty matrix', () => {
  const empty = new Overlaps([]);

  expect(empty.getMatrix(0)).toEqual([[0]]);
});

test('no cells in frame makes empty matrix', () => {
  const overlaps = new Overlaps([{ value: 1, cell: 1, z: 0 }]);
  expect(overlaps.getMatrix(1)).toEqual([[0]]);
});

test('overlap matrix with two cells in frame', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
  ]);
  expect(overlaps.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
});

test('different overlap matrix when there are different cells in different frames', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 1 },
  ]);
  expect(overlaps.getMatrix(0)).toEqual([
    [0, 0],
    [0, 1],
  ]);
  expect(overlaps.getMatrix(1)).toEqual([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 1],
  ]);
});

test('get matrix for frame with overlapping cells', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(overlaps.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 1, 1],
  ]);
});

test('get frames for cell in 1 frame', () => {
  const overlaps = new Overlaps([{ value: 1, cell: 1, z: 0 }]);
  expect(overlaps.getFrames(1)).toEqual([0]);
});

test('get frames for cell in no frames', () => {
  const overlaps = new Overlaps([]);
  expect(overlaps.getFrames(1)).toEqual([]);
});

test('get frames for cell in two frames', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 1, cell: 1, z: 1 },
  ]);
  expect(overlaps.getFrames(1)).toEqual([0, 1]);
});

test('get frames for cell in nonconsecutive frames', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 1, cell: 1, z: 2 },
  ]);
  expect(overlaps.getFrames(1)).toEqual([0, 2]);
});

test('get frames for overlapping cell', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(overlaps.getFrames(1)).toEqual([0]);
});

test('get no cells in frames', () => {
  const overlaps = new Overlaps([]);
  expect(overlaps.getCells(0)).toEqual([]);
});

test('get one cell in frames', () => {
  const overlaps = new Overlaps([{ value: 1, cell: 1, z: 0 }]);
  expect(overlaps.getCells(0)).toEqual([1]);
});

test('get two cells in frames', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
  ]);
  expect(overlaps.getCells(0)).toEqual([1, 2]);
});

test('get overlapping cells in frames', () => {
  const overlaps = new Overlaps([
    { value: 1, cell: 1, z: 0 },
    { value: 2, cell: 2, z: 0 },
    { value: 3, cell: 1, z: 0 },
    { value: 3, cell: 2, z: 0 },
  ]);
  expect(overlaps.getCells(0)).toEqual([1, 2]);
});
