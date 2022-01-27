// Manages zooming, panning, and interacting with the canvas
// Interactions sent as HOVERING, COORDINATES, mousedown, and mouseup events to parent
// HOVERING event sent when the label below the cursor changes
// COORDINATES event sent when the pixel below the cursor changes

// Panning interface:
// Hold space always enables click & drag to pan
// SET_PAN_ON_DRAG event configures whether click & drag alone pans the canvas
// Features that need dragging interactions,
// like drawing or creating a bounding box, should set panOnDrag to false

import { actions, assign, Machine, send } from 'xstate';
import { fromEventBus } from './eventBus';

const { respond } = actions;

// Pans when dragging
const panOnDragState = {
  initial: 'idle',
  states: {
    idle: {
      entry: 'resetMove',
      on: {
        mousedown: 'pressed',
        mousemove: { actions: 'computeCoordinates' },
      },
    },
    // Sends mouseup events when panning < 10 pixels
    pressed: {
      on: {
        mousemove: [
          { cond: 'moved', target: 'dragged', actions: 'pan' },
          { actions: ['updateMove', 'pan'] },
        ],
        mouseup: { target: 'idle', actions: 'sendToEventBus' },
      },
    },
    dragged: {
      on: {
        mouseup: 'idle',
        mousemove: { actions: 'pan' },
      },
    },
  },
};

const noPanState = {
  on: {
    mousedown: { actions: 'sendToEventBus' },
    mouseup: { actions: 'sendToEventBus' },
    mousemove: { actions: 'computeCoordinates' },
  },
};

const interactiveState = {
  initial: 'checkDrag',
  states: {
    checkDrag: {
      always: [{ cond: 'panOnDrag', target: 'panOnDrag' }, 'noPan'],
    },
    panOnDrag: panOnDragState,
    noPan: noPanState,
  },
  on: {
    SET_PAN_ON_DRAG: { target: '.checkDrag', actions: 'setPanOnDrag' },
  },
};

const grabState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: { target: 'panning' },
        mousemove: { actions: 'computeCoordinates' },
      },
    },
    panning: {
      on: {
        mouseup: 'idle',
        mousemove: { actions: 'pan' },
      },
    },
  },
};

