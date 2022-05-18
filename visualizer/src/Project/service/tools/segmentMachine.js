import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from '../eventBus';
import createBrushMachine from './segment/brushMachine';
import createFloodMachine from './segment/floodMachine';
import createSelectMachine from './segment/selectMachine';
import createThresholdMachine from './segment/thresholdMachine';
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

const createSegmentMachine = (context) =>
  Machine(
    {
      id: 'segment',
      invoke: [
        { id: 'api', src: fromEventBus('segment', () => context.eventBuses.api) },
        { src: fromEventBus('segment', () => context.eventBuses.raw) },
        { id: 'select', src: fromEventBus('segment', () => context.eventBuses.select) },
      ],
      context: {
        selected: null,
        tool: 'select',
        tools: null,
        eventBuses: context.eventBuses,
      },
      initial: 'getSelected',
      states: {
        getSelected: {
          entry: send('GET_SELECTED', { to: 'select' }),
          on: {
            SELECTED: { actions: 'setSelected' },
          },
          always: { cond: 'have selected labels', target: 'idle' },
        },
        idle: {
          entry: 'spawnTools',
          type: 'parallel',
          states: {
            display: displayState,
            pan: panState,
          },
          on: {
            // from canvas event bus (forwarded from parent)
            mousedown: { actions: 'forwardToTool' },
            mouseup: { actions: 'forwardToTool' },
            HOVERING: { actions: 'forwardToTools' },
            COORDINATES: { actions: 'forwardToTools' },
            // from selected labels event bus
            SELECTED: { actions: 'setSelected' },

            SWAP: { actions: 'swap' },
            REPLACE: { actions: 'replace' },
            DELETE: { actions: 'delete' },
            ERODE: { actions: 'erode' },
            DILATE: { actions: 'dilate' },

            SAVE: { actions: 'save' },
            RESTORE: { actions: ['restore', respond('RESTORED')] },
          },
        },
      },
    },
    {
      guards: {
        usingColorTool: ({ tool }) => colorTools.includes(tool),
        isColorTool: (_, { tool }) => colorTools.includes(tool),
        usingGrayscaleTool: ({ tool }) => grayscaleTools.includes(tool),
        isGrayscaleTool: (_, { tool }) => grayscaleTools.includes(tool),
        isNoPanTool: (_, { tool }) => noPanTools.includes(tool),
        isPanTool: (_, { tool }) => panTools.includes(tool),
        'have selected labels': (context) => context.selected !== null,
      },
      actions: {
        setSelected: assign({ selected: (_, { selected }) => selected }),
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
      },
    }
  );

export default createSegmentMachine;
