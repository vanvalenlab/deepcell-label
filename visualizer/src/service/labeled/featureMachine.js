import colormap from 'colormap';
import { assign, Machine, sendParent } from 'xstate';
import { pure } from 'xstate/lib/actions';

function fetchSemanticLabels(context) {
  const { projectId, feature } = context;
  const pathToSemanticLabels = `/api/semantic-labels/${projectId}/${feature}`;
  return fetch(pathToSemanticLabels).then(res => res.json());
}

function fetchColors(context) {
  const { projectId, feature } = context;
  const pathToColors = `/api/colormap/${projectId}/${feature}`;
  return fetch(pathToColors).then(res => res.json());
}

// const reloadFrameState = {
//   entry: 'clearChangedFrames',
//   initial: 'checkReload',
//   states: {
//     checkReload: {
//       always: [{ cond: 'frameChanged', target: 'reloading' }, 'reloaded'],
//     },
//     reloading: {
//       entry: assign({ loadingFrame: ({ frame }) => frame }),
//       invoke: {
//         src: fetchLabeledFrame,
//         onDone: { target: 'reloaded', actions: 'saveFrame' },
//         onError: {
//           target: 'reloaded',
//           actions: (context, event) => console.log(event),
//         },
//       },
//     },
//     reloaded: {
//       type: 'final',
//     },
//   },
// };

// const reloadLabelsState = {
//   entry: assign({ reloadLabels: (_, { data: { labels } }) => labels }),
//   initial: 'checkReload',
//   states: {
//     checkReload: {
//       always: [{ cond: ({ reloadLabels }) => reloadLabels, target: 'reloading' }, 'reloaded'],
//     },
//     reloading: {
//       invoke: {
//         src: fetchSemanticLabels,
//         onDone: { target: 'reloaded', actions: 'saveLabels' },
//         onError: 'reloaded',
//       },
//     },
//     reloaded: {
//       type: 'final',
//     },
//   },
// };

// const reloadColorsState = {
//   entry: assign({ reloadColors: (_, { data: { labels } }) => labels }),
//   initial: 'checkReload',
//   states: {
//     checkReload: {
//       always: [{ cond: ({ reloadColors }) => reloadColors, target: 'reloading' }, 'reloaded'],
//     },
//     reloading: {
//       invoke: {
//         src: fetchColors,
//         onDone: { target: 'reloaded', actions: 'saveColors' },
//         onError: 'reloaded',
//       },
//     },
//     reloaded: {
//       type: 'final',
//     },
//   },
// };

// const reloadState = {
//   type: 'parallel',
//   states: {
//     frame: reloadFrameState,
//     labels: reloadLabelsState,
//     colors: reloadColorsState,
//   },
//   onDone: {
//     target: 'idle',
//     actions: send(({ frame }) => ({ type: 'FRAME', frame })),
//   },
// };

// const loadState = {
//   initial: 'checkLoaded',
//   invoke: {
//     src: fetchSemanticLabels,
//     onDone: { actions: 'saveLabels' },
//   },
//   states: {
//     checkLoaded: {
//       always: [{ cond: 'loadedFrame', target: 'frameLoaded' }, { target: 'loadingFrame' }],
//     },
//     loadingFrame: {
//       invoke: {
//         src: fetchLabeledFrame,
//         onDone: { target: 'frameLoaded', actions: 'saveFrame' },
//         onError: {
//           target: 'frameLoaded',
//           actions: (context, event) => console.log(event),
//         },
//       },
//     },
//     frameLoaded: {
//       always: { cond: 'loadedLabels', target: 'loaded' },
//     },
//     loaded: {
//       entry: 'sendLabeledLoaded',
//       type: 'final',
//     },
//   },
//   onDone: 'idle',
// };

let colors = colormap({
  colormap: 'jet',
  nshades: 10,
  format: 'hex',
  alpha: 1,
});

const createFeatureMachine = (feature, frames, semanticLabels) =>
  Machine(
    {
      id: `labeled_feature${feature}`,
      context: {
        frames,
        colors: colormap({
          colormap: 'viridis',
          // nshades: Math.max(semanticLabels.keys()),
          format: 'hex',
        }),
        labels: null,
        // maxLabel
      },
      on: {
        // FEATURE: { actions: ['useFrame', 'sendLabelData'], },
        EDITED: {
          actions: assign({
            newFrames: (_, { data: { frames } }) => frames,
            reloadLabels: (_, { data: { labels } }) => labels,
          }),
        },
      },
    },
    {
      guards: {
        loadedLabels: ({ labels }) => labels !== null,
        loadedFrame: ({ loadingFrame, frames }) => loadingFrame in frames,
        frameChanged: ({ frame, newFrames }) => newFrames.includes(frame),
      },
      actions: {
        // clearChangedFrames: assign((context, event) => {
        //   const newFrames = event.data.frames;
        //   const inNew = ([key, value]) => newFrames.includes(Number(key));
        //   const notInNew = ([key, value]) => !newFrames.includes(Number(key));
        //   const frames = Object.entries(context.frames);
        //   const arrays = Object.entries(context.arrays);
        //   const filteredFrames = frames.filter(notInNew);
        //   const filteredArrays = arrays.filter(notInNew);
        //   for (const [frame, image] of frames.filter(inNew)) {
        //     URL.revokeObjectURL(image.src);
        //   }
        //   return {
        //     frames: Object.fromEntries(filteredFrames),
        //     arrays: Object.fromEntries(filteredArrays),
        //   };
        // }),
        // sendLabeledLoaded: sendParent(({ loadingFrame, feature }) => ({
        //   type: 'LABELED_LOADED',
        //   frame: loadingFrame,
        //   feature,
        // })),
        setFrame: assign({ frame: (_, { frame }) => frame }),
        sendLabelData: pure(({ labeledArray, labels }) => {
          return [
            sendParent({ type: 'LABELED_ARRAY', labeledArray }),
            sendParent({ type: 'LABELS', labels }),
          ];
        }),
        useFrame: assign(({ frames, arrays }, { frame }) => ({
          frame,
          labeledImage: frames[frame],
          labeledArray: arrays[frame],
        })),
        saveFrame: assign(({ frames, arrays, loadingFrame }, { data: [image, array] }) => ({
          frames: { ...frames, [loadingFrame]: image },
          arrays: { ...arrays, [loadingFrame]: array },
        })),
        saveLabels: assign({ labels: (_, event) => event.data }),
        saveColors: assign({ colors: (_, event) => event.data.colors }),
        loadNextFrame: assign({
          loadingFrame: ({ numFrames, frame, frames }) => {
            const allFrames = [...Array(numFrames).keys()];
            return (
              allFrames
                // remove loaded frames
                .filter(frame => !(frame in frames))
                // load the closest unloaded frame to the current frame
                .reduce((prev, curr) =>
                  Math.abs(curr - frame) < Math.abs(prev - frame) ? curr : prev
                )
            );
          },
        }),
      },
    }
  );

export default createFeatureMachine;
