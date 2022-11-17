import { FormLabel, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';

function ChannelPlot({ names }) {
    
    return (
        <>
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
        </>
    );
};

export default ChannelPlot;
