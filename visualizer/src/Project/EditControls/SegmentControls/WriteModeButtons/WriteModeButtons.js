import { Box, FormLabel, ToggleButton, Tooltip } from '@mui/material';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useSegmentApi } from '../../../ProjectContext';
import ExcludeIcon from './ExcludeIcon';
import OverlapIcon from './OverlapIcon';
import OverwriteIcon from './OverwriteIcon';

function WriteModeButtons() {
  // write state machine
  const api = useSegmentApi();
  const writeMode = useSelector(api, (state) => state.context.writeMode);

  const handleWriteMode = (event, newWriteMode) => {
    if (newWriteMode !== null) {
      api.send({ type: 'SET_WRITE_MODE', writeMode: newWriteMode });
    }
  };

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Write Mode</FormLabel>
      <ToggleButtonGroup
        orientation='vertical'
        value={writeMode}
        exclusive
        onChange={handleWriteMode}
        aria-label='label write mode'
      >
        <Tooltip title='Overlap labels' value='overlap' placement='right'>
          <ToggleButton value='overlap'>
            <OverlapIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip title='Overwrite labels' value='overwrite' placement='right'>
          <ToggleButton value='overwrite'>
            <OverwriteIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip title='Exclude labels' value='exclude' placement='right'>
          <ToggleButton value='exclude'>
            <ExcludeIcon />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
}

export default WriteModeButtons;
