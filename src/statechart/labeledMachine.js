import { Machine, assign, forwardTo, send, spawn, actions, sendParent } from 'xstate';
import createFeatureMachine from './featureMachine';

const { pure } = actions;

const createLabeledMachine = ({ projectId }) => Machine(
  {
    id: 'labeled',
    context: {
      projectId,
      frame: 0,
      nextFrame: 0,
      feature: 0,
      nextFeature: 0,
      featureActor: null,
      nextFeatureActor: null,
      features: {},
      canvasRef: null,
      rawRef: null,
    },
    entry: assign((context) => {
      const featureActor = spawn(createFeatureMachine(context));
      return {
        features: {
          [context.feature]: featureActor,
        },
        featureActor: featureActor,
      }
    }),
    on: {
      TOGGLEHIGHLIGHT: { actions: 'forwardToFeature' },
      TOGGLESHOWNOLABEL: { actions: 'forwardToFeature' },
      SETOPACITY: { actions: 'forwardToFeature' },
      RESTORE: {},
      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
      RAWREF: { actions: assign({ rawRef: (context, event) => event.rawRef }) },
      LABELEDARRAY: { actions: forwardTo((context) => context.toolRef) },
      LOADED: { actions: 'forwardToFeature' },
    },
    type: 'parallel',
    states: {
       frame: {
        initial: 'loading',
        states: {
          idle: {},
          loading: {
            entry: send(
              (context) => ({ type: 'SETFRAME', frame: context.nextFrame }),
              { to: (context) => context.featureActor }
            ),
            on: {
              FEATURE: { target: 'loading', internal: false },
              LABELEDLOADED: { target: 'loaded', cond: 'nextFrame', actions: 'forwardToRaw' },
            },
          },
          loaded: {
            on: {
              RAWLOADED: { actions: 'sendFrame' },
              FRAME: { actions: 'useFrame', target: 'idle' },
              FEATURE: { target: 'loading', internal: false },
            },
          },
        },
        on: {
          SETFRAME: { target: '.loading', actions: 'assignNextFrame', internal: false },
        }
      },
      feature: {
        initial: 'idle',
        states: {
          idle: {},
          loading: {
            entry: send(
              (context) => ({ type: 'SETFRAME', frame: context.frame }),
              { to: (context) => context.nextFeatureActor }
            ),
            on: {
              LABELEDLOADED: { cond: 'nextFeature', actions: 'sendFeature' },
              FEATURE: { target: 'idle', actions: 'useFeature' },
              FRAME: { target: 'loading', internal: false }
            }
          },
        },
        on: {
          SETFEATURE: { target: '.loading', actions: 'stageNextFeature', internal: false },
        }
      }
    },
  },
  {
    guards: {
      nextFrame: (context, event) => context.nextFrame === event.frame && context.feature === event.feature,
      nextFeature: (context, event) => context.frame === event.frame && context.nextFeature === event.feature,
    },
    actions: {
      assignNextFrame: assign({ nextFrame: (context, event) => event.frame }),
      sendFeature: pure((context, event) => {
        const featureEvent = { type: 'FEATURE', feature: event.feature, frame: event.frame };
        return [
          send(featureEvent),
          sendParent(featureEvent),
        ];
      }),
      useFeature: pure((context, event) => {
        return [
          forwardTo((context) => context.nextFeatureActor),
          assign({
            feature: (context) => context.nextFeature,
            featureActor: (context, event) => context.nextFeatureActor,
          }),
        ];
      }),
      sendFrame: pure((context, event) => {
        const frameEvent = { type: 'FRAME', frame: event.frame };
        return [
          send(frameEvent),
          send(frameEvent, { to: context.rawRef }),
          sendParent(frameEvent),
        ];
      }),
      useFrame: pure((context, event) => {
        return [
          forwardTo(context.featureActor),
          assign({ frame: (context, event) => event.frame }),
        ];
      }),
      forwardToRaw: forwardTo((context) => context.rawRef),
      forwardToFeature: forwardTo((context) => context.featureActor),
      stageNextFeature: assign((context, event) => {
        // Use the existing feature actor if one already exists
        let featureActor = context.features[event.feature];
        if (featureActor) {
          return {
            ...context,
            nextFeatureActor: featureActor,
            nextFeature: event.feature,
          };
        }
        // Otherwise, spawn a new feature actor and save it in the features object
        featureActor = spawn(createFeatureMachine({ ...context, feature: event.feature }));
        return {
          features: {
            ...context.features,
            [event.feature]: featureActor
          },
          nextFeature: event.feature,
          nextFeatureActor: featureActor,
        };
      }),
    }
  }
);

export default createLabeledMachine;
