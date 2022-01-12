import { render } from '@testing-library/react';
import { interpret } from 'xstate';
import canvasMachine from '../../service/canvasMachine';
import selectMachine from '../../service/selectMachine';
import brushMachine from '../../service/tools/segment/brushMachine';
import { BrushCanvas, dist } from './BrushCanvas';

test('distance of (0, 0) is 0', () => {
  expect(dist(0, 0)).toBe(0);
});

test('distance of (3, 4) is 5', () => {
  expect(dist(3, 4)).toBe(5);
});

test('distance of (-3, 4) is 5', () => {
  expect(dist(-3, 4)).toBe(5);
});

let mockCanvasActor;
let mockBrushActor;
let mockSelectActor;
jest.mock('../../ProjectContext', () => ({
  useCanvas: () => mockCanvasActor,
  useBrush: () => mockBrushActor,
  useSelect: () => mockSelectActor,
}));

test('brush with size 1 draws one white pixel', () => {
  mockCanvasActor = interpret(canvasMachine.withContext({ width: 1, height: 1 })).start();
  mockBrushActor = interpret(
    brushMachine.withContext({ x: 0, y: 0, trace: [], brushSize: 1 })
  ).start();
  mockSelectActor = interpret(selectMachine.withContext({ background: 0 }), {
    parent: { send: jest.fn() },
  }).start();

  render(<BrushCanvas setCanvases={jest.fn()} />);

  const brushCanvas = document.getElementById('brush-canvas');
  expect(brushCanvas.height).toEqual(1);
  expect(brushCanvas.width).toEqual(1);
});
