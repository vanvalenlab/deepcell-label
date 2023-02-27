import BarChartIcon from '@mui/icons-material/BarChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useTraining } from '../../../ProjectContext';
import ConfusionMatrix from './ConfusionMatrix';
import DistributionHistogram from './DistributionHistogram';
import TrainingPlot from './TrainingPlot';

function TabPanel({ children, value, index }) {
  return value === index && children;
}

function VisualizationTabs() {
  const training = useTraining();
  const logs = useSelector(training, (state) => state.context.trainLogs);
  const confusionMatrix = useSelector(training, (state) => state.context.confusionMatrix);
  const trainCounts = useSelector(training, (state) => state.context.trainCounts);
  const [tab, setTab] = useState(0);

  const handleTab = (_, newValue) => {
    setTab(newValue);
  };

  const tabLabels = window.innerWidth > 1000;

  return (
    <>
      <Grid container item direction='column' spacing={'1vh'}>
        <Grid item>
          <Typography variant='h6' component='h2'>
            Training Visualizations
          </Typography>
        </Grid>
        <Grid item>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs sx={{ height: '1vh' }} value={tab} onChange={handleTab} variant='fullWidth'>
              <Tab
                sx={tabLabels ? { top: -12 } : {}}
                value={0}
                label={tabLabels ? 'Training Plot' : ''}
                icon={<SsidChartIcon />}
                iconPosition='start'
              />
              <Tab
                sx={tabLabels ? { top: -12 } : {}}
                value={1}
                label={tabLabels ? 'Confusion Matrix' : ''}
                icon={<GridOnIcon sx={{ fontSize: '140%' }} />}
                iconPosition='start'
              />
              <Tab
                sx={tabLabels ? { top: -12 } : {}}
                value={2}
                label={tabLabels ? 'Distribution' : ''}
                icon={<BarChartIcon />}
                iconPosition='start'
              />
            </Tabs>
          </Box>
        </Grid>
        <TabPanel value={tab} index={0}>
          <Grid item>{logs.length > 0 ? <TrainingPlot /> : null}</Grid>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Grid item>
            {confusionMatrix ? <ConfusionMatrix confusionMatrix={confusionMatrix} /> : null}
          </Grid>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Grid item>
            {trainCounts ? <DistributionHistogram trainCounts={trainCounts} /> : null}
          </Grid>
        </TabPanel>
      </Grid>
    </>
  );
}

export default VisualizationTabs;
