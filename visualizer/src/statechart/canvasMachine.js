import { Machine, actions, assign, forwardTo, send, sendParent } from 'xstate';

const { respond } = actions;

const spacePanState = {
  invoke: { 
    src: 'listenForSpace',
  },
  on: {
    USE_TOOL: { cond: (_, { tool }) => tool !== 'brush' && tool !== 'threshold', target: 'dragToPan' },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        'keydown.Space': { target: 'panning' },
        mousemove: { actions: 'coordinates' },
      }
    },
    panning: {
      on: {
        'keyup.Space': { target: 'idle' },
        mousemove: { actions: 'pan' },
      }
    },
  },
};

const dragPanState = {
  invoke: { 
    src: 'listenForMouseUp',
  },
  initial: 'idle',
  on: {
    USE_TOOL: { cond: (_, { tool }) => tool === 'brush' || tool === 'threshold', target: 'spaceToPan' },
  },
  states: {
    idle: {
      on: {
        mousedown: { target: 'panning' },
        mousemove: { actions: 'coordinates' },
      }
    },
    panning: {
      on: {
        mouseup: { target: 'idle' },
        mousemove: { actions: 'pan' },
      }
    },
  },
};

const panState = {
  initial: 'dragToPan',
  states: {
    spaceToPan: spacePanState,
    dragToPan: dragPanState,
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
      scale: 1,  // how much the canvas is scaled to fill the available space
      zoom: 1,   // how much the image is scaled within the canvas
      // position of canvas within image
      sx: 0,
      sy: 0,
      // position of cursor within image
      x: 0,
      y: 0,
    },
    invoke: [
      { src: 'listenForMouseUp'}, 
      { src: 'listenForZoomHotkeys'},
    ],
    on: {
      wheel: { actions: 'zoom' },
      ZOOMIN: { actions: 'zoomIn' },
      ZOOMOUT: { actions: 'zoomOut' },
      DIMENSIONS: { actions: ['setDimensions', 'resize'] },
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
      COORDINATES: { cond: 'newCoordinates', actions: ['useCoordinates', 'sendCoordinates'] },
    },
    initial: 'waitForProject',
    states: {
      waitForProject: {
        on: {
          PROJECT: {
            target: 'pan', actions: [
              assign((context, event) => ({
                height: event.height,
                width: event.width,
              })),
              'resize',
            ]
          },
        },
      },
      pan: panState,
    },
  },
  {
    services: {
      listenForMouseUp: () => (send) => {
        const listener = (e) => send(e);
        window.addEventListener('mouseup', listener);
        return () => window.removeEventListener('mouseup', listener);
      },
      listenForSpace: () =>  (send) => {
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
        }
      },
      listenForZoomHotkeys: () => (send) => {
        const listener = (e) => {
          if (e.key === '=') { send('ZOOMIN'); }
          if (e.key === '-') { send('ZOOMOUT'); }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
    },
    guards: {
      newCoordinates: (context, event) => context.x !== event.y || context.y !== event.y,
      newContext: (context, event) => context.sx !== event.sx || context.sy !== event.sy || context.zoom !== event.zoom,
    },
    actions: {
      restoreContext: assign((context, { type, ...savedContext }) => savedContext),
      useCoordinates: assign((_, { x, y}) => ({ x, y })),
      sendCoordinates: send(({ x, y }) => (
        { type: 'COORDINATES', x, y }),
        {to: (context) => context.toolRef}
      ),
      coordinates: send((context, event) => {
        const { scale, zoom, width, height, sx, sy } = context;
        let x = Math.floor((event.nativeEvent.offsetX / scale / zoom + sx));
        let y = Math.floor((event.nativeEvent.offsetY / scale / zoom + sy));
        x = Math.max(0, Math.min(x, width - 1));
        y = Math.max(0, Math.min(y, height - 1));
        return { type: 'COORDINATES', x, y }
      }),
      setDimensions: assign({
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
