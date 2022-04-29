import Box from '@mui/material/Box';
import Canvas from './Canvas';
import DisplayControls from './DisplayControls';
import Instructions from './Instructions';
import LabelControls from './LabelControls';
import LabelTabs from './LabelControls/LabelTabs';
import ReviewControls from './ReviewControls';

function Project({ review, track, edit }) {
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
            p: 1,
          }}
        >
          {track && edit && <LabelTabs />}
          {review && edit && <ReviewControls />}
          <DisplayControls />
        </Box>
        {edit && <LabelControls />}
        <Canvas edit={edit} />
      </Box>
    </>
  );
}

export default Project;
