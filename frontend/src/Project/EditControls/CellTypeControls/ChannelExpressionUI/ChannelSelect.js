import { MenuItem, TextField } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';

function ChannelSelect(props) {
    
    const { channelX, setChannelX, channelY, setChannelY, plot, setPlot } = props;
    const raw = useRaw();
    const names = useSelector(raw, (state) => state.context.channelNames);

    const handleChangePlot = (evt) => {
        setPlot(evt.target.value);
    };

    const handleChangeX = (evt) => {
        setChannelX(evt.target.value);
    };

    const handleChangeY = (evt) => {
        setChannelY(evt.target.value);
    };

    return (
        <>
            <Grid item display='flex' sx={{marginTop: 2}}>
                <TextField
                    select
                    size='small'
                    value={channelX}
                    label='X Channel'
                    sx={{width: 130}}
                    onChange={handleChangeX}
                >
                    {names.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                    ))}
                </TextField>
                <TextField 
                    select
                    size='small'
                    value={channelY}
                    label='Y Channel'
                    disabled={plot == 'histogram'}
                    sx={{width: 130, marginLeft: 2}}
                    onChange={handleChangeY}
                >
                    {names.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                    ))}
                </TextField>
            </Grid>
            <Grid item sx={{marginLeft: 1.5}}>
                <FormControl>
                    <RadioGroup row value={plot} onChange={handleChangePlot}>
                        <FormControlLabel value="scatter" control={<Radio />} label="Scatter" />
                        <FormControlLabel value="histogram" sx={{marginLeft: 4}} control={<Radio />} label="Histogram" />
                    </RadioGroup>
                </FormControl>
            </Grid>
        </>
    );
};

export default ChannelSelect;
