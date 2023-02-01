import { calculateMean, calculatePosition, calculateTotal } from './channelExpressionMachine';

test('no cells leads to empty lists', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [0, 0],
      [0, 0],
    ],
    raw: [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 1],
        [2, 3],
      ],
    ],
    cells: [],
    numCells: 0,
  };
  expect(calculateMean(ctx)).toEqual([[], []]);
  expect(calculatePosition(ctx)).toEqual([[], []]);
  expect(calculateTotal(ctx)).toEqual([[], []]);
});

test('non-existent cell leads to NaNs', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [0, 0],
      [0, 0],
    ],
    raw: [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 1],
        [2, 3],
      ],
    ],
    cells: [{ cell: 0, value: 1, t: 0, c: 0 }],
    numCells: 1,
  };
  expect(calculateMean(ctx)).toEqual([[NaN], [NaN]]);
  expect(calculateTotal(ctx)).toEqual([[NaN], [NaN]]);
  expect(calculatePosition(ctx)).toEqual([[NaN], [NaN]]);
});

test('one cell calculates mean', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 1],
      [1, 1],
    ],
    raw: [
      [
        [
          [3, 2],
          [3, 4],
        ],
      ],
      [
        [
          [100, 100],
          [100, 100],
        ],
      ],
    ],
    cells: [{ cell: 0, value: 1, t: 0, c: 0 }],
    numCells: 1,
  };
  expect(calculateMean(ctx)).toEqual([[3], [100]]);
});

test('one cell calculates total', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 1],
      [1, 1],
    ],
    raw: [
      [
        [
          [3, 2],
          [3, 4],
        ],
      ],
      [
        [
          [100, 100],
          [100, 100],
        ],
      ],
    ],
    cells: [{ cell: 0, value: 1, t: 0, c: 0 }],
    numCells: 1,
  };
  expect(calculateTotal(ctx)).toEqual([[12], [400]]);
});

test('one cell calculates position', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 1],
      [1, 1],
    ],
    cells: [{ cell: 0, value: 1, t: 0, c: 0 }],
    numCells: 1,
  };
  expect(calculatePosition(ctx)).toEqual([[0.5], [0.5]]);
});

test('two overlapping cells calculate mean', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 3],
      [1, 2],
    ],
    raw: [
      [
        [
          [3, 3],
          [3, 5],
        ],
      ],
      [
        [
          [100, 100],
          [100, 50],
        ],
      ],
    ],
    cells: [
      { cell: 0, value: 1, t: 0, c: 0 },
      { cell: 1, value: 2, t: 0, c: 0 },
      { cell: 0, value: 3, t: 0, c: 0 },
      { cell: 1, value: 3, t: 0, c: 0 },
    ],
    numCells: 2,
  };
  expect(calculateMean(ctx)).toEqual([
    [3, 4],
    [100, 75],
  ]);
});

test('two overlapping cells calculate total', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 3],
      [1, 2],
    ],
    raw: [
      [
        [
          [3, 3],
          [3, 5],
        ],
      ],
      [
        [
          [100, 100],
          [100, 50],
        ],
      ],
    ],
    cells: [
      { cell: 0, value: 1, t: 0, c: 0 },
      { cell: 1, value: 2, t: 0, c: 0 },
      { cell: 0, value: 3, t: 0, c: 0 },
      { cell: 1, value: 3, t: 0, c: 0 },
    ],
    numCells: 2,
  };
  expect(calculateTotal(ctx)).toEqual([
    [9, 8],
    [300, 150],
  ]);
});

test('two overlapping cells calculate position', () => {
  const ctx = {
    t: 0,
    feature: 0,
    labeled: [
      [1, 3],
      [1, 2],
    ],
    cells: [
      { cell: 0, value: 1, t: 0, c: 0 },
      { cell: 1, value: 2, t: 0, c: 0 },
      { cell: 0, value: 3, t: 0, c: 0 },
      { cell: 1, value: 3, t: 0, c: 0 },
    ],
    numCells: 2,
  };
  expect(calculatePosition(ctx)).toEqual([
    [1 / 3, 1],
    [2 / 3, 0.5],
  ]);
});
