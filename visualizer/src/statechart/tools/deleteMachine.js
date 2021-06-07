import { Machine, sendParent } from 'xstate';
import { toolActions, toolGuards, toolServices } from './toolUtils';

const createDeleteMachine = ({label, foreground, background }) => Machine(
  {
    context: {
      label,
      foreground,
      background,
      moveX: 0,
      moveY: 0,
    },
    on: {
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
      LABEL: { actions: 'setLabel' },
    },
    invoke: { 
      src: 'listenForMouseUp',
    },
    initial: 'idle',
    states: {
      idle: {
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
            { target: 'idle', cond: 'onNoLabel' },
            { target: 'idle', cond: 'onBackground', actions: 'delete' },
            { target: 'idle', actions: 'selectBackground' },
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
      delete: sendParent(({ label }, event) => ({
        type: 'EDIT',
        action: 'replace_single',
        args: { label_1: 0, label_2: label },
      })),
    }
  }
);

export default createDeleteMachine;