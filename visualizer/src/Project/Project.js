import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import Canvas from './Canvas';
import DisplayControls from './DisplayControls';
import EditControls from './EditControls';
import ForceLoadOutputModal from './ForceLoadOutputModal';
import Instructions from './Instructions';
import MissingProject from './MissingProject';
import { useProject } from './ProjectContext';
import ReviewControls from './ReviewControls';

function Project({ review }) {
  const project = useProject();
  const missing = useSelector(project, (state) => state.matches('missingProject'));

  if (missing) {
    return <MissingProject />;
  }

  return (
    <>
      <ForceLoadOutputModal />
      <Instructions />
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
      </Box>
    </>
  );
}

export default Project;
