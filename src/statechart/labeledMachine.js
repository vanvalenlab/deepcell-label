import { Machine, assign, forwardTo, spawn, actions } from 'xstate';
import createFeatureMachine from './featureMachine';

const { pure } = actions;

const labeledMachine = Machine(
  {
    id: 'labeled',
    context: {
      projectId: null,
      frame: null,
      feature: null,
      numFrames: null,
      numFeatures: null,
      featureActor: null,
      features: {},
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
      SETFEATURE: { actions: 'changeFeature', target: '' },
      SETFRAME: { actions: 'forwardToAllFeatures' },
      TOGGLEHIGHLIGHT: { actions: 'forwardToFeature' },
      TOGGLESHOWNOLABEL: { actions: 'forwardToFeature' },
      SETOPACITY: { actions: 'forwardToFeature' },
      RESTORE: {},
    },
    initial: 'idle',
    states: {
      idle: {},
    }
  },
  {
    actions: {
      forwardToFeature: (context) => forwardTo(context.featureActor),
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

export default labeledMachine;
