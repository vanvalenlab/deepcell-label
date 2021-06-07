import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards, toolServices } from './toolUtils';

const createFloodMachine = ({ x, y, label, foreground, background }) => Machine(
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
            { cond: 'onBackground', actions: 'flood' },
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
      flood: sendParent(({ foreground, x, y}, event) => ({
        type: 'EDIT',
        action: 'flood',
        args: {
          label: foreground,
          x_location: x,
          y_location: y,
        },
      })),
    },
  }
);

export default createFloodMachine;
