import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import SpotsControls from '../DisplayControls/SpotsControls';
import { useLabelMode } from '../ProjectContext';
import CellControls from './CellControls';
import CellTypeControls from './CellTypeControls';
import TrackingControls from './DivisionsControls';
import SegmentControls from './SegmentControls';
import SegmentSamControls from './SegmentSamControls';

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

function EditControls() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('editSegment')
      ? 0
      : state.matches('editSegmentSam')
      ? 1
      : state.matches('editCells')
      ? 2
      : state.matches('editDivisions')
      ? 3
      : state.matches('editCellTypes')
      ? 4
      : state.matches('editSpots')
      ? 5
      : false;
  });

  return (
    <Box
      sx={{
        flex: '0 0 auto',
        px: 1,
        minWidth: '150px',
      }}
    >
      <TabPanel value={value} index={0}>
        <SegmentControls />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <SegmentSamControls />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <CellControls />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <TrackingControls />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <CellTypeControls />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <SpotsControls />
      </TabPanel>
    </Box>
  );
}

export default EditControls;
