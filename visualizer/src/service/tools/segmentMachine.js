import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import brushMachine from './segment/brushMachine';
import floodMachine from './segment/floodMachine';
import selectMachine from './segment/selectMachine';
import thresholdMachine from './segment/thresholdMachine';
import { toolActions, toolGuards } from './segment/toolUtils';
import trimMachine from './segment/trimMachine';
import watershedMachine from './segment/watershedMachine';

const { pure, respond } = actions;

const panState = {
  initial: 'pan',
  states: {
    pan: {
      entry: sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
      on: {
        SET_TOOL: { cond: 'isNoPanTool', target: 'noPan' },
      },
    },
    noPan: {
      entry: sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }),
      on: {
        SET_TOOL: { cond: 'isPanTool', target: 'pan' },
      },
    },
  },
};

const displayState = {
  initial: 'color',
  states: {
    color: {
      on: {
        GRAYSCALE: 'grayscale',
        SET_TOOL: { cond: 'isColorTool', actions: 'setTool' },
      },
    },
    grayscale: {
      on: {
        COLOR: [
          { target: 'color', cond: 'usingColorTool' },
          { target: 'color', actions: 'useSelect' },
        ],
        SET_TOOL: { cond: 'isGrayscaleTool', actions: 'setTool' },
        AUTOFIT: { actions: 'autofit' },
      },
    },
  },
  on: {
    // available in all display states
    SWAP: { actions: 'swap' },
    REPLACE: { actions: 'replace' },
    DELETE: { actions: 'delete' },
    ERODE: { actions: 'erode' },
    DILATE: { actions: 'dilate' },
  },
};

const syncState = {
  on: {
    // only send to tool in use
    mousedown: { actions: 'forwardToTool' },
    mouseup: { actions: 'forwardToTool' },
    // send to all tools
    COORDINATES: { actions: 'forwardToTools' },
    HOVERING: { actions: 'forwardToTools' },
    FOREGROUND: { actions: ['forwardToTools', 'setForeground'] },
    BACKGROUND: { actions: ['forwardToTools', 'setBackground'] },
    SELECTED: { actions: ['forwardToTools', 'setSelected'] },
  },
};

const editActions = {
  swap: send(({ foreground, background }) => ({
    type: 'EDIT',
    action: 'swap_single_frame',
    args: {
      label_1: foreground,
      label_2: background,
    },
  })),
  replace: send(({ foreground, background }) => ({
    type: 'EDIT',
    action: 'replace_single',
    args: {
      label_1: foreground,
      label_2: background,
    },
  })),
  erode: send(({ selected }) => ({
    type: 'EDIT',
    action: 'erode',
    args: { label: selected },
  })),
  dilate: send(({ selected }) => ({
    type: 'EDIT',
    action: 'dilate',
    args: { label: selected },
  })),
  delete: send(({ selected }) => ({
    type: 'EDIT',
    action: 'replace_single',
    args: { label_1: 0, label_2: selected },
  })),
  autofit: send(({ selected }) => ({
    type: 'EDIT',
    action: 'active_contour',
    args: { label: selected },
  })),
};

const segmentMachine = Machine(
  {
    id: 'segment',
    context: {
      foreground: null,
      background: null,
      selected: null,
      tool: 'select',
      tools: null,
    },
    entry: 'spawnTools',
    type: 'parallel',
    states: {
      display: displayState,
      pan: panState,
      sync: syncState,
    },
    on: {
      EDIT: { actions: sendParent((_, e) => e) },

      // undo/redo actions
      SAVE: { actions: 'save' },
      RESTORE: { actions: ['restore', respond('RESTORED')] },

      // select events (from select tool)
      SELECT_FOREGROUND: { actions: sendParent((c, e) => e) },
      SELECT_BACKGROUND: { actions: sendParent((c, e) => e) },
      RESET_FOREGROUND: { actions: sendParent((c, e) => e) },
    },
  },
  {
    guards: {
      ...toolGuards,
      usingColorTool: ({ tool }) => ['brush', 'select', 'trim', 'flood'].includes(tool),
      isColorTool: (_, { tool }) => ['brush', 'select', 'trim', 'flood'].includes(tool),
      usingGrayscaleTool: ({ tool }) =>
        ['brush', 'select', 'trim', 'flood', 'threshold', 'watershed'].includes(tool),
      isGrayscaleTool: (_, { tool }) =>
        ['brush', 'select', 'trim', 'flood', 'threshold', 'watershed'].includes(tool),
      isNoPanTool: (_, { tool }) => ['brush', 'threshold'].includes(tool),
      isPanTool: (_, { tool }) => ['select', 'trim', 'flood', 'watershed'].includes(tool),
    },
    actions: {
      ...toolActions,
      ...editActions,
      setTool: pure((context, event) => [
        send('EXIT', { to: context.tool }),
        assign({ tool: event.tool }),
      ]),
      save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
      restore: assign((_, { tool }) => ({ tool })),
      spawnTools: assign({
        tools: context => ({
          brush: spawn(brushMachine, 'brush'),
          select: spawn(selectMachine, 'select'),
          threshold: spawn(thresholdMachine, 'threshold'),
          trim: spawn(trimMachine, 'trim'),
          flood: spawn(floodMachine, 'flood'),
          watershed: spawn(watershedMachine, 'watershed'),
        }),
      }),
      forwardToTool: forwardTo(({ tool }) => tool),
      forwardToTools: pure(({ tools }) => Object.values(tools).map(tool => forwardTo(tool))),
    },
  }
);

export default segmentMachine;
