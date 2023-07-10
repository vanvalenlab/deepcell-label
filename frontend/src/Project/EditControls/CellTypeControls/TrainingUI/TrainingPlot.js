import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import Plot from 'react-plotly.js';
import { useTraining } from '../../../ProjectContext';

function TrainingPlot() {
  const training = useTraining();
  const trainLogs = useSelector(training, (state) => state.context.trainLogs, equal);
  const valLogs = useSelector(training, (state) => state.context.valLogs, equal);
  const epochs = trainLogs.map((_, i) => i);

  const width = window.innerWidth * 0.4;
  const height = window.innerHeight * 0.55;

  return (
    <Grid item>
      <Plot
        data={[
          {
            x: epochs,
            y: valLogs,
            mode: 'lines',
            name: 'Validation',
            line: {
              color: 'rgba(0, 166, 255, 1)',
            },
          },
          {
            x: epochs,
            y: trainLogs,
            mode: 'lines',
            name: 'Training',
            line: {
              color: 'rgba(0, 255, 166, 1)',
            },
          },
        ]}
        layout={{
          width: width,
          height: height,
          margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
          xaxis: { range: [0, epochs.length], automargin: true, title: 'Epoch' },
          yaxis: {
            range: [0, Math.max(Math.max(...trainLogs), Math.max(...valLogs)) * 1.1],
            automargin: true,
            title: 'Softmax Loss',
          },
          legend: {
            xanchor: 'right',
          },
        }}
        config={{
          displaylogo: false,
          modeBarButtonsToRemove: ['autoScale2d', 'zoomIn2d', 'zoomOut2d'],
          toImageButtonOptions: {
            format: 'svg',
          },
        }}
      />
    </Grid>
  );
}

export default TrainingPlot;
