import equal from 'fast-deep-equal';
import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useTraining } from '../../../ProjectContext';

function TrainingPlot() {

    const training = useTraining();
    const logs = useSelector(training, (state) => state.context.logs, equal);
    const epochs = logs.map((_, i) => i);

    return (
        <Grid item>
            <Plot
                data={[
                {
                    x: epochs,
                    y: logs,
                    mode: 'lines',
                    line: {
                        color: 'rgba(0, 166, 255, 1)'
                    },
                },
                ]}
                layout={{
                    width: 550,
                    height: 550,
                    margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
                    xaxis: { range: [0, epochs.length], automargin: true, title: 'Epoch' },
                    yaxis: { range: [0, logs[0] * 1.1], automargin: true, title: 'Softmax Loss' },
                }}
                config={{
                    displaylogo: false,
                    modeBarButtonsToRemove: ['toImage', 'autoScale2d', 'zoomIn2d', 'zoomOut2d']
                }}
            />
        </Grid>
    );
};

export default TrainingPlot;
