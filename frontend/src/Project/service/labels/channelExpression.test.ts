import {
  calculateMean,
  calculateMeanWhole,
  calculatePosition,
  calculateTotal,
  calculateTotalWhole,
} from './channelExpressionMachine';

const ctxNoCells = {
  t: 0,
  feature: 0,
  labeled: [
    [0, 0],
    [0, 0],
  ],
  labeledFull: [
    [
      [
        [0, 0],
        [0, 0],
      ],
    ],
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
  cells: [],
  numCells: 0,
};

const ctxNonExistentCell = {
  t: 0,
  feature: 0,
  labeled: [
    [0, 0],
    [0, 0],
  ],
  labeledFull: [
    [
      [
        [0, 0],
        [0, 0],
      ],
    ],
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

const ctxOneCell = {
  t: 0,
  feature: 0,
  labeled: [
    [1, 1],
    [1, 1],
  ],
  labeledFull: [
    [
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
    ],
  ],
  raw: [
    [
      [
        [3, 2],
        [3, 4],
      ],
      [
        [11, 11],
        [11, 11],
      ],
    ],
    [
      [
        [100, 100],
        [100, 100],
      ],
      [
        [200, 200],
        [200, 200],
      ],
    ],
  ],
  cells: [
    { cell: 0, value: 1, t: 0, c: 0 },
    { cell: 0, value: 1, t: 1, c: 0 },
  ],
  numCells: 1,
};

const ctxTwoCells = {
  t: 0,
  feature: 0,
  labeled: [
    [1, 3],
    [1, 2],
  ],
  labeledFull: [
    [
      [
        [1, 3],
        [1, 2],
      ],
      [
        [2, 1],
        [2, 3],
      ],
    ],
  ],
  raw: [
    [
      [
        [3, 3],
        [3, 5],
      ],
      [
        [1, 1],
        [1, 0],
      ],
    ],
    [
      [
        [100, 100],
        [100, 50],
      ],
      [
        [20, 20],
        [20, 30],
      ],
    ],
  ],
  cells: [
    { cell: 0, value: 1, t: 0, c: 0 },
    { cell: 1, value: 2, t: 0, c: 0 },
    { cell: 0, value: 3, t: 0, c: 0 },
    { cell: 1, value: 3, t: 0, c: 0 },
    { cell: 0, value: 1, t: 1, c: 0 },
    { cell: 1, value: 2, t: 1, c: 0 },
    { cell: 0, value: 3, t: 1, c: 0 },
    { cell: 1, value: 3, t: 1, c: 0 },
  ],
  numCells: 2,
};

test('no cells leads to empty lists one frame', () => {
  expect(calculateMean(ctxNoCells)).toEqual([[], []]);
  expect(calculatePosition(ctxNoCells)).toEqual([[], []]);
  expect(calculateTotal(ctxNoCells)).toEqual([[], []]);
});

test('no cells leads to empty lists cross-frame', () => {
  expect(calculateMeanWhole(ctxNoCells)).toEqual([[], []]);
  expect(calculateTotalWhole(ctxNoCells)).toEqual([[], []]);
});

test('non-existent cell leads to NaNs one frame', () => {
  expect(calculateMean(ctxNonExistentCell)).toEqual([[NaN], [NaN]]);
  expect(calculateTotal(ctxNonExistentCell)).toEqual([[NaN], [NaN]]);
  expect(calculatePosition(ctxNonExistentCell)).toEqual([[NaN], [NaN]]);
});

test('non-existent cell leads to NaNs cross-frame', () => {
  expect(calculateMeanWhole(ctxNonExistentCell)).toEqual([[NaN], [NaN]]);
  expect(calculateTotalWhole(ctxNonExistentCell)).toEqual([[NaN], [NaN]]);
});

test('one cell calculates mean one frame', () => {
  expect(calculateMean(ctxOneCell)).toEqual([[3], [100]]);
});

test('one cell calculates mean cross-frame', () => {
  expect(calculateMeanWhole(ctxOneCell)).toEqual([[7], [150]]);
});

test('one cell calculates total one frame', () => {
  expect(calculateTotal(ctxOneCell)).toEqual([[12], [400]]);
});

test('one cell calculates total cross-frame', () => {
  expect(calculateTotalWhole(ctxOneCell)).toEqual([[56], [1200]]);
});

test('one cell calculates position', () => {
  expect(calculatePosition(ctxOneCell)).toEqual([[0.5], [0.5]]);
});

test('two overlapping cells calculate mean one frame', () => {
  expect(calculateMean(ctxTwoCells)).toEqual([
    [3, 4],
    [100, 75],
  ]);
});

test('two overlapping cells calculate mean cross-frame', () => {
  expect(calculateMeanWhole(ctxTwoCells)).toEqual([
    [2, 2],
    [70, 44],
  ]);
});

test('two overlapping cells calculate total one frame', () => {
  expect(calculateTotal(ctxTwoCells)).toEqual([
    [9, 8],
    [300, 150],
  ]);
});

test('two overlapping cells calculate total cross-frame', () => {
  expect(calculateTotalWhole(ctxTwoCells)).toEqual([
    [10, 10],
    [350, 220],
  ]);
});

test('two overlapping cells calculate position', () => {
  expect(calculatePosition(ctxTwoCells)).toEqual([
    [1 / 3, 1],
    [2 / 3, 0.5],
  ]);
});
