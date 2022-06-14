import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import LabeledControls from '../DisplayControls/LabeledControls';
import RawControls from '../DisplayControls/RawControls';
import SpotsControls from '../DisplayControls/SpotsControls';
import { useLabelMode } from '../ProjectContext';
import CellControls from './CellControls';
import TrackingControls from './DivisionsControls';
import SegmentControls from './SegmentControls';

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
    return state.matches('display')
      ? 0
      : state.matches('editSegment')
      ? 1
      : state.matches('editCells')
      ? 2
      : state.matches('editDivisions')
      ? 3
      : state.matches('editSpots')
      ? 4
      : false;
  });

  return (
    <Box
      sx={{
        flex: '0 0 auto',
        px: 1,
      }}
    >
      <TabPanel value={value} index={0}>
        <Typography>Segmentation</Typography>
        <LabeledControls />
        <Typography>Image</Typography>
        <RawControls />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <SegmentControls />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <CellControls />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <TrackingControls />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <SpotsControls />
      </TabPanel>
    </Box>
  );
}

export default EditControls;
