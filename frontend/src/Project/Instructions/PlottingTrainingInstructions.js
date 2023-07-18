import { Box, Grid } from '@mui/material';
import Typography from '@mui/material/Typography';

function PlottingTrainingInstructions() {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          Use the panel to the right of the canvas to calculate, plot, and train on statistics /
          data. <br />
          Note that this is a set of features intended for more advanced users.
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h5'>Calculations and Plotting</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            Channel marker count calculation and plotting can be done through the first tab.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Marker Count Calculations</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            There are 2 calculations supported right now (<b>Mean</b> and <b>Total</b>). Select the
            statistic of interest, then press the "Calculate" button to calculate the mean or total
            marker counts for every cell in the frame. <br />
            Turning on the "All Frames" option is only relevant if you have multiple images on the
            timeline for which you want to run the calculation across. Make sure that cell IDs are
            correctly independent across the images if you want to use this.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Plotting</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            After the calculation finishes, the user can select 1-2 channels to visualize on
            plotting interface (histogram or scatter plot). Using the plotly widget, you can select
            sets of cells and either add or remove them from a specified cell type!
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant='h5'>Cell Info</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            On the second tab of the right-side panel, you can view the calculations for the cell
            you have selected for whatever metric you last calculated. Additionally, you can add or
            remove the cell from any cell types and view which cell type(s) it is apart of. Finally,
            you can use the arrow keys or the arrow buttons to cycle to the next highest or lowest
            cell in the currently opened cell type (defined as which cell type accordion on the left
            is opened).
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant='h5'>Visualization and Training</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            On the last tab of the right-side panel, you can run various visualizations or even
            train your own model in-browser for cell type classification using current labels as a
            training set.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Visualizations</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            UMAPs of the above marker count calculations can be plotted on a Plotly widget, and
            centroids of each cell can also be plotted. If a list of vectors for each cell was also
            specified (embeddings, for example), the imported vectors can also be projected to 2-D
            with UMAP and visualized.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Training</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            Clicking the "Train" button will open the training modal. Here, you can specify which
            calculation (or imported embedding) you would like to train on, as well as common
            hyperparameters. As with the calculations, the "All Frames" option can be selected to
            train across all images in the timeline. Clicking "Start" will begin the training with
            the specified parameters. After training is finished, some visualizations can be seen on
            the right. You can now perform inference with the model from the last training run.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Inference</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            Once a model has been trained, the "Predict" button can be clicked to perform inference
            on the unlabeled cells. Once again, the "All Frames" option will dictate whether this is
            done on the current frame or across all frames.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PlottingTrainingInstructions;
