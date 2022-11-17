import { Box, FormLabel} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import Calculate from './ChannelExpressionUI/Calculate';
import ChannelPlot from './ChannelExpressionUI/ChannelPlot';
import ChannelSelect from './ChannelExpressionUI/ChannelSelect';
import AddRemoveCancel from './ChannelExpressionUI/AddRemoveCancel';
import { useCanvas, useChannelExpression, useLabelMode, useRaw } from '../../ProjectContext';

function ChannelExpressionPlot() {

    const channelExpression = useChannelExpression();
    const labelMode = useLabelMode();
    const raw = useRaw();
    const canvas = useCanvas();
    const names = useSelector(raw, (state) => state.context.channelNames);
    const cellTypesEditing = useSelector(labelMode, (state) => state.matches('editCellTypes'));
    const calculations = useSelector(channelExpression, (state) => state.context.calculations);
    const calculated = calculations ? true : false;
    const sw = useSelector(canvas, (state) => state.context.width);
    const sh = useSelector(canvas, (state) => state.context.height);
    const scale = useSelector(canvas, (state) => state.context.scale);

    return (
        cellTypesEditing
        ? <Box sx={{
            position: 'absolute', 
            left: 525 + sw * scale, 
            height: scale * sh,
            overflow: 'hidden',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
                width: 5,
                borderRadius: 10,
                backgroundColor: 'rgba(0,0,0,0.1)'
            },
            '&::-webkit-scrollbar-thumb': {
                borderRadius: 10,
                backgroundColor: 'rgba(100,100,100,0.5)',
            }
        }}> 
            <Grid container direction='column' spacing={2}>
                <Grid item>
                    <FormLabel sx={{fontSize: 18}}>
                        Channel Expression Plotting
                    </FormLabel>
                </Grid>
                <Calculate />
                {calculated
                    ? <>
                        <ChannelSelect names={names} />
                        <ChannelPlot calculations={calculations} />
                        <AddRemoveCancel />
                    </>
                    : <></>
                }
            </Grid>
        </Box>
        : <></>
  );
}

export default ChannelExpressionPlot;
