import { fireEvent, render } from '@testing-library/react';
import { interpret } from 'xstate';
import createCanvasMachine from '../service/canvasMachine';
import createSegmentMachine from '../service/edit/segment/editSegmentMachine';
import { EventBus } from '../service/eventBus';
import createArraysMachine from '../service/labels/arraysMachine';
import createSelectMachine from '../service/selectMachine';
import Canvas from './Canvas';

const eventBuses = {
  undo: new EventBus('undo'),
  load: new EventBus('load'),
  canvas: new EventBus('canvas'),
  hovering: new EventBus('hovering'),
  image: new EventBus('image'),
  labeled: new EventBus('labeled'),
  raw: new EventBus('raw'),
  select: new EventBus('select'),
  arrays: new EventBus('arrays'),
  cells: new EventBus('cells'),
};
const context = {
  projectId: 'testId',
  bucket: 'testBucket',
  eventBuses,
  numFeatures: 2,
  numChannels: 3,
  duration: 2,
  width: 100,
  height: 100,
};

let mockCanvasActor = interpret(createCanvasMachine(context)).start();
let mockArraysActor = interpret(createArraysMachine(context)).start();
let mockSelectActor = interpret(createSelectMachine(context), {
  parent: { send: jest.fn() },
}).start();
let mockSegmentActor = interpret(createSegmentMachine(context), {
  parent: { send: jest.fn() },
}).start();
jest.mock('../ProjectContext', () => ({
  useArrays: () => mockArraysActor,
  useCanvas: () => mockCanvasActor,
  useEditSegment: () => mockSegmentActor,
  useSelect: () => mockSelectActor,
}));

jest.mock('./ComposeCanvas', () => () => 'ComposeCanvas');
jest.mock('./LabeledCanvas', () => () => 'LabeledCanvas');
jest.mock('./OutlineCanvas', () => () => 'OutlineCanvas');
jest.mock('./RawCanvas', () => () => 'RawCanvas');
jest.mock('./ToolCanvas', () => () => 'ToolCanvas');

jest.mock('@zip.js/zip.js', () => ({
  __esModule: true,
  default: 'mockedDefaultExport',
  namedExport: jest.fn(),
}));

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
