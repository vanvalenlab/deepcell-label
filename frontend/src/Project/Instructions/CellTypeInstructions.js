import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';

function CellTypeInstructions() {
  return (
    <Box>
      <Typography>
        Assign cell types to the segmentation with the Cell Types tab.
        <br />
        One specifies the cell type labels for each feature independently.
      </Typography>
      <br />
      <Typography variant='h5'>Adding a Cell Type</Typography>
      <Typography>
        Click the "Add Cell Type" button and select the color you want associated with the cell type.
        <ul>
          <li>
            Clicking the 3 dots on the right of each cell type card allows you to edit the name of the cell type or delete the cell type.
          </li>
          <li>
            Clicking the color indicator square on the left of each card allows you to edit the associated color of the cell type.
          </li>
        </ul>
      </Typography>
      <Typography variant='h5'>Labeling Cells with a Cell Type</Typography>
      <Typography>
        Click the card associated with the cell type you want to add cells to. This expands the card to give you a list of cells labeled with that type.
        <ul>
          <li>
            Click the "Add Cells" button to enter Add Mode, where clicking any cell on the canvas twice will label that cell.
          </li>
          <li>
            Click the "Remove Cells" button to enter Remove Mode, where clicking any cell twice will remove the label from that cell.
          </li>
          <li>
            Click the "Done" button or hit <kbd>Esc</kbd> to exit either mode.
          </li>
        </ul>
      </Typography>
      <br />
    </Box>
  );
}

export default CellTypeInstructions;
