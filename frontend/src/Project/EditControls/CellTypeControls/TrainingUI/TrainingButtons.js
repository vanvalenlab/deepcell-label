import InsightsIcon from '@mui/icons-material/Insights';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import { Box, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useTraining } from '../../../ProjectContext';
import VisualizationModal from './VisualizationModal';

function TrainingButtons() {
  const training = useTraining();
  const model = useSelector(training, (state) => state.context.model);
  const [open, setOpen] = useState(false);

  const handleTrain = () => {
    setOpen(true);
  };

  const handlePredict = () => {
    training.send({ type: 'PREDICT' });
  };

  return (
    <Box sx={{ marginTop: 2, marginLeft: 1.8 }}>
      <Grid item display='flex' sx={{ marginTop: 1 }}>
        <Button
          sx={{
            marginLeft: 1.55,
            width: 154.6,
            height: 35,
            backgroundColor: 'rgba(245, 20, 87, 1)',
            '&:hover': { backgroundColor: 'rgba(224, 0, 67, 1)' },
          }}
          variant='contained'
          onClick={handleTrain}
          startIcon={<MiscellaneousServicesIcon />}
        >
          Train
        </Button>
        <Button
          disabled={model ? false : true}
          sx={{
            marginLeft: 2,
            width: 154.6,
            height: 35,
            backgroundColor: 'rgba(20, 200, 83, 1)',
            '&:hover': { backgroundColor: 'rgba(0, 180, 63, 1)' },
          }}
          variant='contained'
          onClick={handlePredict}
          startIcon={<InsightsIcon />}
        >
          Predict
        </Button>
      </Grid>
      <VisualizationModal open={open} setOpen={setOpen} />
    </Box>
  );
}

export default TrainingButtons;
