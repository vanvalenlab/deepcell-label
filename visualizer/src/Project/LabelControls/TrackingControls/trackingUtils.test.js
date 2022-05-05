import { formatFrames, getRanges } from './trackingUtils';

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

test('text for single frame', () => {
  expect(formatFrames([0])).toBe('frame 0');
});

test('text for two frames in a row', () => {
  expect(formatFrames([0, 1])).toBe('frames 0-1');
});

test('text for two separate frames', () => {
  expect(formatFrames([0, 2])).toBe('frames 0 and 2');
});

test('text for single frame and range', () => {
  expect(formatFrames([0, 2, 3, 4])).toBe('frames 0 and 2-4');
});

test('text for three ranges', () => {
  expect(formatFrames([0, 1, 2, 4, 5, 6, 8, 9, 10])).toBe('frames 0-2, 4-6 and 8-10');
});
