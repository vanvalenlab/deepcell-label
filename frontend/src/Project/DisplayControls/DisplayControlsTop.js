import Box from '@mui/material/Box';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';

const DisplayControlsTop = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        marginLeft: 2.5,
        marginTop: 1,
        marginBottom: 1,
      }}
    >
      <LabeledControls />
      <RawControls />
    </Box>
  );
};

export default DisplayControlsTop;
