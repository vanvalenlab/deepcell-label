import Box from '@mui/material/Box';
import Canvas from './Canvas';
import DisplayControls from './DisplayControls';
import EditControls from './EditControls';
import Instructions from './Instructions';
import ReviewControls from './ReviewControls';

function Project({ review }) {
  return (
    <>
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
