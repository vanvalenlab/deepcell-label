import Cells from './cells';

test('cell matrix at time with one cell', () => {
  const cells = new Cells([{ value: 1, cell: 1, t: 0 }]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0],
    [0, 1],
  ]);
});

test('empty cells makes empty matrix', () => {
  const empty = new Cells([]);

  expect(empty.getMatrix(0)).toEqual([[0]]);
});

test('no cells at time makes empty matrix', () => {
  const cells = new Cells([{ value: 1, cell: 1, t: 0 }]);
  expect(cells.getMatrix(1)).toEqual([[0]]);
});

test('cell matrix with two cells at time', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 0 },
  ]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
});

test('different cell matrix when there are different cells at different times', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 1 },
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

test('get matrix for time with overlapping cells', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 0 },
    { value: 3, cell: 1, t: 0 },
    { value: 3, cell: 2, t: 0 },
  ]);
  expect(cells.getMatrix(0)).toEqual([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 1, 1],
  ]);
});

test('get times for cell at one time', () => {
  const cells = new Cells([{ value: 1, cell: 1, t: 0 }]);
  expect(cells.getTimes(1)).toEqual([0]);
});

test('get times for missing cell', () => {
  const cells = new Cells([]);
  expect(cells.getTimes(1)).toEqual([]);
});

test('get times for cell at two times', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 1, cell: 1, t: 1 },
  ]);
  expect(cells.getTimes(1)).toEqual([0, 1]);
});

test('get times for cell at nonconsecutive times', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 1, cell: 1, t: 2 },
  ]);
  expect(cells.getTimes(1)).toEqual([0, 2]);
});

test('get times for overlapping cell', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 0 },
    { value: 3, cell: 1, t: 0 },
    { value: 3, cell: 2, t: 0 },
  ]);
  expect(cells.getTimes(1)).toEqual([0]);
});

test('get no cells at time', () => {
  const cells = new Cells([]);
  expect(cells.getCells(0)).toEqual([]);
});

test('get one cell at time', () => {
  const cells = new Cells([{ value: 1, cell: 1, t: 0 }]);
  expect(cells.getCells(0)).toEqual([1]);
});

test('get two cells at time', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 0 },
  ]);
  expect(cells.getCells(0)).toEqual([1, 2]);
});

test('get overlapping cells at time', () => {
  const cells = new Cells([
    { value: 1, cell: 1, t: 0 },
    { value: 2, cell: 2, t: 0 },
    { value: 3, cell: 1, t: 0 },
    { value: 3, cell: 2, t: 0 },
  ]);
  expect(cells.getCells(0)).toEqual([1, 2]);
});
