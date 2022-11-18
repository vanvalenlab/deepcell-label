import { Box, FormLabel} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import Calculate from './ChannelExpressionUI/Calculate';
import ChannelPlot from './ChannelExpressionUI/ChannelPlot';
import ChannelSelect from './ChannelExpressionUI/ChannelSelect';
import AddRemoveCancel from './ChannelExpressionUI/AddRemoveCancel';
import { useCanvas, useChannelExpression, useLabelMode } from '../../ProjectContext';

function ChannelExpressionPlot() {

    const channelExpression = useChannelExpression();
    const labelMode = useLabelMode();
    const canvas = useCanvas();
    const cellTypesEditing = useSelector(labelMode, (state) => state.matches('editCellTypes'));
    const calculations = useSelector(channelExpression, (state) => state.context.calculations);
    const calculated = calculations ? true : false;
    const sw = useSelector(canvas, (state) => state.context.width);
    const sh = useSelector(canvas, (state) => state.context.height);
    const scale = useSelector(canvas, (state) => state.context.scale);
    const [channelX, setChannelX] = useState(0);
    const [channelY, setChannelY] = useState(2);

    return (
        cellTypesEditing
        ? <Box sx={{
            position: 'absolute', 
            left: 500 + sw * scale, 
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
                        <ChannelSelect channelX={channelX} setChannelX={setChannelX} channelY={channelY} setChannelY={setChannelY} />
                        <ChannelPlot channelX={channelX} channelY={channelY} calculations={calculations} />
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
