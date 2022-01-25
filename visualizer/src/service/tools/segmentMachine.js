import { actions, assign, forwardTo, Machine, send, spawn } from 'xstate';
import { canvasEventBus } from '../canvasMachine';
import { fromEventBus } from '../eventBus';
import { rawEventBus } from '../raw/rawMachine';
import brushMachine from './segment/brushMachine';
import floodMachine from './segment/floodMachine';
import selectMachine from './segment/selectMachine';
import thresholdMachine from './segment/thresholdMachine';
import { toolActions, toolGuards } from './segment/toolUtils';
import trimMachine from './segment/trimMachine';
import watershedMachine from './segment/watershedMachine';

const { pure, respond } = actions;

const colorTools = ['brush', 'select', 'trim', 'flood'];
const grayscaleTools = ['brush', 'select', 'trim', 'flood', 'threshold', 'watershed'];
const panTools = ['select', 'trim', 'flood', 'watershed'];
const noPanTools = ['brush', 'threshold'];

const panState = {
  initial: 'pan',
  states: {
    pan: {
      entry: send({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }, { to: 'canvas' }),
      on: {
        SET_TOOL: { cond: 'isNoPanTool', target: 'noPan' },
      },
    },
    noPan: {
      entry: send({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }, { to: 'canvas' }),
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
};

const editActions = {
  swap: send(
    ({ foreground, background }) => ({
      type: 'EDIT',
      action: 'swap_single_frame',
      args: {
        label_1: foreground,
        label_2: background,
      },
    }),
    { to: 'api' }
  ),
  replace: send(
    ({ foreground, background }) => ({
      type: 'EDIT',
      action: 'replace_single',
      args: {
        label_1: foreground,
        label_2: background,
      },
    }),
    { to: 'api' }
  ),
  erode: send(
    ({ selected }) => ({
      type: 'EDIT',
      action: 'erode',
      args: { label: selected },
    }),
    { to: 'api' }
  ),
  dilate: send(
    ({ selected }) => ({
      type: 'EDIT',
      action: 'dilate',
      args: { label: selected },
    }),
    { to: 'api' }
  ),
  delete: send(
    ({ selected }) => ({
      type: 'EDIT',
      action: 'replace_single',
      args: { label_1: 0, label_2: selected },
    }),
    { to: 'api' }
  ),
  autofit: send(
    ({ selected }) => ({
      type: 'EDIT',
      action: 'active_contour',
      args: { label: selected },
    }),
    { to: 'api' }
  ),
};

const segmentMachine = Machine(
  {
    id: 'segment',
    invoke: [
      {
        id: 'canvas',
        src: fromEventBus('segment', () => canvasEventBus),
      },
      { src: fromEventBus('segment', () => rawEventBus) },
    ],
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
    },
    on: {
      // undo/redo actions
      SAVE: { actions: 'save' },
      RESTORE: { actions: ['restore', respond('RESTORED')] },

      mousedown: { actions: 'forwardToTool' },
      mouseup: { actions: 'forwardToTool' },
      FOREGROUND: { actions: 'setForeground' },
      BACKGROUND: { actions: 'setBackground' },
      SELECTED: { actions: 'setSelected' },

      SWAP: { actions: 'swap' },
      REPLACE: { actions: 'replace' },
      DELETE: { actions: 'delete' },
      ERODE: { actions: 'erode' },
      DILATE: { actions: 'dilate' },
    },
  },
  {
    guards: {
      ...toolGuards,
      usingColorTool: ({ tool }) => colorTools.includes(tool),
      isColorTool: (_, { tool }) => colorTools.includes(tool),
      usingGrayscaleTool: ({ tool }) => grayscaleTools.includes(tool),
      isGrayscaleTool: (_, { tool }) => grayscaleTools.includes(tool),
      isNoPanTool: (_, { tool }) => noPanTools.includes(tool),
      isPanTool: (_, { tool }) => panTools.includes(tool),
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
        tools: (context) => ({
          brush: spawn(brushMachine, 'brush'),
          select: spawn(selectMachine, 'select'),
          threshold: spawn(thresholdMachine, 'threshold'),
          trim: spawn(trimMachine, 'trim'),
          flood: spawn(floodMachine, 'flood'),
          watershed: spawn(watershedMachine, 'watershed'),
        }),
      }),
      forwardToTool: forwardTo(({ tool }) => tool),
      forwardToTools: pure(({ tools }) => Object.values(tools).map((tool) => forwardTo(tool))),
    },
  }
);

export default segmentMachine;
