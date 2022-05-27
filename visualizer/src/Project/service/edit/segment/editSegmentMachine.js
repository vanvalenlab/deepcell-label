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
        { id: 'arrays', src: fromEventBus('editSegment', () => context.eventBuses.arrays, []) },
        { src: fromEventBus('editSegment', () => context.eventBuses.raw, ['COLOR', 'GRAYSCALE']) },
        {
          id: 'select',
          src: fromEventBus('editSegment', () => context.eventBuses.select, 'SELECTED'),
        },
      ],
      context: {
        selected: null,
        tool: 'select',
        tools: null,
        eventBuses: context.eventBuses,
      },
      type: 'parallel',
      states: {
        display: {
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
        },
        pan: {
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
        },
      },
      on: {
        // from canvas event bus (forwarded from parent)
        mousedown: { actions: 'forwardToTool' },
        mouseup: { actions: [(c, e) => console.log(c, e), 'forwardToTool'] },
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
        setSelected: assign({ selected: (_, evt) => evt.selected }),
        setTool: pure((ctx, evt) => [
          send('EXIT', { to: ctx.tools[ctx.tool] }),
          assign({ tool: evt.tool }),
        ]),
        save: respond((ctx) => ({ type: 'RESTORE', tool: ctx.tool })),
        restore: assign({ tool: (_, evt) => evt.tool }),
        spawnTools: assign({
          tools: (context) => ({
            select: spawn(createSelectMachine(context)),
            brush: spawn(createBrushMachine(context)),
            threshold: spawn(createThresholdMachine(context)),
            trim: spawn(createTrimMachine(context)),
            flood: spawn(createFloodMachine(context)),
            watershed: spawn(createWatershedMachine(context)),
          }),
        }),
        forwardToTool: forwardTo((ctx) => ctx.tools[ctx.tool]),
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
