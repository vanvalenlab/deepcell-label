import { FormLabel, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';

function ChannelSelect(props) {
    
    const { channelX, setChannelX, channelY, setChannelY } = props;
    const raw = useRaw();
    const names = useSelector(raw, (state) => state.context.channelNames);
    const yNames = ['Histogram'].concat(names);

    const handleChangeX = (evt) => {
        setChannelX(evt.target.value);
    };

    const handleChangeY = (evt) => {
        setChannelY(evt.target.value);
    };

    return (
        <>
            <Grid item display='flex'>
                <FormLabel> X-axis </FormLabel>
                <FormLabel sx={{marginLeft: 12.8}}> Y-axis </FormLabel>
            </Grid>
            <Grid item display='flex'>
                <TextField select size='small' value={channelX}
                    sx={{width: 130}}
                    onChange={handleChangeX}>
                    {names.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                    ))}
                </TextField>
                <TextField select size='small' value={channelY}
                    sx={{width: 130, marginLeft: 2}}
                    onChange={handleChangeY}>
                    {yNames.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                    ))}
                </TextField>
            </Grid>
        </>
    );
};

export default ChannelSelect;
