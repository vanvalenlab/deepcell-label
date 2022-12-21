import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import HeightIcon from '@mui/icons-material/Height';
import InputAdornment from '@mui/material/InputAdornment';
import SpeedIcon from '@mui/icons-material/Speed';

function Hyperparameters(props) {

    const { badBatch, batches, epochs, lrs, setBatch, setEpoch, setLr} = props;

    return (
        <Grid item display='flex'>
            <TextField
                select
                error={badBatch}
                label='Batch Size'
                defaultValue={0}
                size='small'
                sx={{ width: 100, marginLeft: 1.55, marginBottom: 2}}
                onChange={(evt) => setBatch(batches[evt.target.value])}
            >
                {batches.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                select
                label='# Epochs'
                defaultValue={0}
                size='small'
                sx={{ width: 100, marginLeft: 1, marginBottom: 2}}
                onChange={(evt) => setEpoch(epochs[evt.target.value])}
            >
                {epochs.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                select
                label='Learning Rate'
                defaultValue={0}
                size='small'
                sx={{ width: 110, marginLeft: 1, marginBottom: 2}}
                onChange={(evt) => setLr(lrs[evt.target.value])}
            >
                {lrs.map((opt, index) => (
                    <MenuItem key={index} value={index}>
                        {opt}
                    </MenuItem>
                ))}
            </TextField>
        </Grid>
    );
};

export default Hyperparameters;
