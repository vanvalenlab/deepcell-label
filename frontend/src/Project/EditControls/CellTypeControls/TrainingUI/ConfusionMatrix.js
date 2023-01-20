import equal from 'fast-deep-equal';
import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useTraining } from '../../../ProjectContext';

function ConfusionMatrix({ confusionMatrix }) {

    const training = useTraining();
    const cellTypes = useSelector(training, (state) => state.context.cellTypes);
    const feature = useSelector(training, (state) => state.context.feature);
    const getCellTypeNames = (cellTypes, feature) => {
        const currCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);
        const names = currCellTypes.map((cellType) => cellType.name);
        return names;
    };
    const names = getCellTypeNames(cellTypes, feature);

    let annotations = [];
    for (let i = 0; i < confusionMatrix.length; i++) {
        for (let j = 0; j < confusionMatrix[0].length; j++) {
            const value = confusionMatrix[i][j];
            const result = {
                xref: 'x1',
                yref: 'y1',
                x: names[j],
                y: names[i],
                text: value,
                font: {
                  family: 'Arial',
                  size: 12,
                  color: value > 0.5 ? 'white' : 'black'
                },
                showarrow: false,
            };
            annotations.push(result);
        }
    }
    const colorscaleValue = [
        [0, 'rgba(250, 250, 255, 1)'],
        [1, 'rgba(0, 130, 230, 1)']
    ];

    return (
        <Plot
            data={[
            {
                x: names,
                y: names,
                z: confusionMatrix,
                type: 'heatmap',
                colorscale: colorscaleValue,
            },
            ]}
            layout={{
                annotations: annotations,
                width: 550,
                height: 270,
                margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
                xaxis: { automargin: true, title: 'Predicted' },
                yaxis: { automargin: true, title: 'Actual', autorange: 'reversed', tickangle: -90 },
                hovermode: false,
            }}
            config={{
                // staticPlot: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d', 'zoom2d'],
                toImageButtonOptions: {
                    format: 'svg'
                }
            }}
        />
    );
};

export default ConfusionMatrix;
