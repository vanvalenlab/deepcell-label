import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import Plot from 'react-plotly.js';
import { useTraining } from '../../../ProjectContext';
import { hexToRgb } from '../../../service/labels/cellTypesMachine';

function DistributionHistogram({ trainCounts }) {
  const training = useTraining();
  const valCounts = useSelector(training, (state) => state.context.valCounts);
  const cellTypes = useSelector(training, (state) => state.context.cellTypes);
  const feature = useSelector(training, (state) => state.context.feature);
  const getCellTypeNames = (cellTypes, feature) => {
    const currCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);
    const names = currCellTypes.map((cellType) => cellType.name);
    const colors = currCellTypes.map((cellType) => cellType.color);
    return { colors, names };
  };
  const { colors, names } = getCellTypeNames(cellTypes, feature);
  const lightenColor = (color) => {
    const rgb = hexToRgb(color);
    const background = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.5)`;
    return background;
  };
  const lightenedColors = colors.map((color) => lightenColor(color));

  const width = window.innerWidth * 0.4;
  const height = window.innerHeight * 0.55;

  return (
    <Grid item>
      <Plot
        data={[
          {
            x: names,
            y: Object.values(trainCounts),
            type: 'bar',
            name: 'Validation',
            marker: {
              color: lightenedColors,
              line: {
                color: colors,
                width: 1.5,
              },
            },
          },
        ]}
        layout={{
          width: width,
          height: height,
          margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
          xaxis: { automargin: true },
          yaxis: {
            automargin: true,
          },
          legend: {
            xanchor: 'right',
          },
        }}
        config={{
          displaylogo: false,
          modeBarButtonsToRemove: [
            'autoScale2d',
            'zoomIn2d',
            'zoomOut2d',
            'pan2d',
            'select2d',
            'lasso2d',
          ],
          toImageButtonOptions: {
            format: 'svg',
          },
        }}
      />
    </Grid>
  );
}

export default DistributionHistogram;
