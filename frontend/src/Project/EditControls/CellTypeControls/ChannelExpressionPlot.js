import { Box, Button, CircularProgress, FormLabel, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import Plot from 'react-plotly.js';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes, useChannelExpression, useEditCellTypes, useLabeled, useLabelMode, useRaw } from '../../ProjectContext';

function getName(cellTypes, id) {
    const type = cellTypes.find(cellType => cellType.id === id);
    return type.name;
};

function ChannelExpressionPlot() {

    const channelExpression = useChannelExpression();
    const labelMode = useLabelMode();
    const cellTypes = useCellTypes();
    const editCellTypes = useEditCellTypes();
    const raw = useRaw();
    const labeled = useLabeled();
    const feature = useSelector(labeled, (state) => state.context.feature);
    const names = useSelector(raw, (state) => state.context.channelNames);
    const cellTypesEditing = useSelector(labelMode, (state) => state.matches('editCellTypes'));
    const calculating = useSelector(channelExpression, (state) => state.matches('loaded.calculating'));
    const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes).filter(
        (cellType) => cellType.feature === feature
    );
    const calculations = useSelector(channelExpression, (state) => state.context.calculations);
    let colorMap = useSelector(cellTypes, (state) => state.context.colorMap);
    if (colorMap) {
        colorMap = colorMap.map((color) => color[3] === 0
            ? 'rgba(33,150,243,0.15)'
            : `rgba(${color[0]},${color[1]},${color[2]},1)`);
    }

    const [cellType, setCellType] = useState(0);
    const [selecting, setSelecting] = useState(false);
    const cellTypeIds = cellTypesList.map((cellType) => cellType.id);
    const quantities = ['Mean', 'Total'];
    const [stat, setStat] = useState(0);

    let calculated = true;
    if (!calculations) {
        calculated = false;
    };

    const handleCalculation = () => {
        channelExpression.send({ type: 'CALCULATE', stat: quantities[stat] });
    };

    const handleSelection = (evt) => {
        if (evt.points.length > 0) {
            const selected = evt.points[0].data.selectedpoints;
            editCellTypes.send({type: 'MULTISELECTION', selected: selected});
            setSelecting(true);
        }
        else {
            editCellTypes.send({type: 'MULTISELECTION', selected: []});
            setSelecting(false);
        }
    };

    const handleCellType = (evt) => {
        setCellType(evt.target.value);
    };

    const addCellTypes = () => {
        editCellTypes.send({ type: 'MULTIADD', cellType: cellTypeIds[cellType] });
        editCellTypes.send({type: 'MULTISELECTION', selected: []});
        setSelecting(false);
    };

    return (
        cellTypesEditing
        ? <Box sx={{position: 'relative' }}> 
            <Grid container direction='column' spacing={2}>
                <Grid item>
                    <FormLabel sx={{fontSize: 18}}>
                        Channel Expression Plotting
                    </FormLabel>
                </Grid>
                <Grid item display='flex'>
                    <TextField select size='small' value={stat} onChange={(evt) => setStat(evt.target.value)}
                        sx={{width: 130}}>
                        {quantities.map((opt, index) => (
                        <MenuItem key={index} value={index}>
                            {opt}
                        </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        sx={{marginLeft: 2}}
                        variant='contained'
                        onClick={handleCalculation}
                        >
                        Calculate
                    </Button>
                </Grid>
                {calculating
                    ? <CircularProgress/>
                    : (calculated
                        ? <>
                            <Grid item display='flex'>
                                <FormLabel> X-axis </FormLabel>
                                <FormLabel sx={{marginLeft: 12.8}}> Y-axis </FormLabel>
                            </Grid>
                            <Grid item display='flex'>
                                <TextField select size='small' value={0}
                                    sx={{width: 130}}>
                                    {names.map((opt, index) => (
                                    <MenuItem key={index} value={index}>
                                        {opt}
                                    </MenuItem>
                                    ))}
                                </TextField>
                                <TextField select size='small' value={1}
                                    sx={{width: 130, marginLeft: 2}}>
                                    {names.map((opt, index) => (
                                    <MenuItem key={index} value={index}>
                                        {opt}
                                    </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item>
                                <div>
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
                                        layout={ {width: 350, height: 350, margin: {l: 30, r: 20, b: 30, t: 20, pad: 5}} }
                                        onSelected={handleSelection}
                                    />
                                </div>  
                            </Grid>
                            <Grid item>
                                <TextField select size='small' value={cellType} onChange={handleCellType}
                                    sx={{width: 170}}>
                                    {cellTypeIds.map((opt, index) => (
                                        <MenuItem key={index} value={index}>
                                            {getName(cellTypesList, opt)}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <Button
                                    sx={{marginLeft: 2}}
                                    disabled={!selecting}
                                    variant='contained'
                                    onClick={addCellTypes}
                                    >
                                    Add Cells
                                </Button>
                            </Grid>
                        </>
                        : <></>
                    )
                }
            </Grid>
        </Box>
        : <></>
  );
}

export default ChannelExpressionPlot;
