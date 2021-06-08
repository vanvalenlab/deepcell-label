import { Machine, assign, sendParent, actions, spawn, send, forwardTo } from 'xstate';
import { bind, unbind } from 'mousetrap';
import { toolActions, toolGuards } from './tools/toolUtils';
import createSelectMachine from './tools/selectMachine';
import createBrushMachine from './tools/brushMachine';
import createThresholdMachine from './tools/thresholdMachine';
import createAutofitMachine from './tools/autofitMachine';
import createErodeDilateMachine from './tools/erodeDilateMachine';
import createTrimMachine from './tools/trimMachine';
import createFloodMachine from './tools/floodMachine';
import createWatershedMachine from './tools/watershedMachine';
import createDeleteMachine from './tools/deleteMachine';

const { pure, respond } = actions;

// TODO: move to config file?
const colorTools = ['brush', 'select', 'erodeDilate', 'trim', 'flood', 'delete'];
const grayscaleTools = ['brush', 'select', 'erodeDilate', 'trim', 'flood', 'delete',
                        'autofit', 'watershed', 'threshold'];

const createToolMachineLookup = {
  brush: createBrushMachine,
  select: createSelectMachine,
  threshold: createThresholdMachine,
  autofit: createAutofitMachine,
  erodeDilate: createErodeDilateMachine,
  trim: createTrimMachine,
  flood: createFloodMachine,
  watershed: createWatershedMachine,
  delete: createDeleteMachine,
};

const createToolMachine = (context) => {
  const { tool } = context;
  return spawn(createToolMachineLookup[tool](context), 'tool');
};

const selectActions = {
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
  swap: pure(({ foreground, background }) => {
    return [
      send({ type: 'FOREGROUND', foreground: background }),
      send({ type: 'BACKGROUND', background: foreground }),
    ];
  }),
  newForeground: send(({ maxLabel }) => ({ type: 'FOREGROUND', foreground: maxLabel + 1 })),
  resetBackground: send({ type: 'BACKGROUND', background: 0 }),
  // bind('esc', () => send({ type: 'FOREGROUND', { background: 0 }));
  prevForeground: send(
    ({ foreground: fg, maxLabel: max }) => 
    ({ type: 'FOREGROUND', foreground: fg <= 1 ? max : fg - 1 })
  ),
  nextForeground: send(
    ({ foreground: fg, maxLabel: max }) => 
    ({ type: 'FOREGROUND', foreground: fg >= max ? 1 : fg + 1 })
  ),
  prevBackground: send(
    ({ background: bg, maxLabel: max }) => 
    ({ type: 'BACKGROUND', background: bg <= 1 ? max : bg - 1 })
  ),
  nextBackground: send(
    ({ background: bg, maxLabel: max }) => 
    ({ type: 'BACKGROUND', background: bg >= max ? 1 : bg + 1 })
  ),
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
    invoke: [
      { src: 'listenForToolHotkeys' },
      { src: 'listenForSelectHotkeys' },
    ],
    initial: 'color',
    states: {
      color: {
        on: {
          GRAYSCALE: 'grayscale',
          USE_TOOL: { cond: 'colorTool', actions: ['useTool', 'spawnTool', sendParent((c, e) => e)] },
        }
      },
      grayscale: {
        on: {
          USE_TOOL: { cond: 'grayscaleTool', actions: ['useTool', 'spawnTool', sendParent((c, e) => e)] },
          COLOR: [
            { target: 'color', cond: 'colorTool' },
            { target: 'color', actions: send({ type: 'USE_TOOL', tool: 'select' }) },
          ],
        }
      },
    },
    on: {
      // context not shared with tools
      FRAME: { actions: 'setFrame' },
      CHANNEL: { actions: 'setChannel' },
      FEATURE: { actions: 'setFeature' },
      LABELEDARRAY: { actions: ['setLabeledArray', 'sendLabel'] },
      LABELS: { actions: 'setMaxLabel' },

      // context to sync with tools
      COORDINATES: { actions: ['setCoordinates', 'sendLabel', 'forwardToTool'] },
      LABEL: { actions: ['setLabel', 'forwardToTool'] },
      FOREGROUND: { actions: ['setForeground', 'forwardToTool'] },
      BACKGROUND: { actions: ['setBackground', 'forwardToTool'], },

      SELECTFOREGROUND: { actions: 'selectForeground' },
      SELECTBACKGROUND: { actions: 'selectBackground' },
      SWAP: { actions: 'swap' },
      NEW_FOREGROUND: { actions: 'newForeground' },
      RESET_BACKGROUND: { actions: 'resetBackground' },
      PREV_FOREGROUND: { actions: 'prevForeground' },
      NEXT_FOREGROUND: { actions: 'nextForeground' },
      PREV_BACKGROUND: { actions: 'prevBackground' },
      NEXT_BACKGROUND: { actions: 'nextBackground' },

      // special shift click event 
      SHIFTCLICK: [
        { cond: 'doubleClick', actions: ['selectForeground', send({ type: 'BACKGROUND', background: 0 })] },
        { cond: 'onBackground', actions: 'selectForeground' },
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
      listenForSelectHotkeys: () => (send) => {
        bind('x', () => send('SWAP'));
        bind('n', () => send('NEW_FOREGROUND'));
        bind('esc', () => send('RESET_BACKGROUND'));
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
        }
      },
      listenForToolHotkeys: () => (send) => {
        const lookup = {
          b: 'brush',
          v: 'select',
          t: 'threshold',
          k: 'trim',
          g: 'flood',
          q: 'erodeDilate',
          m: 'autofit',
          w: 'watershed',
          Backspace: 'delete',
        };

        const listener = (e) => {
          if (e.key in lookup) {
            send({ type: 'USE_TOOL', tool: lookup[e.key] });
          }
        };

        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
      },
      
    },
    guards: {
      ...toolGuards,
      usingColorTool: ({ tool }) => colorTools.includes(tool),
      colorTool: (_, { tool }) => colorTools.includes(tool),
      grayscaleTool: (_, { tool }) => grayscaleTools.includes(tool),
      sameContext: (context, event) => 
        context.tool === event.tool 
        && context.foreground === event.foreground 
        && context.background === event.background,
    },
    actions: {
      ...toolActions,
      ...selectActions,
      save: respond(({ tool, foreground, background }) => 
        ({ type: 'RESTORE', tool, foreground, background })
      ),
      restore: assign((_, { tool, foreground, background }) => ({ tool, foreground, background })),
      useTool: assign({ tool: (_, { tool }) => tool }),
      spawnTool: assign({
        toolActor: createToolMachine,
      }),
      sendLabel: send(({ labeledArray: array, x, y}) => 
        ({ type: 'LABEL', label: array ? Math.abs(array[y][x]) : 0 })
      ),
      changeGrayscaleTools: assign({
        tool: ({ tool }) => grayscaleTools.includes(tool) ? 'select' : tool
      }),
      sendEditWithExtraArgs: sendParent(
        ({ frame, feature, channel }, e) => 
        ({...e, args: {...e.args, frame, feature, channel }})
      ),
      forwardToTool: forwardTo(({ toolActor }) => toolActor),
      setMaxLabel: assign({
        maxLabel: (_, { labels }) => Math.max(...Object.keys(labels).map(Number)),
      }),
    }
  }
);

export default toolMachine;