import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import { useLabelMode } from '../ProjectContext';
import CellControls from './CellControls';
import SegmentControls from './SegmentControls';
import TrackingControls from './TrackingControls';
import UndoRedo from './UndoRedo';

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
    return state.matches('segment')
      ? 0
      : state.matches('editCells')
      ? 1
      : state.matches('editLineage')
      ? 2
      : false;
  });

  return (
    <Box
      sx={{
        flex: '0 0 auto',
        px: 1,
      }}
    >
      <UndoRedo />
      <TabPanel value={value} index={0}>
        <SegmentControls />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CellControls />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <TrackingControls />
      </TabPanel>
    </Box>
  );
}

export default LabelControls;
