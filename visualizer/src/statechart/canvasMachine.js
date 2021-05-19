import { Machine, actions, assign, forwardTo, send, sendParent } from 'xstate';

const { respond } = actions;

// NOTE: data coming from the browser needs to be normalized by both scale and zoom
// data coming from the statechart needs to be normalized by zoom only

const canvasMachine = Machine({
  id: 'canvas',
  context: {
    // raw dimensions of image
    width: 512,
    height: 512,
    scale: 1,  // how much the canvas is scaled to fill the available space
    zoom: 1,   // how much the image is scaled within the canvas
    // position of canvas within image
    sx: 0,
    sy: 0,
    // position of cursor within image
    x: 0,
    y: 0,
  },
  on: {
    wheel: { actions: 'zoom' },
    ZOOMIN: { actions: 'zoomIn' },
    ZOOMOUT: { actions: 'zoomOut' },
    RESIZE: { actions: 'resize' },
    TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
    SAVE: {
      actions: respond((context) => ({
        type: 'RESTORE',
        sx: context.sx,
        sy: context.sy,
        zoom: context.zoom,
      }))
    },
    RESTORE: [
      { cond: 'newContext', actions: ['restoreContext', respond('RESTORED')] },
      { actions: respond('SAMECONTEXT') },
    ],
      
  },
  initial: 'waitForProject',
  states: {
    waitForProject: {
      on: {
        PROJECT: {
          target: 'idle', actions: [
            assign((context, event) => ({
              height: event.height,
              width: event.width,
              // labeledArray: new Array(event.height).fill(new Array(event.width)),
            })),
          ]
        },
      },
    },
    idle: {
      on: {
        'keydown.Space': { target: 'panning' },
        mousemove: { actions: 'computeNewCoordinates', target: 'compareCoordinates' },
      }
    },
    panning: {
      on: {
        'keyup.Space': { target: 'idle' },
        mousemove: { actions: 'pan' },
      }
    },
    compareCoordinates: {
      always: [
        { cond: 'newCoordinates', actions: 'useNewCoordinates', target: 'sendCoordinates' },
        { target: 'idle' }
      ]
    },
    sendCoordinates: {
      always: { actions: 'sendCoordinates', target: 'idle' }
    }
  },
},
  {
    guards: {
      newCoordinates: (context) => context.newX !== context.x || context.newY !== context.y,
      newContext: (context, event) => context.sx !== event.sx || context.sy !== event.sy || context.zoom !== event.zoom,
    },
    actions: {
      restoreContext: assign((context, { type, ...savedContext }) => savedContext),
      useNewCoordinates: assign((context) => ({ x: context.newX, y: context.newY })),
      sendCoordinates: send((context) => (
        { type: 'COORDINATES', x: context.x, y: context.y }),
        {to: (context) => context.toolRef}
      ),
      computeNewCoordinates: assign((context, event) => {
        let newX = Math.floor((event.nativeEvent.offsetX / context.scale / context.zoom + context.sx));
        let newY = Math.floor((event.nativeEvent.offsetY / context.scale / context.zoom + context.sy));
        newX = Math.max(0, Math.min(newX, context.width - 1));
        newY = Math.max(0, Math.min(newY, context.height - 1));
        return { newX, newY };
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
    }
  }
);

export default canvasMachine;
