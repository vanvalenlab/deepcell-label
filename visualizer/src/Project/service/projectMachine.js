/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import createCanvasMachine from './canvasMachine';
import createToolMachine from './edit/editMachine';
import { EventBus, fromEventBus } from './eventBus';
import createExportMachine from './exportMachine';
import createHoveringMachine from './hoveringMachine';
import createIDBMachine from './idbMachine';
import createImageMachine from './imageMachine';
import createArraysMachine from './labels/arraysMachine';
import createCellsMachine from './labels/cellsMachine';
import createLineageMachine from './labels/lineageMachine';
import createSpotsMachine from './labels/spotsMachine';
import createLoadMachine from './loadMachine';
import createSelectMachine from './selectMachine';
import createUndoMachine from './undo';

const createProjectMachine = (projectId) =>
  Machine(
    {
      id: `${projectId}`,
      context: {
        projectId,
        eventBuses: {
          undo: new EventBus('undo'), // receives START_EDIT and responds with SAVE with edit ID // TODO: remove
          load: new EventBus('load'), // LOADED
          // UI state
          canvas: new EventBus('canvas'), // COORDINATES, mouseup, mousedown
          hovering: new EventBus('hovering'), // HOVERING
          image: new EventBus('image'), // FRAME (and FEATURE and CHANNEL?)
          labeled: new EventBus('labeled'), // FEATURE (?)
          raw: new EventBus('raw'), // CHANNEL (?)
          select: new EventBus('select'), // SELECTED // also receives GET_SELECTED and responds with SELECTED
          // EDIT events and label changes
          // TODO: rename to segment and separate raw arrays
          arrays: new EventBus('arrays'), // also receives GET_ARRAYS and responds with ARRAYS
          cells: new EventBus('cells'),
        },
        track: false,
      },
      invoke: {
        id: 'loadEventBus',
        src: 'loadEventBus',
      },
      initial: 'spawnUndo',
      states: {
        spawnUndo: {
          entry: 'spawnUndo',
          always: 'spawnActors',
        },
        spawnActors: {
          entry: 'spawnActors',
          always: 'loadFromDB',
        },
        loadFromDB: {
          on: {
            PROJECT_NOT_IN_DB: 'loadFromServer',
            LOADED: {
              target: 'idle',
              actions: [forwardTo('loadEventBus'), 'sendDimensions'],
            },
          },
        },
        loadFromServer: {
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
        loadEventBus: fromEventBus('project', (ctx) => ctx.eventBuses.load),
      },
      actions: {
        spawnUndo: assign({ undoRef: (ctx) => spawn(createUndoMachine(ctx), 'undo') }),
        spawnActors: assign((ctx) => {
          const actors = {};
          actors.idbRef = spawn(createIDBMachine(ctx), 'idb');
          actors.canvasRef = spawn(createCanvasMachine(ctx), 'canvas');
          actors.hoveringRef = spawn(createHoveringMachine(ctx), 'hovering');
          actors.imageRef = spawn(createImageMachine(ctx), 'image');
          actors.arraysRef = spawn(createArraysMachine(ctx), 'arrays');
          actors.exportRef = spawn(createExportMachine(ctx), 'export');
          actors.selectRef = spawn(createSelectMachine(ctx), 'select');
          actors.lineageRef = spawn(createLineageMachine(ctx), 'lineage');
          actors.cellsRef = spawn(createCellsMachine(ctx), 'cells');
          actors.toolRef = spawn(createToolMachine(ctx), 'tool');
          if (process.env.REACT_APP_SPOTS_VISUALIZER === 'true') {
            actors.spotsRef = spawn(createSpotsMachine(ctx), 'spots');
          }
          return actors;
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
        // TODO: dynamically add track labels and show UI
        setTrack: assign({
          track: (ctx, evt) => evt.lineage !== null && evt.lineage !== undefined,
        }),
      },
    }
  );

export default createProjectMachine;
