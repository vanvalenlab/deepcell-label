import { bind, unbind } from 'mousetrap';
import {
  actions,
  assign,
  forwardTo,
  Machine,
  send,
  sendParent,
  spawn,
} from 'xstate';
import createBrushMachine from './tools/brushMachine';
import createFloodMachine from './tools/floodMachine';
import createSelectMachine from './tools/selectMachine';
import createThresholdMachine from './tools/thresholdMachine';
import { toolActions, toolGuards } from './tools/toolUtils';
import createTrimMachine from './tools/trimMachine';
import createWatershedMachine from './tools/watershedMachine';

const { pure, respond } = actions;

// TODO: move to config file?
const colorTools = ['brush', 'select', 'trim', 'flood'];
const grayscaleTools = [
  'brush',
  'select',
  'trim',
  'flood',
  'watershed',
  'threshold',
];

const createToolMachineLookup = {
  brush: createBrushMachine,
  select: createSelectMachine,
  threshold: createThresholdMachine,
  trim: createTrimMachine,
  flood: createFloodMachine,
  watershed: createWatershedMachine,
};

const createToolMachine = context => {
  const { tool } = context;
  return spawn(createToolMachineLookup[tool](context), 'tool');
};

const colorModeState = {
  initial: 'color',
  states: {
    color: {
      on: {
        GRAYSCALE: 'grayscale',
      },
    },
    grayscale: {
      on: {
        COLOR: [
          { target: 'color', cond: 'usingColorTool' },
          { target: 'color', actions: 'useSelect' },
        ],
        USE_WATERSHED: { actions: 'useWatershed' },
        USE_THRESHOLD: { actions: 'useThreshold' },
        AUTOFIT: { actions: 'autofit' },
      },
    },
  },
  on: {
    USE_BRUSH: { actions: 'useBrush' },
    USE_ERASER: { actions: 'useEraser' },
    USE_SELECT: { actions: 'useSelect' },
    USE_TRIM: { actions: 'useTrim' },
    USE_FLOOD: { actions: 'useFlood' },
  },
};

const useToolActions = {
  useBrush: pure(({ foreground: fg, background: bg }) => [
    send({ type: 'FOREGROUND', foreground: fg === 0 ? bg : fg }),
    send({ type: 'BACKGROUND', background: 0 }),
    assign({
      tool: 'brush',
      toolActor: context => spawn(createBrushMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'brush' }),
  ]),
  useEraser: pure(({ foreground: fg, background: bg }) => [
    send({ type: 'FOREGROUND', foreground: 0 }),
    send({ type: 'BACKGROUND', background: bg === 0 ? fg : bg }),
    assign({
      tool: 'brush',
      toolActor: context => spawn(createBrushMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'brush' }),
  ]),
  useSelect: pure(() => [
    assign({
      tool: 'select',
      toolActor: context => spawn(createSelectMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'select' }),
  ]),
  useTrim: pure(() => [
    assign({
      tool: 'trim',
      toolActor: context => spawn(createTrimMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'trim' }),
  ]),
  useFlood: pure(() => [
    assign({
      tool: 'flood',
      toolActor: context => spawn(createFloodMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'flood' }),
  ]),
  useWatershed: pure(() => [
    assign({
      tool: 'watershed',
      toolActor: context => spawn(createWatershedMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'watershed' }),
  ]),
  useThreshold: pure(() => [
    assign({
      tool: 'threshold',
      toolActor: context => spawn(createThresholdMachine(context), 'tool'),
    }),
    sendParent({ type: 'TOOL', tool: 'threshold' }),
  ]),
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

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
      label: 0,
      selected: 1,
      foreground: 1,
      background: 0,
      x: 0,
      y: 0,
      tool: 'select',
      toolActor: null,
    },
    entry: 'spawnTool',
    invoke: [
      { src: 'listenForToolHotkeys' },
      { src: 'listenForActionHotkeys' },
    ],
    type: 'parallel',
    states: {
      colorMode: colorModeState,
    },
    on: {
      EDIT: { actions: sendParent((_, e) => e) },

      mousedown: { actions: 'forwardToTool' },
      mouseup: { actions: 'forwardToTool' },

      SWAP: { actions: 'swap' },
      REPLACE: { actions: 'replace' },
      DELETE: { actions: 'delete' },
      ERODE: { actions: 'erode' },
      DILATE: { actions: 'dilate' },

      // sync context with tools
      COORDINATES: {
        actions: ['setCoordinates', 'forwardToTool'],
      },
      LABEL: { actions: ['setLabel', 'forwardToTool'] },
      FOREGROUND: { actions: ['setForeground', 'forwardToTool'] },
      BACKGROUND: { actions: ['setBackground', 'forwardToTool'] },
      SELECTED: { actions: ['setSelected', 'forwardToTool'] },

      // undo/redo actions
      SAVE: { actions: 'save' },
      RESTORE: { actions: ['restore', 'spawnTool', respond('RESTORED')] },

      // select events (from select tool)
      SELECT_FOREGROUND: { actions: sendParent((c, e) => e) },
      SELECT_BACKGROUND: { actions: sendParent((c, e) => e) },
      RESET_FOREGROUND: { actions: sendParent((c, e) => e) },
    },
  },
  {
    services: {
      listenForActionHotkeys: () => send => {
        bind('s', () => send('SWAP'));
        bind('r', () => send('REPLACE'));
        bind('q', () => send('ERODE'));
        bind('shift+q', () => send('DILATE'));
        bind(['del', 'backspace'], () => send('DELETE'));
        return () => {
          unbind('s');
          unbind('r');
          unbind('q');
          unbind('shift+q');
          unbind(['del', 'backspace']);
        };
      },
      listenForToolHotkeys: () => send => {
        bind('b', () => send('USE_BRUSH'));
        bind('e', () => send('USE_ERASER'));
        bind('v', () => send('USE_SELECT'));
        bind('t', () => send('USE_THRESHOLD'));
        bind('k', () => send('USE_TRIM'));
        bind('g', () => send('USE_FLOOD'));
        bind('w', () => send('USE_WATERSHED'));
        return () => {
          unbind('b');
          unbind('e');
          unbind('v');
          unbind('t');
          unbind('k');
          unbind('g');
          unbind('w');
        };
      },
    },
    guards: {
      ...toolGuards,
      usingColorTool: ({ tool }) => colorTools.includes(tool),
      colorTool: (_, { tool }) => colorTools.includes(tool),
      grayscaleTool: (_, { tool }) => grayscaleTools.includes(tool),
    },
    actions: {
      ...toolActions,
      ...editActions,
      ...useToolActions,
      save: respond(({ tool, foreground, background }) => ({
        type: 'RESTORE',
        tool,
        foreground,
        background,
      })),
      restore: assign((_, { tool, foreground, background }) => ({
        tool,
        foreground,
        background,
      })),
      useTool: assign({ tool: (_, { tool }) => tool }),
      spawnTool: assign({ toolActor: createToolMachine }),
      changeGrayscaleTools: assign({
        tool: ({ tool }) => (grayscaleTools.includes(tool) ? 'select' : tool),
      }),
      forwardToTool: forwardTo(({ toolActor }) => toolActor),
      setLabels: assign({ labels: (_, { labels }) => labels }),
    },
  }
);

export default toolMachine;
