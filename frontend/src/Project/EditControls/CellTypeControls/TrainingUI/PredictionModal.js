import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import PredictionParameters from './PredictionParameters';

function PredictionModal({ open, setOpen }) {
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '30vw',
    height: '50vh',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box sx={style} display='flex'>
        <Grid container item direction='column' spacing={'4vh'}>
          <Grid item>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='h6' component='h2'>
                Prediction Parameters
              </Typography>
            </Box>
          </Grid>
          <PredictionParameters setOpen={setOpen} />
        </Grid>
      </Box>
    </Modal>
  );
}

export default PredictionModal;
