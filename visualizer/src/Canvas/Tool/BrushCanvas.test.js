import { distance, onBrush } from './BrushCanvas';

test('distance of (0, 0) is 0', () => {
  expect(distance(0, 0)).toBe(0);
});

test('distance of (3, 4) is 5', () => {
  expect(distance(3, 4)).toBe(5);
});

test('distance of (-3, 4) is 5', () => {
  expect(distance(-3, 4)).toBe(5);
});

test('brush center is onBrush only for brushSize of 1', () => {
  expect(onBrush(10, 10, 10, 10, 1)).toBe(true);
  expect(onBrush(10, 10, 10, 10, 5)).toBe(false);
});

test('brush outline is on brush', () => {
  expect(onBrush(0, 0, 1, 1, 2)).toBe(true);
  expect(onBrush(2, 2, 0, 0, 3)).toBe(true);
});

test('brush center is inside brush', () => {
  expect(onBrush(10, 10, 10, 10, 1)).toBe(true);
  expect(onBrush(10, 10, 10, 10, 5)).toBe(true);
});

test('brush interior is inside brush', () => {
  expect(onBrush(10, 10, 10, 10, 3)).toBe(true);
  expect(onBrush(11, 11, 10, 10, 3)).toBe(true);
  expect(onBrush(12, 12, 10, 10, 3)).toBe(true);
  expect(onBrush(13, 13, 10, 10, 3)).toBe(false);
});
