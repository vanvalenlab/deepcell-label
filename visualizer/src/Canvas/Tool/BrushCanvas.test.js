import { distance } from './BrushCanvas';

test('distance of (0, 0) is 0', () => {
  expect(distance(0, 0)).toBe(0);
});

test('distance of (3, 4) is 5', () => {
  expect(distance(3, 4)).toBe(5);
});

test('distance of (-3, 4) is 5', () => {
  expect(distance(-3, 4)).toBe(5);
});
