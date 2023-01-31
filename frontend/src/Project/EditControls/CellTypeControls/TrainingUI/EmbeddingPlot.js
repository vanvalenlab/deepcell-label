import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useCellTypes, useEditCellTypes } from '../../../ProjectContext';

function EmbeddingPlot({ embedding }) {

    const cellTypes = useCellTypes();
    const editCellTypes = useEditCellTypes();
    const selection = useSelector(editCellTypes, (state) => state.context.multiSelected);
    let colorMap = useSelector(cellTypes, (state) => state.context.colorMap);
    let widthMap = [...colorMap];
    if (colorMap) {
        colorMap = colorMap.map((color, i) => selection.includes(i)
        ? `rgba(255,255,255,1)`
        : color[3] === 0
            ? 'rgba(33,150,243,0.15)'
            : `rgba(${color[0]},${color[1]},${color[2]},1)`);
        widthMap = widthMap.map((color, i) => selection.includes(i)
        ? 1.3 
        : 0.5);
    }

    const handleSelection = (evt) => {
        if (evt.points.length > 0) {
            const selected = evt.points[0].data.selectedpoints;
            editCellTypes.send({type: 'MULTISELECTION', selected: selected});
        }
        else {
            editCellTypes.send({type: 'MULTISELECTION', selected: []});
        }
    };

    const handleDeselect = () => {
        if (selection.length > 0) {
            editCellTypes.send({type: 'MULTISELECTION', selected: []});
        }
    };

    const handleClick = (evt) => {
        const cell = evt.points[0].pointNumber;
        editCellTypes.send({ type: 'MULTISELECTION', selected: [cell] });
    };

    return (
        <Grid item>
            <Plot
                data={[
                {
                    x: embedding[0],
                    y: embedding[1],
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: colorMap,
                        size: 6,
                        line: {
                            color: 'rgba(0,0,0,1)',
                            width: widthMap,
                        },
                    },
                },
                ]}
                layout={{
                    width: 350,
                    height: 350,
                    margin: { l: 30, r: 20, b: 30, t: 20, pad: 5 },
                }}
                config={{
                    displaylogo: false,
                    modeBarButtonsToRemove: ['toImage', 'autoScale2d', 'zoomIn2d', 'zoomOut2d']
                }}
                onSelected={handleSelection}
                onClick={handleClick}
                onDoubleClick={handleDeselect}
            />
        </Grid>
    );
};

export default EmbeddingPlot;
