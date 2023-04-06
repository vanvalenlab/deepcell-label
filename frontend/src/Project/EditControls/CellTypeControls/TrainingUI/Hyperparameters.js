import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HeightIcon from '@mui/icons-material/Height';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import SpeedIcon from '@mui/icons-material/Speed';
import { Box, Chip, FormLabel, MenuItem, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import { useTheme } from '@mui/material/styles';
import { useSelector } from '@xstate/react';
import { useTraining } from '../../../ProjectContext';
import CalculateWholeToggle from '../ChannelExpressionUI/CalculateWholeToggle';

function Hyperparameters({ badBatch, trainSize, valSize }) {
  const batches = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  const epochs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const lrs = [0.001, 0.01, 0.1, 1.0];
  const training = useTraining();
  const imported = useSelector(training, (state) => state.context.embeddings);
  const embeddings = imported ? ['Mean', 'Total', 'Imported'] : ['Mean', 'Total'];
  const batchSize = batches.indexOf(useSelector(training, (state) => state.context.batchSize));
  const numEpochs = epochs.indexOf(useSelector(training, (state) => state.context.numEpochs));
  const learningRate = lrs.indexOf(useSelector(training, (state) => state.context.learningRate));
  const embedding = embeddings.indexOf(useSelector(training, (state) => state.context.embedding));
  const valSplit = useSelector(training, (state) => state.context.valSplit) * 100;
  const theme = useTheme();

  const marks = [
    { value: 50, label: '50%' },
    { value: 60 },
    { value: 70 },
    { value: 80 },
    { value: 90 },
    { value: 100, label: '100%' },
  ];

  const handleEmbedding = (evt) => {
    training.send({ type: 'EMBEDDING', embedding: embeddings[evt.target.value] });
  };

  const handleBatchSize = (evt) => {
    training.send({ type: 'BATCH_SIZE', batchSize: batches[evt.target.value] });
  };

  const handleEpochs = (evt) => {
    training.send({ type: 'NUM_EPOCHS', numEpochs: epochs[evt.target.value] });
  };

  const handleLearning = (evt) => {
    training.send({ type: 'LEARNING_RATE', learningRate: lrs[evt.target.value] });
  };

  const handleTrainSplit = (evt) => {
    training.send({ type: 'VAL_SPLIT', valSplit: evt.target.value / 100 });
  };

  return (
    <Box sx={{ display: 'flex', p: '0.5em' }}>
      <Grid container direction='column' spacing={'2vh'}>
        <Grid item>
          <FormLabel>Embedding</FormLabel>
        </Grid>
        <Grid item>
          <TextField
            select
            size='small'
            value={embedding}
            onChange={handleEmbedding}
            sx={{ width: '60%' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <ScatterPlotIcon sx={{ marginLeft: '-20%' }} />
                </InputAdornment>
              ),
            }}
          >
            {embeddings.map((opt, index) => (
              <MenuItem key={index} value={index}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item>
          <FormLabel>Batch Size</FormLabel>
        </Grid>
        <Grid item>
          <TextField
            select
            error={badBatch}
            value={batchSize}
            size='small'
            sx={{ width: '60%' }}
            onChange={handleBatchSize}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <HeightIcon sx={{ marginLeft: '-20%' }} />
                </InputAdornment>
              ),
            }}
          >
            {batches.map((opt, index) => (
              <MenuItem key={index} value={index}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <Typography
            sx={{
              position: 'absolute',
              marginLeft: '1.2em',
              marginTop: '0.2vw',
              color: theme.palette.error.main,
              fontSize: 12,
            }}
          >
            {badBatch ? 'Cannot exceed number of samples' : null}
          </Typography>
        </Grid>
        <Grid item>
          <FormLabel>Num. Epochs</FormLabel>
        </Grid>
        <Grid item>
          <TextField
            select
            value={numEpochs}
            size='small'
            sx={{ width: '60%' }}
            onChange={handleEpochs}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <AccessTimeIcon sx={{ marginLeft: '-20%' }} />
                </InputAdornment>
              ),
            }}
          >
            {epochs.map((opt, index) => (
              <MenuItem key={index} value={index}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item>
          <FormLabel>Learning Rate</FormLabel>
        </Grid>
        <Grid item>
          <TextField
            select
            value={learningRate}
            size='small'
            sx={{ width: '60%' }}
            onChange={handleLearning}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SpeedIcon sx={{ marginLeft: '-20%' }} />
                </InputAdornment>
              ),
            }}
          >
            {lrs.map((opt, index) => (
              <MenuItem key={index} value={index}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Grid container direction='column' spacing={'5.3vh'} sx={{ marginLeft: '-10%' }}>
        <Grid item>
          <FormLabel>Train Split</FormLabel>
        </Grid>
        <Grid item>
          <Slider
            valueLabelDisplay='auto'
            size='small'
            value={valSplit}
            onChange={handleTrainSplit}
            step={null}
            marks={marks}
            min={0}
            max={100}
            sx={{
              width: '65%',
              '& .MuiSlider-thumb': { height: '1.2em', width: '1.2em' },
              '& .MuiSlider-track': { height: '0.2em' },
              '& .MuiSlider-rail': { height: '0.2em' },
            }}
          />
        </Grid>
        <Grid item display='inline-block'>
          <FormLabel sx={{ paddingRight: '2.5em' }}>Training Set Size</FormLabel>
          <Chip label={trainSize} />
        </Grid>
        <Grid item>
          <FormLabel sx={{ paddingRight: '4.2em' }}>Test Set Size</FormLabel>
          <Chip label={valSize} />
        </Grid>
        <Grid item>
          <Box sx={{ marginLeft: '-0.9em' }}>
            <CalculateWholeToggle />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Hyperparameters;
