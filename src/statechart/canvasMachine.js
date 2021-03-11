import { Machine, actions, assign, forwardTo, send } from 'xstate';

// NOTE: info coming from the browser needs to be normalized by scale and zoom
// info coming from the statechart needs to be normalized by zoom only

// const canvas = document.getElementById('brush-canvas');
// canvas.requestPointerLock = canvas.requestPointerLock ||
//                             canvas.mozRequestPointerLock;

// document.exitPointerLock = document.exitPointerLock ||
//                            document.mozExitPointerLock;

const canvasMachine = Machine({
  initial: 'idle',
  states: {
    idle: {
      on: {
        'keydown.Space': { target: 'panning', actions: 'lockPointer' },
        mousemove: { actions: 'moveCursor' },
      },
    },
    panning: {
      on: {
        'keyup.Space': { target: 'idle', actions: 'unlockPointer' },
        mousemove: { actions: 'pan' },
      },
    },
  },
  context: {
    scale: 1,  // how much the canvas is scaled to fill the available space
    zoom: 1,   // how much the image is scaled within the canvas
    sx: 0,
    sy: 0,
    // raw dimensions of image
    width: 160,
    height: 160,
    imgX: 0,
    imgY: 0,
  },
  on: {
    wheel: {actions: 'zoom' },
    RESIZE: { actions: 'resize' },
  },

},
  {
    actions: {
      lockPointer: () => document.getElementById('canvasBox').requestPointerLock(),
      unlockPointer: () => document.exitPointerLock(),
      moveCursor: assign({
        imgX: (context, event) => Math.floor((event.nativeEvent.offsetX / context.scale / context.zoom + context.sx)),
        imgY: (context, event) => Math.floor((event.nativeEvent.offsetY / context.scale / context.zoom + context.sy)),
      }),
      resize: assign({
        scale: (context, event) => {
          const scaleX = (event.width - 2 * event.padding) / context.width;
          const scaleY = (event.height - 2 * event.padding) / context.height;
          // pick scale that accomodates both dimensions; can be less than 1
          const scale = Math.min(scaleX, scaleY);
          return scale;
        },
      }),
      pan: assign({
        sx: (context, event) => {
          const dx = -1 * event.movementX / context.zoom / context.scale;
          let newSx = context.sx + dx;
          newSx = Math.min(newSx, context.width * (1 - 1 / context.zoom));
          newSx = Math.max(newSx, 0);
          return newSx;
        },
        sy: (context, event) => {
          const dy = -1 * event.movementY / context.zoom / context.scale;
          let newSy = context.sy + dy;
          newSy = Math.min(newSy, context.height * (1 - 1 / context.zoom));
          newSy = Math.max(newSy, 0);
          return newSy;
        },
      }),
      zoom: assign({
        zoom: (context, event) => {
          const zoomFactor = 1 + event.deltaY / window.innerHeight;
          const newZoom = Math.max(context.zoom * zoomFactor, 1);
          return newZoom;
        },
        sx: (context, event) => {
          const zoomFactor = 1 + event.deltaY / window.innerHeight;
          const newZoom = Math.max(context.zoom * zoomFactor, 1);
          const propX = event.nativeEvent.offsetX / context.scale;
          let newSx = context.sx + propX * (1 / context.zoom - 1 / newZoom);
          newSx = Math.min(newSx, context.width * (1 - 1 / newZoom));
          newSx = Math.max(newSx, 0);
          return newSx;
        },
        sy: (context, event) => {
          const zoomFactor = 1 + event.deltaY / window.innerHeight;
          const newZoom = Math.max(context.zoom * zoomFactor, 1);
          const propY = event.nativeEvent.offsetY / context.scale;
          let newSy = context.sy + propY * (1 / context.zoom - 1 / newZoom);
          newSy = Math.min(newSy, context.height * (1 - 1 / newZoom));
          newSy = Math.max(newSy, 0);
          return newSy;
        },
      }),
    }
  }
);

export default canvasMachine;