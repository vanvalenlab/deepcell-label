import BarChartIcon from '@mui/icons-material/BarChart';
import EggAltIcon from '@mui/icons-material/EggAlt';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCanvas, useChannelExpression, useLabelMode } from '../../ProjectContext';
import CellExpressions from './CellInfoUI/CellExpressions';
import CellInfo from './CellInfoUI/CellInfo';
import AddRemoveCancel from './ChannelExpressionUI/AddRemoveCancel';
import Calculate from './ChannelExpressionUI/Calculate';
import ChannelPlot from './ChannelExpressionUI/ChannelPlot';
import ChannelSelect from './ChannelExpressionUI/ChannelSelect';
import LearnTab from './TrainingUI/LearnTab';

function TabPanel({ children, value, index }) {
  return value === index && children;
}

function CellTypeTabs() {
  const channelExpression = useChannelExpression();
  const labelMode = useLabelMode();
  const canvas = useCanvas();
  const cellTypesEditing = useSelector(labelMode, (state) => state.matches('editCellTypes'));
  const calculations = useSelector(channelExpression, (state) => state.context.calculations);
  const sw = useSelector(canvas, (state) => state.context.width);
  const sh = useSelector(canvas, (state) => state.context.height);
  const scale = useSelector(canvas, (state) => state.context.scale);
  const [tab, setTab] = useState(0);
  const [plot, setPlot] = useState('histogram');

  const panelStyle = {
    position: 'relative',
    right: window.innerWidth - 860 - sw * scale,
    paddingTop: 2,
    width: 350,
    height: scale * sh - 60,
    overflow: 'hidden',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 10,
      backgroundColor: 'rgba(100,100,100,0.5)',
    },
  };

  const handleTab = (_, newValue) => {
    setTab(newValue);
  };

  return cellTypesEditing ? (
    <Box>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          position: 'relative',
          right: window.innerWidth - 860 - sw * scale,
        }}
      >
        <Tabs sx={{ height: 0 }} value={tab} onChange={handleTab} variant='fullWidth'>
          <Tab
            sx={{ top: -12 }}
            value={0}
            label='Plot'
            icon={<BarChartIcon />}
            iconPosition='start'
          />
          <Tab
            sx={{ top: -12 }}
            value={1}
            label='Cell'
            icon={<EggAltIcon sx={{ fontSize: 18 }} />}
            iconPosition='start'
          />
          <Tab
            sx={{ top: -12 }}
            value={2}
            label='Learn'
            icon={<PsychologyIcon />}
            iconPosition='start'
          />
        </Tabs>
      </Box>
      <Box sx={panelStyle}>
        <Grid container direction='column' spacing={2}>
          <TabPanel value={tab} index={0}>
            <Calculate />
            {calculations ? (
              <>
                <ChannelSelect setPlot={setPlot} plot={plot} />
                <ChannelPlot calculations={calculations} plot={plot} />
                <AddRemoveCancel />
              </>
            ) : null}
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <CellInfo />
            {calculations ? <CellExpressions calculations={calculations} /> : null}
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <LearnTab />
          </TabPanel>
        </Grid>
      </Box>
    </Box>
  ) : null;
}

export default CellTypeTabs;
