import { Machine, assign, forwardTo, send, spawn, actions, sendParent } from 'xstate';
import createFeatureMachine from './featureMachine';

const { pure } = actions;

const createLabeledMachine = ({ projectId }) => Machine(
  {
    id: 'labeled',
    context: {
      projectId,
      frame: 0,
      feature: 0,
      featureActor: null,
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
      // CANVASREF: { actions: assign({ canvasRef: (context, event) => event.canvasRef }) },
      TOOLREF: { actions: assign({ toolRef: (context, event) => event.toolRef }) },
      RAWREF: { actions: assign({ rawRef: (context, event) => event.rawRef }) },
      LABELEDARRAY: { actions: forwardTo((context) => context.toolRef) },
    },
    initial: 'loading',
    states: {
      idle: {
        on: {
          SETFRAME: { target: 'loading', actions: 'forwardToAllFeatures' },
          SETFEATURE: { actions: ['changeFeature', 'sendLabeledArray'] },
        },
      },
      loading: {
        on: {
          LABELEDFRAME: { target: 'loaded', cond: 'currentFeature', actions: 'forwardToRaw' },
        }
      },
      loaded: {
        on: {
          RAWFRAME: { target: 'idle', actions: 'sendFrame' },
          FRAME: { actions: 'forwardFrame', target: 'idle' },
        },
      },
    }
  },
  {
    guards: {
      currentFeature: (context, event, { _event }) => context.featureActor.sessionId === _event.origin,
    },
    actions: {
      sendFrame: pure((context, event) => {
        const frameEvent = { type: 'FRAME', frame: event.frame };
        return [
          sendParent(frameEvent),
          send(frameEvent, { to: context.featureActor }),
          send(frameEvent, { to: context.rawRef }),
        ];
      }),
      forwardFrame: pure((context, event) => {
        return [
          sendParent(event),
          forwardTo(context.featureActor),
        ];
      }),
      spawnFeatureActor: assign((context) => {
        let featureActor = context.features[context.feature];
        if (featureActor) {
          return { ...context, featureActor };
        }
        featureActor = spawn(createFeatureMachine(context));
        return {
          features: {
            ...context.features, 
            [context.feature]: featureActor,
          },
          featureActor: featureActor,
        }
      }),
      sendFrameToParent: sendParent((context, event) => ({ type: 'FRAME', frame: event.frame })),
      sendFrameToFeature: send(
        (context, event) => ({ type: 'FRAME', frame: event.frame }),
        { to: context => context.featureActor }
      ),
      sendLabeledArray: send('SENDLABELEDARRAY', { to: (context) => context.featureActor }),
      forwardToFeature: (context) => forwardTo(context.featureActor),
      forwardToRaw: forwardTo((context) => context.rawRef),
      // Dynamically send an event to every spawned feature
      forwardToAllFeatures: pure((context) => {
        const features = Object.values(context.features);
        return features.map((feature) => {
          return forwardTo(feature);
        });
      }),
      changeFeature: assign((context, event) => {
        // Use the existing feature actor if one already exists
        let featureActor = context.features[event.feature];
        if (featureActor) {
          return {
            ...context,
            featureActor,
            feature: event.feature,
          };
        }

        // Otherwise, spawn a new feature actor and save it in the features object
        featureActor = spawn(createFeatureMachine({ ...context, feature: event.feature }));
        return {
          features: {
            ...context.features,
            [event.feature]: featureActor
          },
          featureActor,
          feature: event.feature,
        };
      })
    }
  }
);

export default createLabeledMachine;
