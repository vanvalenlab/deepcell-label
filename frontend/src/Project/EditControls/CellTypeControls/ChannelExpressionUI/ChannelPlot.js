import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useCellTypes, useChannelExpression, useEditCellTypes, useRaw } from '../../../ProjectContext';

function ChannelPlot({ calculations, channelX, channelY, plot }) {

    const cellTypes = useCellTypes();
    const editCellTypes = useEditCellTypes();
    const raw = useRaw();
    const channelExpression = useChannelExpression();
    const names = useSelector(raw, (state) => state.context.channelNames);
    const selection = useSelector(editCellTypes, (state) => state.context.multiSelected);
    const stat = useSelector(channelExpression, (state) => state.context.calculation);
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
            {plot == 'scatter'
                ? <Plot
                    data={[
                    {
                        x: calculations[channelX],
                        y: calculations[channelY],
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
                    layout={ {width: 350, height: 370, margin: {l: 30, r: 20, b: 30, t: 30, pad: 5},
                        title: { text: stat },
                        xaxis: {automargin: true, title: names[channelX]},
                        yaxis: {automargin: true, title: names[channelY ]}, } }
                    onSelected={handleSelection}
                    onDoubleClick={handleDeselect}
                    onClick={handleClick}
                />
                : <Plot
                    data={[
                    {
                        x: calculations[channelX],
                        type: 'histogram',
                        marker: {
                            color: 'rgba(33,150,243,0.8)',
                        },
                    },
                    ]}
                    layout={ {bargap: 0.1, width: 350, height: 350, margin: {l: 30, r: 20, b: 30, t: 30, pad: 5},
                        title: { text: stat },
                        xaxis: {automargin: true, title: names[channelX]}, } }
                    onSelected={handleSelection}
                />
            }
        </Grid>
    );
};

export default ChannelPlot;
