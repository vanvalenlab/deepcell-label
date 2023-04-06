import { Button, FormLabel, Grid, MenuItem, TextField } from '@mui/material';
import Slider from '@mui/material/Slider/Slider';
import { useSelector } from '@xstate/react';
import { useTraining } from '../../../ProjectContext';

function PredictionParameters({ setOpen }) {
  const training = useTraining();
  const threshold = useSelector(training, (state) => state.context.uncertaintyThreshold) * 100;
  const mode = useSelector(training, (state) => state.context.predictionMode);
  const marks = [
    { value: 0, label: '0%' },
    { value: 10 },
    { value: 20 },
    { value: 30 },
    { value: 40 },
    { value: 50, label: '50%' },
    { value: 60 },
    { value: 70 },
    { value: 80 },
    { value: 90 },
    { value: 100, label: '100%' },
  ];

  const options = ['Over threshold', 'Under threshold', 'Do not make any predictions'];
  const modes = ['over', 'under', 'none'];

  const handleThreshold = (evt) => {
    training.send({ type: 'THRESHOLD', uncertaintyThreshold: evt.target.value / 100 });
  };

  const handleMode = (evt) => {
    training.send({ type: 'PREDICTION_MODE', predictionMode: evt.target.value });
  };

  const handlePredict = () => {
    setOpen(false);
    training.send({ type: 'PREDICT' });
  };

  return (
    <>
      <Grid item>
        <FormLabel>Uncertainty Threshold</FormLabel>
      </Grid>
      <Grid item>
        <Slider
          valueLabelDisplay='auto'
          value={threshold}
          onChange={handleThreshold}
          size='small'
          step={null}
          marks={marks}
          min={0}
          max={100}
          sx={{
            marginLeft: 2,
            width: '94%',
            '& .MuiSlider-thumb': { height: '1.2em', width: '1.2em' },
            '& .MuiSlider-track': { height: '0.2em' },
            '& .MuiSlider-rail': { height: '0.2em' },
          }}
        />
      </Grid>
      <Grid item>
        <FormLabel>Show Prediction Labels</FormLabel>
      </Grid>
      <Grid item>
        <TextField select size='small' value={mode} onChange={handleMode} sx={{ width: '47%' }}>
          {options.map((opt, index) => (
            <MenuItem key={index} value={modes[index]}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
        <Button
          sx={{
            marginLeft: '6%',
            width: '47%',
          }}
          variant='contained'
          onClick={handlePredict}
        >
          Run Inference
        </Button>
      </Grid>
    </>
  );
}

export default PredictionParameters;
