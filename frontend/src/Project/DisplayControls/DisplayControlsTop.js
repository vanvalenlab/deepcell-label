import Box from '@mui/material/Box';
import LabeledControlsTop from './LabeledControls/LabeledControlsTop';
import RawControlsTop from './RawControls/RawControlsTop';

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
      <LabeledControlsTop />
      <RawControlsTop />
    </Box>
  );
};

export default DisplayControlsTop;
