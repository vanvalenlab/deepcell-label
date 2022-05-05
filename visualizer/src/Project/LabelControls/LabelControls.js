import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import { useLabelMode } from '../ProjectContext';
import SegmentControls from './SegmentControls';
import TrackingControls from './TrackingControls';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function LabelControls() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('segment') ? 0 : state.matches('track') ? 1 : false;
  });

  return (
    <Box
      sx={{
        flex: '0 0 auto',
        p: 1,
      }}
    >
      <TabPanel value={value} index={0}>
        <SegmentControls />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TrackingControls />
      </TabPanel>
    </Box>
  );
}

export default LabelControls;
