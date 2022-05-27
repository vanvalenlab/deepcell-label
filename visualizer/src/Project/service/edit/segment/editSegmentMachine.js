import { actions, assign, forwardTo, Machine, send, sendParent, spawn } from 'xstate';
import { fromEventBus } from '../../eventBus';
import createBrushMachine from './brushMachine';
import createFloodMachine from './floodMachine';
import createSelectMachine from './selectMachine';
import createThresholdMachine from './thresholdMachine';
import createTrimMachine from './trimMachine';
import createWatershedMachine from './watershedMachine';

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

const createEditSegmentMachine = (context) =>
  Machine(
    {
      id: 'editSegment',
      entry: [
        send('REGISTER_UI', { to: context.undoRef }),
        'spawnTools',
        send('GET_SELECTED', { to: 'select' }),
      ],
      invoke: [
        { id: 'arrays', src: fromEventBus('editSegment', () => context.eventBuses.arrays) },
        { src: fromEventBus('editSegment', () => context.eventBuses.raw) }, // COLOR & GRAYSCALE events
        { id: 'select', src: fromEventBus('editSegment', () => context.eventBuses.select) },
      ],
      context: {
        selected: null,
        tool: 'select',
        tools: null,
        eventBuses: context.eventBuses,
      },
      type: 'parallel',
      states: {
        display: displayState,
        pan: panState,
      },
      on: {
        // from canvas event bus (forwarded from parent)
        mousedown: { actions: 'forwardToTool' },
        mouseup: { actions: 'forwardToTool' },
        COORDINATES: { actions: 'forwardToTools' },
        // from selected labels event bus
        SELECTED: { actions: 'setSelected' },

        ERODE: { actions: 'erode' },
        DILATE: { actions: 'dilate' },

        SAVE: { actions: 'save' },
        RESTORE: { actions: ['restore', respond('RESTORED')] },
      },
    },
    {
      guards: {
        usingColorTool: (ctx) => colorTools.includes(ctx.tool),
        usingGrayscaleTool: (ctx) => grayscaleTools.includes(ctx.tool),
        isColorTool: (_, evt) => colorTools.includes(evt.tool),
        isGrayscaleTool: (_, evt) => grayscaleTools.includes(evt.tool),
        isNoPanTool: (_, evt) => noPanTools.includes(evt.tool),
        isPanTool: (_, evt) => panTools.includes(evt.tool),
      },
      actions: {
        setLabelHistory: assign({ labelHistory: (_, __, meta) => meta._event.origin }),
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setTool: pure((ctx, evt) => [send('EXIT', { to: ctx.tool }), assign({ tool: evt.tool })]),
        save: respond((ctx) => ({ type: 'RESTORE', tool: ctx.tool })),
        restore: assign({ tool: (_, evt) => evt.tool }),
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
        forwardToTool: forwardTo((ctx) => ctx.tool),
        forwardToTools: pure((ctx) => Object.values(ctx.tools).map((tool) => forwardTo(tool))),
        erode: send(
          ({ selected }) => ({
            type: 'EDIT',
            action: 'erode',
            args: { label: selected },
          }),
          { to: 'arrays' }
        ),
        dilate: send(
          ({ selected }) => ({
            type: 'EDIT',
            action: 'dilate',
            args: { label: selected },
          }),
          { to: 'arrays' }
        ),
        autofit: send(
          ({ selected }) => ({
            type: 'EDIT',
            action: 'active_contour',
            args: { label: selected },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createEditSegmentMachine;
