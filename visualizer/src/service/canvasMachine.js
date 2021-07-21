import { actions, assign, Machine, send, sendParent } from 'xstate';

const { respond } = actions;

// Sends mouseup events to tools with clicking only
const clickToolState = {
  initial: 'idle',
  states: {
    idle: {
      entry: 'resetMove',
      on: {
        mousedown: 'pressed',
        mousemove: { actions: 'coordinates' },
      },
    },
    pressed: {
      on: {
        mousemove: [
          { cond: 'moved', target: 'dragged', actions: 'pan' },
          { actions: ['updateMove', 'pan'] },
        ],
        mouseup: { target: 'idle', actions: sendParent((c, e) => e) },
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

// Sends both mousedown and mouseup events to tools with dragging
const dragToolState = {
  on: {
    mousedown: { actions: sendParent((c, e) => e) },
    mouseup: { actions: sendParent((c, e) => e) },
    mousemove: { actions: 'coordinates' },
  },
};

const toolState = {
  initial: 'checkTool',
  on: {
    TOOL: { target: '.checkTool', actions: 'setTool' },
  },
  states: {
    checkTool: {
      always: [{ cond: 'dragTool', target: 'dragTool' }, 'clickTool'],
    },
    clickTool: clickToolState,
    dragTool: dragToolState,
  },
};

const grabState = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        mousedown: { target: 'panning' },
        mousemove: { actions: 'coordinates' },
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

const panState = {
  initial: 'tool',
  states: {
    tool: toolState,
    hand: grabState,
  },
  invoke: { src: 'listenForSpace' },
  on: {
    'keydown.Space': '.hand',
    'keyup.Space': '.tool',
  },
};

const canvasMachine = Machine(
  {
    id: 'canvas',
    context: {
      // raw dimensions of image
      width: 512,
      height: 512,
      availableWidth: 512,
      availableHeight: 512,
      scale: 1, // how much the canvas is scaled to fill the available space
      zoom: 1, // how much the image is scaled within the canvas
      // position of canvas within image
      sx: 0,
      sy: 0,
      // position of cursor within image
      x: 0,
      y: 0,
      // how much the canvas has moved in the current pan
      dx: 0,
      dy: 0,
    },
    invoke: [{ src: 'listenForMouseUp' }, { src: 'listenForZoomHotkeys' }],
    on: {
      wheel: { actions: 'zoom' },
      ZOOMIN: { actions: 'zoomIn' },
      ZOOMOUT: { actions: 'zoomOut' },
      DIMENSIONS: { actions: ['setDimensions', 'resize'] },
      SAVE: {
        actions: respond(context => ({
          type: 'RESTORE',
          sx: context.sx,
          sy: context.sy,
          zoom: context.zoom,
        })),
      },
      RESTORE: { actions: ['restore', respond('RESTORED')] },
      LABELED_ARRAY: { actions: ['setLabeledArray', 'sendLabel'] },
      COORDINATES: {
        cond: 'newCoordinates',
        actions: ['setCoordinates', 'sendLabel', sendParent((c, e) => e)],
      },
      LABEL: {
        cond: 'newLabel',
        actions: ['setLabel', sendParent((c, e) => e)],
      },
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: {
            target: 'pan',
            actions: [
              assign((context, event) => ({
                height: event.height,
                width: event.width,
              })),
              'resize',
            ],
          },
        },
      },
      pan: panState,
    },
  },
  {
    services: {
      listenForMouseUp: () => send => {
        const listener = e => send(e);
        window.addEventListener('mouseup', listener);
        return () => window.removeEventListener('mouseup', listener);
      },
      listenForSpace: () => send => {
        const downListener = e => {
          if (e.key === ' ' && !e.repeat) {
            send('keydown.Space');
          }
        };
        const upListener = e => {
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
      listenForZoomHotkeys: () => send => {
        const listener = e => {
          if (e.key === '=') {
            send('ZOOMIN');
          }
          if (e.key === '-') {
            send('ZOOMOUT');
          }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
    },
    guards: {
      newCoordinates: (context, event) =>
        context.x !== event.y || context.y !== event.y,
      newLabel: (context, event) => context.label !== event.label,
      dragTool: ({ tool }) => tool === 'brush' || tool === 'threshold',
      moved: ({ dx, dy }) => Math.abs(dx) > 10 || Math.abs(dy) > 10,
    },
    actions: {
      updateMove: assign({
        dx: ({ dx }, event) => dx + event.movementX,
        dy: ({ dy }, event) => dy + event.movementY,
      }),
      resetMove: assign({ dx: 0, dy: 0 }),
      restore: assign((_, { type, ...savedContext }) => savedContext),
      setCoordinates: assign((_, { x, y }) => ({ x, y })),
      sendCoordinates: send(({ x, y }) => ({ type: 'COORDINATES', x, y }), {
        to: context => context.toolRef,
      }),
      coordinates: send((context, event) => {
        const { scale, zoom, width, height, sx, sy } = context;
        let x = Math.floor(event.nativeEvent.offsetX / scale / zoom + sx);
        let y = Math.floor(event.nativeEvent.offsetY / scale / zoom + sy);
        x = Math.max(0, Math.min(x, width - 1));
        y = Math.max(0, Math.min(y, height - 1));
        return { type: 'COORDINATES', x, y };
      }),
      setLabel: assign((_, { label }) => ({ label })),
      sendLabel: send(({ labeledArray: array, x, y }) => ({
        type: 'LABEL',
        label: array ? Math.abs(array[y][x]) : 0,
      })),
      setDimensions: assign({
        availableWidth: (_, { width }) => width,
        availableHeight: (_, { height }) => height,
        padding: (_, { padding }) => padding,
      }),
      resize: assign({
        scale: context => {
          const { width, height, availableWidth, availableHeight, padding } =
            context;
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
      setTool: assign({ tool: (_, { tool }) => tool }),
      setLabeledArray: assign((_, { labeledArray }) => ({ labeledArray })),
    },
  }
);

export default canvasMachine;
