import { Machine, assign, sendParent, actions, spawn, send, forwardTo } from 'xstate';
import selectMachine from './tools/selectMachine';
import brushMachine from './tools/brushMachine';
import thresholdMachine from './tools/thresholdMachine';
import autofitMachine from './tools/autofitMachine';
import { toolActions, toolGuards } from './tools/toolUtils';
import { respond } from 'xstate/lib/actions';
// select: selectState,
// brush: brushState,
// flood: floodState,
// trim: trimState,
// erodeDilate: erodeDilateState,
// autofit: autofitState,
// threshold: thresholdState,
// watershed: watershedState,

const { pure } = actions;

// TODO: move to config file?
const grayscaleTools = ['autofit', 'watershed', 'threshold'];

const toolMachineLookup = {
  brush: brushMachine,
  select: selectMachine,
  threshold: thresholdMachine,
  autofit: autofitMachine,
};

const toolMachine = Machine(
  {
    id: 'tool',
    context: {
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
    invoke: {
      src: 'listenForToolHotkeys',
    },
    initial: 'color',
    states: {
      color: {
        on: {
          GRAYSCALE: 'grayscale'
        }
      },
      grayscale: {
        on: {
          USE_AUTOFIT: { actions: assign({ tool: 'autofit' }) },
          // USE_WATERSHED: { actions: assign({ tool: 'watershed' }) },
          USE_THRESHOLD: { actions: assign({ tool: 'threshold' }) },
          COLOR: [
            { target: 'color', cond: 'grayscaleTool', actions: assign({ tool: 'select' }) },
            { target: 'color' },
          ],
        }
      },
    },
    on: {
      // switch tool
      USE_BRUSH: { actions: [assign({ tool: 'brush' }), 'spawnTool'] },
      USE_SELECT:  { actions: [assign({ tool: 'select' }), 'spawnTool'] },
      // USE_FLOOD: { actions: [assign({ tool: 'flood' }), 'spawnTool'] },
      // USE_TRIM: { actions: [assign({ tool: 'trim' }), 'spawnTool'] },
      // USE_ERODE_DILATE: { [actions: assign({ tool: 'erodeDilate' }), 'spawnTool'] },
      
      // context not shared with tools
      FRAME: { actions: 'setFrame' },
      CHANNEL: { actions: 'setChannel' },
      FEATURE: { actions: 'setFeature' },
      LABELEDARRAY: { actions: ['setLabeledArray', 'sendLabel'] },

      // context to sync with tools
      COORDINATES: { actions: ['setCoordinates', 'sendLabel', 'forwardToTool'] },
      LABEL: { actions: ['setLabel', 'forwardToTool'] },
      FOREGROUND: { actions: ['setForeground', 'forwardToTool'] },
      BACKGROUND: { actions: ['setBackground', 'forwardToTool'], },

      SELECTFOREGROUND: { actions: 'selectForeground' },
      SELECTBACKGROUND: { actions: 'selectBackground' },

      // special shift click event 
      SHIFTCLICK: [
        { cond: 'doubleClick', actions: ['selectForeground', send({ type: 'BACKGROUND', background: 0 })] },
        { cond: 'onBackground', actions: 'selectForeground', },
        { actions: 'selectBackground' },
      ],
      ///
      EDIT: { actions: 'sendEditWithExtraArgs' },

      // undo/redo actions
      SAVE: { actions: 'save' },
      RESTORE: [
        { cond: 'sameContext', actions: respond('SAMECONTEXT') },
        { actions: ['restore', 'spawnTool', respond('RESTORED')] }
      ],
    }
  },
  {
    services: {
      listenForToolHotkeys: () => (send) => {
        const lookup = {
          b: 'USE_BRUSH',
          v: 'USE_SELECT',
          t: 'USE_THRESHOLD',
          k: 'USE_TRIM',
          g: 'USE_FLOOD',
          q: 'USE_ERODE_DILATE',
          m: 'USE_AUTOFIT',
          w: 'USE_WATERSHED',
        };

        const listener = (e) => {
          if (e.key in lookup) {
            send(lookup[e.key]);
          }
        };

        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
      
    },
    guards: {
      ...toolGuards,
      grayscaleTool: ({ tool }) => grayscaleTools.includes(tool),
      sameContext: (context, event) => 
        context.tool === event.tool 
        && context.foreground === event.foreground 
        && context.background === event.background,
    },
    actions: {
      ...toolActions,
      save: respond(({ tool, foreground, background }) => 
        ({ type: 'RESTORE', tool, foreground, background })
      ),
      restore: assign((_, { tool, foreground, background }) => ({ tool, foreground, background })),
      spawnTool: assign({
        toolActor: ({ tool }) => spawn(toolMachineLookup[tool], 'tool'),
      }),
      sendLabel: send(({ labeledArray: array, x, y}) => 
        ({ type: 'LABEL', label: array ? Math.abs(array[y][x]) : 0 })
      ),
      selectForeground: pure(({ label, foreground, background }) => {
        return [
          send({ type: 'FOREGROUND', foreground: label }),
          send({ type: 'BACKGROUND', background: label === background ? foreground : background }),
        ];
      }),
      selectBackground: pure(({ label, foreground, background }) => {
        return [
          send({ type: 'BACKGROUND', background: label }),
          send({ type: 'FOREGROUND', foreground: label === foreground ? background : foreground }),
        ];
      }),
      changeGrayscaleTools: assign({
        tool: ({ tool }) => grayscaleTools.includes(tool) ? 'select' : tool
      }),
      sendEditWithExtraArgs: sendParent(
        ({ frame, feature, channel }, e) => 
        ({...e, args: {...e.args, frame, feature, channel }})
      ),
      forwardToTool: forwardTo(({ toolActor }) => toolActor),
    }
  }
);

export default toolMachine;