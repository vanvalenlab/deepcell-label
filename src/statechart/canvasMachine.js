import { Machine, actions, assign, forwardTo, send } from 'xstate';

// NOTE: info coming from the browser needs to be normalized by scale and zoom
// info coming from the statechart needs to be normalized by zoom only

const canvasMachine = Machine({
  initial: 'idle',
  states: { idle: {} },
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
    RESIZE: { actions: 'resize' },
    ZOOM: { actions: 'setZoom' },
    PAN: { actions: 'pan' },
    mousemove: { actions: 'moveCursor' },
  },

},
  {
    actions: {
      log: (context, event) => console.log(context.imgX),
      resize: assign({
        scale: (context, event) => {
          const scaleX = (event.width - 2 * event.padding) / context.width;
          const scaleY = (event.height - 2 * event.padding) / context.height;
          // pick scale that accomodates both dimensions; can be less than 1
          const scale = Math.min(scaleX, scaleY);
          return scale;
        },
      }),
      setScale: assign({ scale: (_, event) => event.scale }),
      setZoom: assign({ zoom: (context, event) => event.zoom }),
      moveCursor: assign({
        imgX: (context, event) => Math.floor((event.nativeEvent.offsetX / context.scale / context.zoom + context.sx)),
        imgY: (context, event) => Math.floor((event.nativeEvent.offsetY / context.scale / context.zoom + context.sy)),
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
          const dy = -1 * event.movementY * context.zoom;
          let newSy = context.sy + dy;
          newSy = Math.min(newSy, context.height * (1 - 1 / context.zoom));
          newSy = Math.max(newSy, 0);
          return newSy;
        },
      }),
    }  
  }
);

export default canvasMachine;