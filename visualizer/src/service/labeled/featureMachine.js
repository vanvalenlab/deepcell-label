import colormap from 'colormap';
import { assign, Machine, sendParent } from 'xstate';
import { pure } from 'xstate/lib/actions';

function makeColormap(semanticLabels) {
  const maxLabel = Math.max(...Object.keys(semanticLabels));
  let colors = colormap({
    colormap: 'viridis',
    nshades: Math.max(9, maxLabel),
    format: 'rgba',
  });
  colors = colors.slice(0, maxLabel);
  // Label 0 is black
  colors.unshift([0, 0, 0, 1]);
  // New label (maxLabel + 1) is white
  colors.push([255, 255, 255, 1]);
  return colors;
}

const createFeatureMachine = (feature, frames, semanticLabels) =>
  Machine(
    {
      id: `labeled_feature${feature}`,
      context: {
        frames,
        semanticLabels,
        colors: colormap({
          colormap: 'viridis',
          nshades: Math.max(9, ...Object.keys(semanticLabels)),
          format: 'hex',
        }),
        colors2: makeColormap(semanticLabels),
      },
      on: {
        EDITED: {
          actions: assign({
            newFrames: (_, { data: { frames } }) => frames,
            reloadLabels: (_, { data: { labels } }) => labels,
          }),
        },
      },
    },
    {
      actions: {
        sendLabelData: pure(({ labeledArray, labels }) => {
          return [
            sendParent({ type: 'LABELED_ARRAY', labeledArray }),
            sendParent({ type: 'LABELS', labels }),
          ];
        }),
        saveLabels: assign({ labels: (_, event) => event.data }),
        saveColors: assign({ colors: (_, event) => event.data.colors }),
      },
    }
  );

export default createFeatureMachine;
