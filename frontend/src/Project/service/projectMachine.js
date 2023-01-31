/**
 * Root statechart for a project in DeepCell Label.
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
import createCellTypesMachine from './labels/cellTypesMachine';
import createChannelExpressionMachine from './labels/channelExpressionMachine';
import createDivisionsMachine from './labels/divisionsMachine';
import createSpotsMachine from './labels/spotsMachine';
import createTrainingMachine from './labels/trainingMachine';
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
          image: new EventBus('image'), // SET_T
          labeled: new EventBus('labeled'), // SET_FEATURE
          raw: new EventBus('raw'), // SET_CHANNEL
          cellTypes: new EventBus('cellTypes'), // CELLTYPES
          select: new EventBus('select'), // SELECTED, receives GET_SELECTED and responds with SELECTED
          // EDIT events and label changes
          // TODO: rename to segment and separate raw arrays
          arrays: new EventBus('arrays'), // also receives GET_ARRAYS and responds with ARRAYS
          cells: new EventBus('cells'),
          channelExpression: new EventBus('channelExpression'),
          training: new EventBus('training'),
          divisions: new EventBus('divisions'),
          spots: new EventBus('spots'),
        },
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
            FORCE_LOAD_PROJECT_FROM_OUTPUT: 'loadFromServer',
            LOADED: {
              target: 'idle',
              actions: [forwardTo('loadEventBus'), 'sendDimensions'],
            },
          },
        },
        loadFromServer: {
          invoke: { src: 'loadMachine' },
          on: {
            LOADED: {
              target: 'idle',
              actions: [forwardTo('loadEventBus'), 'sendDimensions'],
            },
            PROJECT_NOT_IN_OUTPUT_BUCKET: 'missingProject',
          },
        },
        missingProject: {},
        idle: {},
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
          actors.cellTypesRef = spawn(createCellTypesMachine(ctx), 'cellTypes');
          actors.exportRef = spawn(createExportMachine(ctx), 'export');
          actors.selectRef = spawn(createSelectMachine(ctx), 'select');
          actors.divisionsRef = spawn(createDivisionsMachine(ctx), 'divisions');
          actors.cellsRef = spawn(createCellsMachine(ctx), 'cells');
          actors.channelExpressionRef = spawn(
            createChannelExpressionMachine(ctx),
            'channelExpression'
          );
          actors.toolRef = spawn(createToolMachine(ctx), 'tool');
          actors.trainingRef = spawn(createTrainingMachine(ctx), 'training');
          actors.spotsRef = spawn(createSpotsMachine(ctx), 'spots');
          return actors;
        }),
        sendDimensions: send(
          (c, e) => {
            const { raw, labeled } = e;
            return {
              type: 'DIMENSIONS',
              numChannels: raw.length,
              numFeatures: labeled.length,
              duration: raw[0].length,
              height: raw[0][0].length,
              width: raw[0][0][0].length,
            };
          },
          { to: 'loadEventBus' }
        ),
      },
    }
  );

export default createProjectMachine;
