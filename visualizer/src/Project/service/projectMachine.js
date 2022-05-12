/**
 * Root statechart for DeepCell Label in XState.
 */
import { assign, forwardTo, Machine, send, spawn } from 'xstate';
import { pure } from 'xstate/lib/actions';
import createApiMachine from './apiMachine';
import createArraysMachine from './arraysMachine';
import createCanvasMachine from './canvasMachine';
import { EventBus, fromEventBus } from './eventBus';
import createImageMachine from './imageMachine';
import createLabelsMachine from './labelsMachine';
import createLineageMachine from './lineageMachine';
import createOverlapsMachine from './overlapsMachine';
import createSelectMachine from './selectMachine';
import createSpotsMachine from './spotsMachine';
import createToolMachine from './tools/toolMachine';
import createUndoMachine from './undoMachine';

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
          labels: new EventBus('labels'),
          load: new EventBus('load'),
          overlaps: new EventBus('overlaps'),
        },
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
            { cond: () => process.env.REACT_APP_SPOTS_VISUALIZER === 'true', target: 'idle' },
            { cond: () => process.env.REACT_APP_CALIBAN_VISUALIZER === 'true', target: 'idle' },
            { target: 'setUpUndo' },
          ],
        },
        setUpUndo: {
          entry: 'addActorsToUndo',
          always: 'idle',
        },
        idle: {
          on: {
            LOADED: {
              actions: [
                forwardTo('loadEventBus'),
                send(
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
              ],
            },
          },
        },
      },
    },
    {
      services: {
        loadEventBus: fromEventBus('project', (context) => context.eventBuses.load),
      },
      actions: {
        spawnActors: assign((context) => {
          const actors = {};
          actors.canvasRef = spawn(createCanvasMachine(context), 'canvas');
          actors.imageRef = spawn(createImageMachine(context), 'image');
          actors.arraysRef = spawn(createArraysMachine(context), 'arrays');
          actors.labelsRef = spawn(createLabelsMachine(context), 'labels');
          actors.apiRef = spawn(createApiMachine(context), 'api');
          actors.selectRef = spawn(createSelectMachine(context), 'select');
          actors.lineageRef = spawn(createLineageMachine(context), 'lineage');
          actors.overlapsRef = spawn(createOverlapsMachine(context), 'overlaps');
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
      },
    }
  );

export default createProjectMachine;
