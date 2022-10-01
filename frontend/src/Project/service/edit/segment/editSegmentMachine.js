/**
 * Manages the controls to edit the segmentation, like which tool is in use.
 * Sends EDIT to the arrays event bus when interacting with the action buttons.
 * Spawns machines for each tool that interacts with the canvas to send EDIT events.
 */
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
              entry: 'setPanOnDragTrue',
              on: {
                // Undo edge case can cause POD=False in this state, so must reset in this case.
                SET_TOOL: [
                  { cond: 'isNoPanTool', target: 'noPan' },
                  { actions: 'setPanOnDragTrue' },
                ],
              },
            },
            noPan: {
              entry: 'setPanOnDragFalse',
              on: {
                SET_TOOL: [{ cond: 'isPanTool', target: 'pan' }, { actions: 'setPanOnDragFalse' }],
                // Set POD=False when switching from other tab
                ENTER_TAB: { actions: 'setPanOnDragFalse' },
              },
            },
          },
        },
      },
      on: {
        EXIT: { actions: ['forwardToTool', send({ type: 'SET_TOOL', tool: 'select' })] },
        // from canvas event bus (forwarded from parent)
        mousedown: { actions: 'forwardToTool' },
        mouseup: { actions: 'forwardToTool' },
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
        setPanOnDragTrue: sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: true }),
        setPanOnDragFalse: sendParent({ type: 'SET_PAN_ON_DRAG', panOnDrag: false }),
        save: respond((ctx) => ({ type: 'RESTORE', tool: ctx.tool })),
        restore: assign({ tool: (_, evt) => evt.tool }),
        spawnTools: assign({
          tools: (ctx) => ({
            select: spawn(createSelectMachine(ctx)),
            brush: spawn(createBrushMachine(ctx)),
            threshold: spawn(createThresholdMachine(ctx)),
            trim: spawn(createTrimMachine(ctx)),
            flood: spawn(createFloodMachine(ctx)),
            watershed: spawn(createWatershedMachine(ctx)),
          }),
        }),
        forwardToTool: forwardTo((ctx) => ctx.tools[ctx.tool]),
        erode: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'erode',
            args: { cell: ctx.selected },
          }),
          { to: 'arrays' }
        ),
        dilate: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'dilate',
            args: { cell: ctx.selected },
          }),
          { to: 'arrays' }
        ),
        autofit: send(
          (ctx) => ({
            type: 'EDIT',
            action: 'active_contour',
            args: { cell: ctx.selected },
          }),
          { to: 'arrays' }
        ),
      },
    }
  );

export default createEditSegmentMachine;
