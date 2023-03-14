import CancelIcon from '@mui/icons-material/Cancel';
import NotStartedIcon from '@mui/icons-material/NotStarted';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import { useCellsAtTime, useTraining } from '../../../ProjectContext';
import { getCellList, getCellListAtTime } from '../../../service/labels/trainingMachineUtils';
import Hyperparameters from './Hyperparameters';
import VisualizationTabs from './VisualizationTabs';

const calculateSplit = (whole, cellTypes, cellsAtTime, valSplit) => {
  const totalSize = whole
    ? getCellList(cellTypes).length
    : getCellListAtTime(cellTypes, cellsAtTime).length;
  const trainSize = Math.ceil((totalSize * valSplit) / 100);
  const valSize = totalSize - trainSize;
  return { trainSize, valSize };
};

function VisualizationModal({ open, setOpen }) {
  const trainingRef = useTraining();
  const cellTypes = useSelector(trainingRef, (state) => state.context.cellTypes);
  const progress = useSelector(trainingRef, (state) => state.context.epoch);
  const numEpochs = useSelector(trainingRef, (state) => state.context.numEpochs);
  const training = useSelector(trainingRef, (state) => state.matches('loaded.training.train'));
  const valSplit = useSelector(trainingRef, (state) => state.context.valSplit) * 100;
  const batchSize = useSelector(trainingRef, (state) => state.context.batchSize);
  const whole = useSelector(trainingRef, (state) => state.context.whole);
  const cellList = useCellsAtTime();
  const { trainSize, valSize } = calculateSplit(whole, cellTypes, cellList, valSplit);
  const badBatch = batchSize > trainSize;

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80vw',
    height: '80vh',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
  };

  const handleTrain = () => {
    if (!badBatch) {
      trainingRef.send({ type: 'TRAIN' });
    }
  };

  const handleCancel = () => {
    trainingRef.send({ type: 'CANCEL' });
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box sx={style} display='flex'>
        <Grid container item direction='column' spacing={'2vh'}>
          <Grid item>
            <Typography variant='h6' component='h2'>
              Training Parameters
            </Typography>
          </Grid>
          <Grid item>
            <Hyperparameters badBatch={badBatch} trainSize={trainSize} valSize={valSize} />
          </Grid>
          <Grid item display='flex'>
            <Button
              disabled={training}
              sx={{
                width: '46%',
                marginRight: '1em',
                backgroundColor: 'rgba(30, 200, 80, 1)',
                '&:hover': { backgroundColor: 'rgba(0, 170, 50, 1)' },
              }}
              onClick={handleTrain}
              variant='contained'
              startIcon={<NotStartedIcon />}
            >
              Start
            </Button>
            <Button
              disabled={!training}
              sx={{
                width: '46%',
                backgroundColor: 'rgba(245, 20, 87, 1)',
                '&:hover': { backgroundColor: 'rgba(224, 0, 67, 1)' },
              }}
              onClick={handleCancel}
              variant='contained'
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
          </Grid>
          <Grid item>
            <LinearProgress
              variant='determinate'
              value={(progress / (numEpochs - 1)) * 100}
              sx={{
                width: 'calc(92% + 1em)',
                height: '0.5em',
                borderRadius: '1em',
                [`&.${linearProgressClasses.colorPrimary}`]: {
                  backgroundColor: 'rgba(0, 0, 0, 0.07)',
                },
                [`& .${linearProgressClasses.bar}`]: {
                  backgroundColor:
                    progress + 1 === numEpochs ? 'rgba(30, 200, 80, 1)' : 'rgba(0, 166, 255, 1)',
                  borderRadius: '1em',
                },
              }}
            />
          </Grid>
        </Grid>
        <VisualizationTabs />
      </Box>
    </Modal>
  );
}

export default VisualizationModal;
