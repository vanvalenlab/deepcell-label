import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards, toolServices } from './toolUtils';

const createTrimMachine = ({ x, y, label, foreground, background }) => Machine(
  {
    context: {
      x,
      y,
      label,
      foreground,
      background,
      moveX: 0,
      moveY: 0,
    },
    on: {
      COORDINATES: { actions: 'setCoordinates' },
      LABEL: { actions: 'setLabel' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
    },
    invoke: { 
      src: 'listenForMouseUp',
    },
    initial: 'idle',
    states: {
      idle: {
        entry: 'resetMove',
        on: {
          mousedown: 'pressed',
        }
      },
      pressed: {
        on: {
          mousemove: [
            { cond: 'moved', target: 'dragged'}, 
            { actions: 'updateMove' }
          ],
          mouseup: [
            { cond: 'onNoLabel' },
            { cond: 'onBackground', actions: 'trim' },
            { actions: 'selectBackground' },
          ],
        }
      },
      dragged: {
        on: { mouseup: 'idle' },
      },
    },
  },
  {
    services: toolServices,
    guards: toolGuards,
    actions: {
      ...toolActions,
      selectBackground: sendParent('SELECTBACKGROUND'),
      trim: sendParent(({ label, x, y}, event) => ({
        type: 'EDIT',
        action: 'trim_pixels',
        args: {
          label: label,
          x_location: x,
          y_location: y,
        },
      })),
    }
  }
);

export default createTrimMachine;
