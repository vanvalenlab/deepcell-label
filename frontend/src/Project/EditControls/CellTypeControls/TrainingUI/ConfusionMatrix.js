import { useSelector } from '@xstate/react';
import Plot from 'react-plotly.js';
import { useTraining } from '../../../ProjectContext';

function ConfusionMatrix({ confusionMatrix }) {
  const training = useTraining();
  const cellTypes = useSelector(training, (state) => state.context.cellTypes);
  const feature = useSelector(training, (state) => state.context.feature);
  const getCellTypeNames = (cellTypes, feature) => {
    const currCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);
    const ids = currCellTypes.map((cellType) => cellType.id);
    const names = currCellTypes.map((cellType) => cellType.name);
    return { ids, names };
  };
  const { ids, names } = getCellTypeNames(cellTypes, feature);
  const filteredConfusionMatrix = confusionMatrix
    .map((row) => row.filter((_, i) => ids.includes(i + 1)))
    .filter((_, i) => ids.includes(i + 1));

  let annotations = [];
  for (let i = 0; i < filteredConfusionMatrix.length; i++) {
    for (let j = 0; j < filteredConfusionMatrix[0].length; j++) {
      const value = filteredConfusionMatrix[i][j];
      const result = {
        xref: 'x1',
        yref: 'y1',
        x: names[j],
        y: names[i],
        text: isNaN(value) || value === 0 ? '' : Math.round((value + Number.EPSILON) * 100) / 100,
        font: {
          family: 'Arial',
          size: 10,
          color: value > 0.5 ? 'white' : 'black',
        },
        showarrow: false,
      };
      annotations.push(result);
    }
  }
  const colorscaleValue = [
    [0, 'rgba(250, 250, 255, 1)'],
    [1, 'rgba(0, 130, 230, 1)'],
  ];

  const width = window.innerWidth * 0.4;
  const height = window.innerHeight * 0.55;

  return (
    <Plot
      data={[
        {
          x: names,
          y: names,
          z: filteredConfusionMatrix,
          type: 'heatmap',
          colorscale: colorscaleValue,
        },
      ]}
      layout={{
        annotations: annotations,
        width: width,
        height: height,
        margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
        xaxis: { automargin: true, title: 'Predicted' },
        yaxis: { automargin: true, title: 'Actual', autorange: 'reversed' },
        hovermode: false,
      }}
      config={{
        // staticPlot: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d'],
        toImageButtonOptions: {
          format: 'svg',
        },
      }}
    />
  );
}

export default ConfusionMatrix;
