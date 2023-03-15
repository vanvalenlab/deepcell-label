import InsightsIcon from '@mui/icons-material/Insights';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import { Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useTraining } from '../../../ProjectContext';
import PredictionModal from './PredictionModal';
import VisualizationModal from './VisualizationModal';

function TrainingButtons() {
  const training = useTraining();
  const model = useSelector(training, (state) => state.context.model);
  const [trainOpen, setTrainOpen] = useState(false);
  const [predOpen, setPredOpen] = useState(false);

  const handleTrainModal = () => {
    setTrainOpen(true);
  };

  const handlePredictModal = () => {
    setPredOpen(true);
  };

  return (
    <>
      <Grid item display='flex'>
        <Button
          sx={{
            width: '47%',
            backgroundColor: 'rgba(245, 20, 87, 1)',
            '&:hover': { backgroundColor: 'rgba(224, 0, 67, 1)' },
          }}
          variant='contained'
          onClick={handleTrainModal}
          startIcon={<MiscellaneousServicesIcon />}
        >
          Train
        </Button>
        <Button
          disabled={model ? false : true}
          sx={{
            marginLeft: '3%',
            width: '47%',
            backgroundColor: 'rgba(20, 200, 83, 1)',
            '&:hover': { backgroundColor: 'rgba(0, 180, 63, 1)' },
          }}
          variant='contained'
          onClick={handlePredictModal}
          startIcon={<InsightsIcon />}
        >
          Predict
        </Button>
      </Grid>
      <VisualizationModal open={trainOpen} setOpen={setTrainOpen} />
      <PredictionModal open={predOpen} setOpen={setPredOpen} />
    </>
  );
}

export default TrainingButtons;