const createCanvasMachine = ({ width, height, eventBuses }) =>
  Machine(
    {
      id: 'canvas',
      context: {
        // raw dimensions of image
        width,
        height,
        availableWidth: 512,
        availableHeight: 512,
        scale: 1, // how much the canvas is scaled to fill the available space
        zoom: 1, // how much the image is scaled within the canvas
        // position of canvas within image
        sx: 0,
        sy: 0,
        // position of cursor within image
        x: null,
        y: null,
        // how much the canvas has moved in the current pan
        dx: 0,
        dy: 0,
        // label data
        labeledArray: null,
        hovering: null,
        panOnDrag: true,
      },
      invoke: [
        { id: 'eventBus', src: fromEventBus('canvas', () => eventBuses.canvas) },
        { src: fromEventBus('canvas', () => eventBuses.arrays) },
        { src: 'listenForMouseUp' },
        { src: 'listenForZoomHotkeys' },
        { src: 'listenForSpace' },
      ],
      on: {
        wheel: { actions: 'zoom' },
        ZOOM_IN: { actions: 'zoomIn' },
        ZOOM_OUT: { actions: 'zoomOut' },
        DIMENSIONS: { actions: ['setSpace', 'resize'] },
        SAVE: {
          actions: respond((context) => ({
            type: 'RESTORE',
            sx: context.sx,
            sy: context.sy,
            zoom: context.zoom,
          })),
        },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
        LABELED_ARRAY: { actions: ['setLabeledArray', 'sendHovering'] },
        COORDINATES: {
          cond: 'newCoordinates',
          actions: ['setCoordinates', 'sendHovering', 'sendToEventBus'],
        },
        HOVERING: {
          cond: 'newHovering',
          actions: ['setHovering', 'sendToEventBus'],
        },
        'keydown.Space': '.grab',
        'keyup.Space': '.interactive',
      },
      initial: 'interactive',
      states: {
        interactive: interactiveState,
        grab: grabState,
      },
    },
    {
      services: {
        listenForMouseUp: () => (send) => {
          const listener = (e) => send(e);
          window.addEventListener('mouseup', listener);
          return () => window.removeEventListener('mouseup', listener);
        },
        listenForSpace: () => (send) => {
          const downListener = (e) => {
            if (e.key === ' ' && !e.repeat) {
              send('keydown.Space');
            }
          };
          const upListener = (e) => {
            if (e.key === ' ') {
              send('keyup.Space');
            }
          };
          window.addEventListener('keydown', downListener);
          window.addEventListener('keyup', upListener);
          return () => {
            window.removeEventListener('keydown', downListener);
            window.removeEventListener('keyup', upListener);
          };
        },
        listenForZoomHotkeys: () => (send) => {
          const listener = (e) => {
            if (e.key === '=') {
              send('ZOOM_IN');
            }
            if (e.key === '-') {
              send('ZOOM_OUT');
            }
          };
          window.addEventListener('keydown', listener);
          return () => window.removeEventListener('keydown', listener);
        },
      },
      guards: {
        newCoordinates: (context, event) => context.x !== event.y || context.y !== event.y,
        newHovering: (context, event) => context.hovering !== event.hovering,
        moved: ({ dx, dy }) => Math.abs(dx) > 10 || Math.abs(dy) > 10,
        panOnDrag: ({ panOnDrag }) => panOnDrag,
      },
      actions: {
        updateMove: assign({
          dx: ({ dx }, event) => dx + event.movementX,
          dy: ({ dy }, event) => dy + event.movementY,
        }),
        resetMove: assign({ dx: 0, dy: 0 }),
        restore: assign((_, { type, ...savedContext }) => savedContext),
        setCoordinates: assign((_, { x, y }) => ({ x, y })),
        computeCoordinates: send((context, event) => {
          const { scale, zoom, width, height, sx, sy } = context;
          let x = Math.floor(event.nativeEvent.offsetX / scale / zoom + sx);
          let y = Math.floor(event.nativeEvent.offsetY / scale / zoom + sy);
          x = Math.max(0, Math.min(x, width - 1));
          y = Math.max(0, Math.min(y, height - 1));
          return { type: 'COORDINATES', x, y };
        }),
        setHovering: assign((_, { hovering }) => ({ hovering })),
        sendHovering: send(({ labeledArray: array, x, y }) => ({
          type: 'HOVERING',
          hovering: array && x !== null && y !== null ? array[y][x] : null,
        })),
        setSpace: assign({
          availableWidth: (_, { width }) => width,
          availableHeight: (_, { height }) => height,
          padding: (_, { padding }) => padding,
        }),
        resize: assign({
          scale: (context) => {
            const { width, height, availableWidth, availableHeight, padding } = context;
            const scaleX = (availableWidth - 2 * padding) / width;
            const scaleY = (availableHeight - 2 * padding) / height;
            // pick scale that fits both dimensions; can be less than 1
            const scale = Math.min(scaleX, scaleY);
            return scale;
          },
        }),
        pan: assign({
          sx: (context, event) => {
            const dx = (-1 * event.movementX) / context.zoom / context.scale;
            let newSx = context.sx + dx;
            newSx = Math.min(newSx, context.width * (1 - 1 / context.zoom));
            newSx = Math.max(newSx, 0);
            return newSx;
          },
          sy: (context, event) => {
            const dy = (-1 * event.movementY) / context.zoom / context.scale;
            let newSy = context.sy + dy;
            newSy = Math.min(newSy, context.height * (1 - 1 / context.zoom));
            newSy = Math.max(newSy, 0);
            return newSy;
          },
        }),
        zoom: assign((context, event) => {
          const zoomFactor = 1 + event.deltaY / window.innerHeight;
          const newZoom = Math.max(context.zoom * zoomFactor, 1);
          const propX = event.nativeEvent.offsetX / context.scale;
          const propY = event.nativeEvent.offsetY / context.scale;

          let newSx = context.sx + propX * (1 / context.zoom - 1 / newZoom);
          newSx = Math.min(newSx, context.width * (1 - 1 / newZoom));
          newSx = Math.max(newSx, 0);

          let newSy = context.sy + propY * (1 / context.zoom - 1 / newZoom);
          newSy = Math.min(newSy, context.height * (1 - 1 / newZoom));
          newSy = Math.max(newSy, 0);

          return { zoom: newZoom, sx: newSx, sy: newSy };
        }),
        zoomIn: assign(({ zoom, width, height, sx, sy }) => {
          const newZoom = 1.1 * zoom;
          const propX = width / 2;
          const propY = height / 2;
          const newSx = sx + propX * (1 / zoom - 1 / newZoom);
          const newSy = sy + propY * (1 / zoom - 1 / newZoom);
          return { zoom: newZoom, sx: newSx, sy: newSy };
        }),
        zoomOut: assign(({ zoom, width, height, sx, sy }) => {
          const newZoom = Math.max(zoom / 1.1, 1);
          const propX = width / 2;
          const propY = height / 2;
          let newSx = sx + propX * (1 / zoom - 1 / newZoom);
          newSx = Math.min(newSx, width * (1 - 1 / newZoom));
          newSx = Math.max(newSx, 0);
          let newSy = sy + propY * (1 / zoom - 1 / newZoom);
          newSy = Math.min(newSy, height * (1 - 1 / newZoom));
          newSy = Math.max(newSy, 0);
          return { zoom: newZoom, sx: newSx, sy: newSy };
        }),
        setPanOnDrag: assign((_, { panOnDrag }) => ({ panOnDrag })),
        setLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
        sendToEventBus: send((c, e) => e, { to: 'eventBus' }),
      },
    }
  );

export default createCanvasMachine;
