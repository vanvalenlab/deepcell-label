import { Box } from '@mui/material';
import React from 'react';
import { useEditing } from '../../ProjectContext';
import DivisionAlerts from './Alerts/DivisionAlerts';
import Divisions from './Divisions';
import EditingPrompt from './EditingPrompt';

function TrackingControls() {
  const editing = useEditing();
  return (
    <Box display='flex' flexDirection='column'>
      <DivisionAlerts />
      <Divisions />
      {editing && <EditingPrompt />}
    </Box>
  );
}

export default TrackingControls;
