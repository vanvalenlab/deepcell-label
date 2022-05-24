/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import createArraysMachine from './arraysMachine';
import createCanvasMachine from './canvasMachine';
import createCellsMachine from './cellsMachine';
import { EventBus, fromEventBus } from './eventBus';
import createIDBMachine from './idbMachine';
import createImageMachine from './imageMachine';
import createLineageMachine from './lineageMachine';
import createLoadMachine from './loadMachine';
import createSelectMachine from './selectMachine';
import createSpotsMachine from './spotsMachine';
import createToolMachine from './tools/toolMachine';
import createUndoMachine from './undo';

const createProjectMachine = (projectId) =>
  Machine(
    {
      id: `${projectId}`,
      context: {
        projectId,
        eventBuses: {
          canvas: new EventBus('canvas'),
          image: new EventBus('image'),
          labeled: new EventBus('labeled'),
          raw: new EventBus('raw'),
          select: new EventBus('select'),
          undo: new EventBus('undo'),
          api: new EventBus('api'),
          arrays: new EventBus('arrays'),
          load: new EventBus('load'),
          cells: new EventBus('cells'),
        },
        track: false,
      },
      initial: 'setUpActors',
      invoke: {
        id: 'loadEventBus',
        src: 'loadEventBus',
      },
      states: {
        setUpActors: {
          entry: 'spawnActors',
          always: [
            {
              cond: () => process.env.REACT_APP_SPOTS_VISUALIZER === 'true',
              target: 'loadProjectFromDB',
            },
            {
              cond: () => process.env.REACT_APP_CALIBAN_VISUALIZER === 'true',
              target: 'loadProjectFromDB',
            },
            { target: 'setUpUndo' },
          ],
        },
        setUpUndo: {
          entry: 'addActorsToUndo',
          always: 'loadProjectFromDB',
        },
        loadProjectFromDB: {
          on: {
            PROJECT_NOT_IN_DB: 'loadProjectFromServer',
            LOADED: { target: 'idle', actions: [forwardTo('loadEventBus'), 'sendDimensions'] },
          },
        },
        loadProjectFromServer: {
          invoke: { src: 'loadMachine' },
          on: {
            LOADED: { target: 'idle', actions: [forwardTo('loadEventBus'), 'sendDimensions'] },
          },
        },
        idle: {
          entry: 'setTrack',
        },
      },
    },
    {
      services: {
        loadMachine: (ctx) => createLoadMachine(ctx.projectId),
        loadEventBus: fromEventBus('project', (context) => context.eventBuses.load),
      },
      actions: {
        spawnActors: assign((context) => {
          const actors = {};
          actors.idbRef = spawn(createIDBMachine(context), 'idb');
          actors.canvasRef = spawn(createCanvasMachine(context), 'canvas');
          actors.imageRef = spawn(createImageMachine(context), 'image');
          actors.arraysRef = spawn(createArraysMachine(context), 'arrays');
          actors.apiRef = spawn(createApiMachine(context), 'api');
          actors.selectRef = spawn(createSelectMachine(context), 'select');
          actors.lineageRef = spawn(createLineageMachine(context), 'lineage');
          actors.cellsRef = spawn(createCellsMachine(context), 'cells');
          actors.toolRef = spawn(createToolMachine(context), 'tool');
          if (process.env.REACT_APP_SPOTS_VISUALIZER === 'true') {
            actors.spotsRef = spawn(createSpotsMachine(context), 'spots');
          } else {
            actors.undoRef = spawn(createUndoMachine(context), 'undo');
          }
          return actors;
        }),
        addActorsToUndo: pure((ctx) => {
          return [
            send({ type: 'ADD_ACTOR', actor: ctx.canvasRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: ctx.imageRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: ctx.toolRef }, { to: 'undo' }),
            send({ type: 'ADD_ACTOR', actor: ctx.selectRef }, { to: 'undo' }),
            send({ type: 'ADD_LABEL_ACTOR', actor: ctx.apiRef }, { to: 'undo' }),
          ];
        }),
        sendDimensions: send(
          (c, e) => {
            const { raw, labeled } = e;
            return {
              type: 'DIMENSIONS',
              numChannels: raw.length,
              numFeatures: labeled.length,
              numFrames: raw[0].length,
              height: raw[0][0].length,
              width: raw[0][0][0].length,
            };
          },
          { to: 'loadEventBus' }
        ),
        setTrack: assign({
          track: (ctx, evt) => evt.lineage !== null && evt.lineage !== undefined,
        }),
      },
    }
  );

export default createProjectMachine;
