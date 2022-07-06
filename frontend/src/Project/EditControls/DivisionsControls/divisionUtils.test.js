import { formatTimes, getRanges } from './divisionUtils';

test('empty range', () => {
  expect(getRanges([])).toEqual([]);
});

test('range with one element', () => {
  expect(getRanges([0])).toEqual(['0']);
});

test('range with two elements', () => {
  expect(getRanges([0, 1])).toEqual(['0-1']);
});

test('range with three elements', () => {
  expect(getRanges([0, 1, 2])).toEqual(['0-2']);
});

test('two ranges', () => {
  expect(getRanges([0, 1, 2, 4, 5, 6])).toEqual(['0-2', '4-6']);
});

test('text for single time', () => {
  expect(formatTimes([0])).toBe('time 0');
});

test('text for two times in a row', () => {
  expect(formatTimes([0, 1])).toBe('times 0-1');
});

test('text for two separate times', () => {
  expect(formatTimes([0, 2])).toBe('times 0 and 2');
});

test('text for single time and range', () => {
  expect(formatTimes([0, 2, 3, 4])).toBe('times 0 and 2-4');
});

test('text for three ranges', () => {
  expect(formatTimes([0, 1, 2, 4, 5, 6, 8, 9, 10])).toBe('times 0-2, 4-6 and 8-10');
});
