import { Box } from '@mui/material';
import React from 'react';
import DivisionAlerts from './Alerts/DivisionAlerts';
import Divisions from './Divisions';
import EditingPrompt from './EditingPrompt';

function TrackingControls() {
  return (
    <Box display='flex' flexDirection='column'>
      <DivisionAlerts />
      <Divisions />
      <EditingPrompt />
    </Box>
  );
}

export default TrackingControls;
