import { fireEvent, render } from '@testing-library/react';
import { interpret } from 'xstate';
import canvasMachine from '../service/canvasMachine';
import createLabeledMachine from '../service/labeled/labeledMachine';
import createRawMachine from '../service/raw/rawMachine';
import selectMachine from '../service/selectMachine';
import segmentMachine from '../service/tools/segmentMachine';
import Canvas from './Canvas';

let mockCanvasActor = interpret(canvasMachine).start();
let mockSelectActor = interpret(selectMachine, { parent: { send: jest.fn() } }).start();
let mockRawActor = interpret(createRawMachine(), { parent: { send: jest.fn() } }).start();
let mockLabeledActor = interpret(createLabeledMachine()).start();
let mockSegmentActor = interpret(segmentMachine, { parent: { send: jest.fn() } }).start();
jest.mock('../ProjectContext', () => ({
  useCanvas: () => mockCanvasActor,
  useSelect: () => mockSelectActor,
  useRaw: () => mockRawActor,
  useLabeled: () => mockLabeledActor,
  useSegment: () => mockSegmentActor,
}));

jest.mock('./ComposeCanvases', () => () => 'ComposeCanvases');
jest.mock('./Labeled/LabeledCanvas', () => () => 'LabeledCanvas');
jest.mock('./Labeled/OutlineCanvas', () => () => 'OutlineCanvas');
jest.mock('./Raw/RawCanvas', () => () => 'RawCanvas');
jest.mock('./Tool/BrushCanvas', () => () => 'BrushCanvas');
jest.mock('./Tool/ThresholdCanvas', () => () => 'ThresholdCanvas');

test('canvas sends interaction to actors', () => {
  const eventsSentToCanvas = [];
  mockCanvasActor.send = (event) => eventsSentToCanvas.push(event);
  render(<Canvas />);

  fireEvent.wheel(document.getElementById('canvasBox'));
  expect(eventsSentToCanvas.length).toEqual(1);
  fireEvent.mouseDown(document.getElementById('canvasBox'));
  expect(eventsSentToCanvas.length).toEqual(2);
  fireEvent.mouseMove(document.getElementById('canvasBox'));
  expect(eventsSentToCanvas.length).toEqual(3);
  fireEvent.mouseUp(document.getElementById('canvasBox'));
  // canvas machine also listens for mouseup events in case they happen off the canvas
  expect(eventsSentToCanvas.length).toBeGreaterThanOrEqual(4);
});
