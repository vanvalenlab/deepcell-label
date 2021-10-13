import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import createBrushMachine from './segment/brushMachine';
import createFloodMachine from './segment/floodMachine';
import createSelectMachine from './segment/selectMachine';
import createThresholdMachine from './segment/thresholdMachine';
import { toolActions, toolGuards } from './segment/toolUtils';
import createTrimMachine from './segment/trimMachine';
import createWatershedMachine from './segment/watershedMachine';

const { pure, respond } = actions;

// TODO: move to config file?
const colorTools = ['brush', 'select', 'trim', 'flood'];

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
    assign({
      tool: 'brush',
      toolActor: context => spawn(createBrushMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }),
  ]),
  useEraser: pure(({ foreground: fg, background: bg }) => [
    assign({
      tool: 'brush',
      toolActor: context => spawn(createBrushMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }),
  ]),
  useSelect: pure(() => [
    assign({
      tool: 'select',
      toolActor: context => spawn(createSelectMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
  ]),
  useTrim: pure(() => [
    assign({
      tool: 'trim',
      toolActor: context => spawn(createTrimMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
  ]),
  useFlood: pure(() => [
    assign({
      tool: 'flood',
      toolActor: context => spawn(createFloodMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
  ]),
  useWatershed: pure(() => [
    assign({
      tool: 'watershed',
      toolActor: context => spawn(createWatershedMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
  ]),
  useThreshold: pure(() => [
    assign({
      tool: 'threshold',
      toolActor: context => spawn(createThresholdMachine(context), 'tool'),
    }),
    sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }),
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

const segmentMachine = Machine(
  {
    id: 'segment',
    context: {
      label: 0,
      selected: 1,
      foreground: 1,
      background: 0,
      x: 0,
      y: 0,
      tool: 'select',
      toolActor: null,
      array: null,
    },
    entry: 'spawnTool',
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
    guards: {
      ...toolGuards,
      usingColorTool: ({ tool }) => colorTools.includes(tool),
    },
    actions: {
      ...toolActions,
      ...editActions,
      ...useToolActions,
      save: respond(({ tool }) => ({ type: 'RESTORE', tool })),
      restore: assign((_, { tool }) => ({ tool })),
      spawnTool: assign({ toolActor: createToolMachine }),
      forwardToTool: forwardTo(({ toolActor }) => toolActor),
    },
  }
);

export default segmentMachine;
