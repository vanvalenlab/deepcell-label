import HelpIcon from '@mui/icons-material/Help';
import { IconButton } from '@mui/material';
import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import Canvas from './Canvas';
import DisplayControls from './DisplayControls';
import DisplayControlsTop from './DisplayControls/DisplayControlsTop';
import EditControls from './EditControls';
import CellTypeTabs from './EditControls/CellTypeControls/CellTypeTabs';
import ForceLoadOutputModal from './ForceLoadOutputModal';
import InstructionsModal from './Instructions/InstructionsModal';
import MissingProject from './MissingProject';
import { useProject } from './ProjectContext';
import ReviewControls from './ReviewControls';

function Project({ review }) {
  const project = useProject();
  const missing = useSelector(project, (state) => state.matches('missingProject'));
  const [open, setOpen] = useState(false);

  if (missing) {
    return <MissingProject />;
  }

  return (
    <>
      <ForceLoadOutputModal />
      <DisplayControlsTop />
      <Box
        sx={{
          boxSizing: 'border-box',
          display: 'flex',
          flexGrow: 1,
          p: 1,
          alignItems: 'stretch',
          justifyContent: 'space-evenly',
          minHeight: 'calc(100vh - 73px - 56px - 76px - 2px)',
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            px: 1,
          }}
        >
          {review && <ReviewControls />}
          <DisplayControls />
        </Box>
        <EditControls />
        <Canvas />
        <CellTypeTabs />
      </Box>
      {/* TODO: Move this help button and instructions modal to the actual Navbar.
      Would require changing many of the instruction components to not rely on project state */}
      <IconButton
        target='_blank'
        sx={{
          display: 'block',
          borderRadius: 1,
          position: 'absolute',
          marginLeft: 29,
          marginTop: 1.4,
        }}
        onClick={() => setOpen(true)}
      >
        <HelpIcon sx={{ fontSize: 24, color: 'rgb(255,255,255)', marginTop: 0.5 }} />
      </IconButton>
      <InstructionsModal open={open} setOpen={setOpen} />
    </>
  );
}

export default Project;
