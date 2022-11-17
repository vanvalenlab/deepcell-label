import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useCellTypes, useEditCellTypes, useSelect } from '../../../ProjectContext';

function ChannelPlot(props) {
    const { calculations } = props;
    const editCellTypes = useEditCellTypes();
    const cellTypes = useCellTypes();
    const select = useSelect();
    const selection = useSelector(editCellTypes, (state) => state.context.multiSelected);
    let colorMap = useSelector(cellTypes, (state) => state.context.colorMap);
    if (colorMap) {
        colorMap = colorMap.map((color, i) => selection.includes(i)
        ? `rgba(255,255,255,1)`
        : color[3] === 0
            ? 'rgba(33,150,243,0.15)'
            : `rgba(${color[0]},${color[1]},${color[2]},1)`);
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

    const handleClick = (evt) => {
        const cell = evt.points[0].pointNumber;
        select.send({ type: 'SELECT', cell: cell });
    };

    return (
        <Grid item>
            <Plot
                data={[
                {
                    x: calculations[0],
                    y: calculations[1],
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: colorMap,
                        size: 6,
                        line: {
                            color: 'rgba(0,0,0,1)',
                            width: 0.5,
                        },
                    },
                },
                ]}
                layout={ {width: 330, height: 330, margin: {l: 30, r: 20, b: 30, t: 20, pad: 5}} }
                onSelected={handleSelection}
                onClick={handleClick}
            />
        </Grid>
    );
};

export default ChannelPlot;
