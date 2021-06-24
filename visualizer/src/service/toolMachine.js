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

const selectActions = {
  selectForeground: pure(({ label, foreground, background }) => {
    return [
      send({ type: 'FOREGROUND', foreground: label }),
      send({
        type: 'BACKGROUND',
        background: label === background ? foreground : background,
      }),
    ];
  }),
  selectBackground: pure(({ label, foreground, background }) => {
    return [
      send({ type: 'BACKGROUND', background: label }),
      send({
        type: 'FOREGROUND',
        foreground: label === foreground ? background : foreground,
      }),
    ];
  }),
  switch: pure(({ foreground, background }) => {
    return [
      send({ type: 'FOREGROUND', foreground: background }),
      send({ type: 'BACKGROUND', background: foreground }),
    ];
  }),
  newForeground: send(({ maxLabel }) => ({
    type: 'FOREGROUND',
    foreground: maxLabel + 1,
  })),
  resetForeground: send({ type: 'FOREGROUND', foreground: 0 }),
  resetBackground: send({ type: 'BACKGROUND', background: 0 }),
  prevForeground: send(({ foreground: fg, maxLabel: max }) => ({
    type: 'FOREGROUND',
    foreground: fg <= 1 ? max : fg - 1,
  })),
  nextForeground: send(({ foreground: fg, maxLabel: max }) => ({
    type: 'FOREGROUND',
    foreground: fg >= max ? 1 : fg + 1,
  })),
  prevBackground: send(({ background: bg, maxLabel: max }) => ({
    type: 'BACKGROUND',
    background: bg <= 1 ? max : bg - 1,
  })),
  nextBackground: send(({ background: bg, maxLabel: max }) => ({
    type: 'BACKGROUND',
    background: bg >= max ? 1 : bg + 1,
  })),
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

const selectState = {
  invoke: { src: 'listenForSelectHotkeys' },
  on: {
    SELECT_FOREGROUND: { actions: 'selectForeground' },
    SELECT_BACKGROUND: { actions: 'selectBackground' },
    SWITCH: { actions: 'switch' },
    NEW_FOREGROUND: { actions: 'newForeground' },
    RESET_FOREGROUND: { actions: 'resetForeground' },
    RESET_BACKGROUND: { actions: 'resetBackground' },
    PREV_FOREGROUND: { actions: 'prevForeground' },
    NEXT_FOREGROUND: { actions: 'nextForeground' },
    PREV_BACKGROUND: { actions: 'prevBackground' },
    NEXT_BACKGROUND: { actions: 'nextBackground' },
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

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
      selected: 1,
      foreground: 1,
      background: 0,
      x: 0,
      y: 0,
      label: 0,
      frame: 0,
      feature: 0,
      channel: 0,
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
      select: selectState,
    },
    on: {
      mousedown: { actions: 'forwardToTool' },
      mouseup: { actions: 'forwardToTool' },

      SWAP: { actions: 'swap' },
      REPLACE: { actions: 'replace' },
      DELETE: { actions: 'delete' },
      ERODE: { actions: 'erode' },
      DILATE: { actions: 'dilate' },

      // context not shared with tools
      FRAME: { actions: 'setFrame' },
      CHANNEL: { actions: 'setChannel' },
      FEATURE: { actions: 'setFeature' },
      LABELED_ARRAY: { actions: ['setLabeledArray', 'sendLabel'] },
      LABELS: { actions: 'setMaxLabel' },

      // context to sync with tools
      COORDINATES: {
        actions: ['setCoordinates', 'sendLabel', 'forwardToTool'],
      },
      LABEL: { actions: ['setLabel', 'forwardToTool'] },
      FOREGROUND: { actions: ['setForeground', 'forwardToTool'] },
      BACKGROUND: { actions: ['setBackground', 'forwardToTool'] },

      // special shift click event
      SHIFT_CLICK: [
        {
          cond: 'doubleClick',
          actions: [
            'selectForeground',
            send({ type: 'BACKGROUND', background: 0 }),
          ],
        },
        { cond: 'onBackground', actions: 'selectForeground' },
        { actions: 'selectBackground' },
      ],
      ///
      EDIT: { actions: 'sendEditWithExtraArgs' },

      // undo/redo actions
      SAVE: { actions: 'save' },
      RESTORE: { actions: ['restore', 'spawnTool', respond('RESTORED')] },
    },
  },
  {
    services: {
      listenForSelectHotkeys: () => send => {
        bind('x', () => send('SWITCH'));
        bind('n', () => send('NEW_FOREGROUND'));
        bind('esc', () => {
          send('RESET_FOREGROUND');
          send('RESET_BACKGROUND');
        });
        bind('[', () => send('PREV_FOREGROUND'));
        bind(']', () => send('NEXT_FOREGROUND'));
        bind('{', () => send('PREV_BACKGROUND'));
        bind('}', () => send('NEXT_BACKGROUND'));
        return () => {
          unbind('x');
          unbind('n');
          unbind('esc');
          unbind('[');
          unbind(']');
          unbind('{');
          unbind('}');
        };
      },
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
      ...selectActions,
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
      useTool: assign({
        tool: (_, { tool }) => tool,
      }),
      spawnTool: assign({
        toolActor: createToolMachine,
      }),
      sendLabel: send(({ labeledArray: array, x, y }) => ({
        type: 'LABEL',
        label: array ? Math.abs(array[y][x]) : 0,
      })),
      changeGrayscaleTools: assign({
        tool: ({ tool }) => (grayscaleTools.includes(tool) ? 'select' : tool),
      }),
      sendEditWithExtraArgs: sendParent(({ frame, feature, channel }, e) => ({
        ...e,
        args: { ...e.args, frame, feature, channel },
      })),
      forwardToTool: forwardTo(({ toolActor }) => toolActor),
      setMaxLabel: assign({
        maxLabel: (_, { labels }) =>
          Math.max(...Object.keys(labels).map(Number)),
      }),
    },
  }
);

export default toolMachine;
