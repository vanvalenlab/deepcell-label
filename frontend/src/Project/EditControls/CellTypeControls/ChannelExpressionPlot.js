import SsidChartIcon from '@mui/icons-material/SsidChart';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import AddRemoveCancel from './ChannelExpressionUI/AddRemoveCancel';
import Calculate from './ChannelExpressionUI/Calculate';
import ChannelPlot from './ChannelExpressionUI/ChannelPlot';
import ChannelSelect from './ChannelExpressionUI/ChannelSelect';
import EmbeddingSelect from './TrainingUI/EmbeddingSelect';
import { useCanvas, useChannelExpression, useLabelMode } from '../../ProjectContext';
import EmbeddingPlot from './TrainingUI/EmbeddingPlot';

function TabPanel({ children, value, index }) {
    return value === index && children;
  }

function ChannelExpressionPlot() {

    const channelExpression = useChannelExpression();
    const labelMode = useLabelMode();
    const canvas = useCanvas();
    const cellTypesEditing = useSelector(labelMode, (state) => state.matches('editCellTypes'));
    const calculations = useSelector(channelExpression, (state) => state.context.calculations);
    const embedding = useSelector(channelExpression, (state) => state.context.reduction);
    const sw = useSelector(canvas, (state) => state.context.width);
    const sh = useSelector(canvas, (state) => state.context.height);
    const scale = useSelector(canvas, (state) => state.context.scale);
    const [channelX, setChannelX] = useState(0);
    const [channelY, setChannelY] = useState(1);
    const [tab, setTab] = useState(0);
    const [plot, setPlot] = useState('scatter');

    const panelStyle = {
        position: 'absolute', 
        top: 255    ,
        left: 500 + sw * scale, 
        height: scale * sh - 60,
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
    }

    const handleTab = (_, newValue) => {
        setTab(newValue);
    };

    return (
        cellTypesEditing
        ? <Box>
            <Tabs
                sx={{position: 'absolute', left: 500 + sw * scale, height: 10 }}
                value={tab}
                onChange={handleTab}
                variant='fullWidth'
            >
                <Tab sx={{width: 175, top: -12}} value={0} label='Plot' icon={<SsidChartIcon/>} iconPosition='start' />
                <Tab sx={{width: 175, top: -12}} value={1} label='Train' icon={<PsychologyIcon/>} iconPosition='start' />
            </Tabs>
            <Box sx={panelStyle}> 
                <Grid container direction='column' spacing={2}>
                    <TabPanel value={tab} index={0}>
                        <Calculate />
                        {calculations
                            ? <>
                                <ChannelSelect channelX={channelX} setChannelX={setChannelX} channelY={channelY} setChannelY={setChannelY} setPlot={setPlot} plot={plot} />
                                <ChannelPlot channelX={channelX} channelY={channelY} calculations={calculations} plot={plot} />
                                <AddRemoveCancel />
                            </>
                            : <></>
                        }
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <EmbeddingSelect />
                        {embedding
                            ? <>
                                <EmbeddingPlot embedding={embedding} />
                                <AddRemoveCancel />
                            </>
                            : <></>
                        }
                    </TabPanel>
                </Grid>
            </Box>
        </Box>
        : <></>
  );
}

export default ChannelExpressionPlot;
