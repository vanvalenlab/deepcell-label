import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from '../eventBus';
import createBrushMachine from './segment/brushMachine';
import createFloodMachine from './segment/floodMachine';
import createSelectMachine from './segment/selectMachine';
import createThresholdMachine from './segment/thresholdMachine';
import { toolActions, toolGuards } from './segment/toolUtils';
import createTrimMachine from './segment/trimMachine';
import createWatershedMachine from './segment/watershedMachine';

const { pure, respond } = actions;

const colorTools = ['brush', 'select', 'trim', 'flood'];
const grayscaleTools = ['brush', 'select', 'trim', 'flood', 'threshold', 'watershed'];
const panTools = ['select', 'trim', 'flood', 'watershed'];
const noPanTools = ['brush', 'threshold'];

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
};

const editActions = {
  swap: send(
    ({ foreground, background }) => ({
      type: 'EDIT',
      action: 'swap_single_frame',
      args: {
        a: foreground,
        b: background,
      },
    }),
    { to: 'api' }
  ),
  replace: send(
    ({ foreground, background }) => ({
      type: 'EDIT',
      action: 'replace',
      args: {
        a: foreground,
        b: background,
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
      action: 'replace',
      args: { a: 0, b: selected },
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

const createSegmentMachine = ({ eventBuses }) =>
  Machine(
    {
      id: 'segment',
      invoke: [
        { id: 'api', src: fromEventBus('segment', () => eventBuses.api) },
        { src: fromEventBus('segment', () => eventBuses.raw) },
      ],
      context: {
        foreground: null,
        background: null,
        selected: null,
        tool: 'select',
        tools: null,
        eventBuses,
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

        // from canvas event bus (forwarded from parent)
        mousedown: { actions: 'forwardToTool' },
        mouseup: { actions: 'forwardToTool' },
        HOVERING: { actions: 'forwardToTools' },
        COORDINATES: { actions: 'forwardToTools' },
        // from selected labels event bus
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
            brush: spawn(createBrushMachine(context), 'brush'),
            select: spawn(createSelectMachine(context), 'select'),
            threshold: spawn(createThresholdMachine(context), 'threshold'),
            trim: spawn(createTrimMachine(context), 'trim'),
            flood: spawn(createFloodMachine(context), 'flood'),
            watershed: spawn(createWatershedMachine(context), 'watershed'),
          }),
        }),
        forwardToTool: forwardTo(({ tool }) => tool),
        forwardToTools: pure(({ tools }) => Object.values(tools).map((tool) => forwardTo(tool))),
      },
    }
  );

export default createSegmentMachine;
