/* eslint-disable comma-dangle */
import { Machine, actions, assign } from 'xstate';
const { pure } = actions;

const getModel = () => window.model;


const outlineAll = (context, event) => { };
const outlineWhite = (context, event) => { };
const outlineRed = (context, event) => { };
const drawOutline = pure((context, event) => {
  if (context.rgb) {
    return outlineAll;
  } else if (context.foreground !== 0 && context.background !== 0) {
    return [outlineWhite, outlineRed];
  } else if (context.foreground !== 0) {
    return outlineWhite;
  } else if (context.background !== 0) {
    return outlineRed;
  }
});

const adjustMachine = Machine(
  {
    id: 'adjuster',
    initial: 'raw',
    context: {
      rawImage: null,
      rgb: null,
      brightness: null,
      contrast: null,
      segImage: null,
      segArray: null,
      opacity: null,
      foreground: null,
      background: null,
      brushImage: null,
      canvas: document.createElement('canvas'),
    },
    states: {
      raw: {
        always: [{
          target: 'brightness',
          cond: (context) => !!context.rawImage
          // actions:
        }]
      },
      brightness: {
        entry: 'adjustBrightness',
        always: 'contrast',
      },
      contrast: {
        entry: 'adjustContrast',
        always: [
          {
            target: 'invert',
            cond: (context) => !context.rgb,
          },
          {
            target: 'label',
            cond: (context) => context.rgb,
          }
        ]
      },
      invert: {
        entry: 'invert',
        always: 'greyscale',
      },
      greyscale: {
        entry: 'greyscale',
        always: 'label',
      },
      label: {
        always: [{
          target: 'highlight',
          cond: (context) => !!context.labelImage
        }]
      },
      highlight: {
        entry: 'drawHighlight',
        always: 'outline',

      },
      outline: {
        entry: 'drawOutline',
        always: 'brush',
      },
      brush: {
        entry: 'drawBrush',
        always: 'done',
      },
      done: { type: 'final' }
    },
    on: {
      UPDATERAW: {
        target: '.raw',
        actions: assign({
          rawImage: (_, event) => event.image,
          rgb: (_, event) => event.rgb
        })
      },
      CHANGEBRIGHTNESS: {
        target: '.brightness',
        actions: assign({ brightness: (_, event) => event.value })
      },
      CHANGECONTRAST: {
        target: '.contrast',
        actions: assign({ contrast: (_, event) => event.value })
      },
      UPDATELABEL: {
        target: '.label',
        actions: assign({ labelImage: (_, event) => event.image })
      },
      CHANGEOPACITY: {
        target: '.highlight',
        actions: assign({ opacity: (_, event) => event.value })
      },
      CHANGEFOREGROUND: {
        target: '.highlight',
        actions: assign({ foreground: (_, event) => event.value })
      },
      CHANGEBACKGROUND: {
        target: '.highlight',
        actions: assign({ background: (_, event) => event.value })
      },
      UPDATEBRUSH: {
        target: '.brush',
        actions: assign({ brushImage: (context, event) => event.image })
      },
    }
  },
  {
    actions: {
      adjustBrightness: (context) => { 
        // const ctx = context.canvas.getContext('2d');
        // ctx.clearRect(0, 0, this.width, this.height);
        // this.ctx.drawImage(this.rawImage, 0, 0, this.width, this.height);
        // const rawData = this.ctx.getImageData(0, 0, this.width, this.height);
        // this._contrastImage(rawData, this.contrast, this.brightness);
        // this.ctx.putImageData(rawData, 0, 0);
      },
      adjustContrast: () => { },
      invert: () => { },
      greyscale: () => { },
      drawHighlight: () => { },
      drawOutline: () => { },
      drawBrush: () => { },
    }
  }
);

export default adjustMachine;