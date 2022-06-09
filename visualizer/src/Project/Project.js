import Box from '@mui/material/Box';
import Canvas from './Canvas';
import DisplayControls from './DisplayControls';
// import Instructions from './Instructions';
import LabelControls from './LabelControls';
import { useEditing } from './ProjectContext';
import ReviewControls from './ReviewControls';

function Project({ review, track }) {
  const editing = useEditing();
  return (
    <>
      {/* <Instructions /> */}
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
          {review && editing && <ReviewControls />}
          <DisplayControls />
        </Box>
        {editing && <LabelControls />}
        <Canvas />
      </Box>
    </>
  );
}

export default Project;
