import Typography from '@mui/material/Typography';
import { Grid } from '@mui/material';

function SegmentCellSAMInstructions() {
  return (
    <Typography component={'span'}>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography variant='h5'>Actions</Typography>
          <Typography>
            The Van Valen Lab developed a new cell segmentation model called cell Segment Anything
            Model or cell SAM. Here you can select up to two channels to produce segmentation mask
            with cell SAM.
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <Typography variant='h6'>Primary Channel</Typography>
        </Grid>
        <Grid item xs={10}>
          <Typography>
            The primary channel for segmentation. If a nuclear channel exists, then this may be the
            nuclear channel.
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <Typography variant='h6'>Secondary Channel</Typography>
        </Grid>
        <Grid item xs={10}>
          <Typography>
            {' '}
            A secondary channel can be added for cell SAM to take into consideration for
            segmentation. For example, this can be the whole cell channel.
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <Typography variant='h6'>Segment All</Typography>
        </Grid>
        <Grid item xs={10}>
          <Typography>
            {' '}
            By performing this action, DeepCell Label connects to the cell SAM model on the cell SAM
            server and then gets the generated segmentation masks, which is rendered onto Deep Cell
            Label.
          </Typography>
        </Grid>
      </Grid>
    </Typography>
  );
}

export default SegmentCellSAMInstructions;
