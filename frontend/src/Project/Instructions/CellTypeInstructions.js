import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import ColorizeIcon from '@mui/icons-material/Colorize';
import CreateNewFolderTwoToneIcon from '@mui/icons-material/CreateNewFolderTwoTone';
import EggAltIcon from '@mui/icons-material/EggAlt';
import HighlightTwoToneIcon from '@mui/icons-material/HighlightTwoTone';
import LayersClearTwoToneIcon from '@mui/icons-material/LayersClearTwoTone';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PreviewIcon from '@mui/icons-material/Preview';
import SpeakerNotesTwoToneIcon from '@mui/icons-material/SpeakerNotesTwoTone';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import TableChartTwoToneIcon from '@mui/icons-material/TableChartTwoTone';
import { Box, Grid, IconButton } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

function CellTypeInstructions() {
  const [editIcon, setEditIcon] = useState(0);
  return (
    <Box>
      <Typography>
        Assign cell types to segmented cells with the Cell Types tab.
        <br />
        One specifies the cell type labels for each feature (segmentation mask) independently.
        <br />
        Note that this labeling feature is still{' '}
        <b style={{ color: 'red' }}>very much in development</b>. A list of current features and
        notable limitations and such is documented here.
      </Typography>
      <br />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant='h5'>Important Limitations / Notes</Typography>
          <ul>
            <li>
              {' '}
              Overlaps are not supported for cell type editing due to optimization issues. Make sure
              that your data is in a format such that the segmentation mask pixels have a 1 to 1
              mapping with cell IDs.{' '}
            </li>
            <li>
              Cells can be added to multiple cell types. Be careful not to unintentionally do this,
              as the canvas cannot render mixes particularly intuitively. This is especially
              important if you use the training functionality, as this will assume that every cell
              belongs to one class.
            </li>
          </ul>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h5'>Cell Type Controls</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            Controls for manually annotating cell type labels can be found on the left side panel.{' '}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Adding, Editing, and Removing Cell Types</Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton color='primary' sx={{ width: '100%', boxShadow: 1, borderRadius: 1 }}>
            <CreateNewFolderTwoToneIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Add Cell Type</b> button and select the color you want associated with the
            cell type.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <MoreVertIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Clicking the 3 dots on the right of each cell type card allows you to <b>edit</b> the
            name of the cell type or <b>delete</b> the cell type.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton
            onMouseEnter={() => setEditIcon(100)}
            onMouseLeave={() => setEditIcon(0)}
            size='large'
            sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}
          >
            <SquareRoundedIcon
              sx={{
                position: 'absolute',
                fontSize: 35,
                color: 'rgb(50,230,100)',
              }}
            />
            <ColorizeIcon
              sx={{
                position: 'relative',
                color: 'white',
                fontSize: 20,
                opacity: editIcon,
              }}
            />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Clicking the <b>color indicator</b> square on the left of each card allows you to edit
            the associated color of the cell type.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Tool Bar</Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton color='primary' sx={{ width: '100%', boxShadow: 1, borderRadius: 1 }}>
            <TableChartTwoToneIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Open Marker Panel</b> button to open a modal that shows a default (and
            editable) panel mapping cell types to channels.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton color='primary' sx={{ width: '100%', boxShadow: 1, borderRadius: 1 }}>
            <LayersClearTwoToneIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Overwrite Mode</b> button to toggle whether adding a cell type to a labeled
            cell overwrites or allows for multi-labels.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton color='primary' sx={{ width: '100%', boxShadow: 1, borderRadius: 1 }}>
            <SpeakerNotesTwoToneIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Hover Toggle</b> button to toggle whether a cell type tooltip shows when
            hovering over cells.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton color='primary' sx={{ width: '100%', boxShadow: 1, borderRadius: 1 }}>
            <HighlightTwoToneIcon />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Highlight Multi-labels</b> button to select and highlight all cells with
            multi-labels.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Labeling Cells</Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <EggAltIcon sx={{ fontSize: 16 }} />
            <AddIcon
              sx={{
                position: 'absolute',
                fontSize: 10,
                marginBottom: '-1.5em',
                marginRight: '-2em',
              }}
            />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Add Cells</b> button to enter Add Mode, where clicking any cell on the
            canvas twice will label that cell to the opened cell type.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <EggAltIcon sx={{ fontSize: 16 }} />
            <ClearIcon
              sx={{
                position: 'absolute',
                fontSize: 10,
                marginBottom: '-1.5em',
                marginRight: '-2em',
              }}
            />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Remove Cells</b> button to enter Remove Mode, where clicking any cell twice
            will remove the cell from the opened cell type.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: 0.5 }}>
            Click the <b>Done</b> button or hit <kbd>Esc</kbd> to exit either mode.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <ManageSearchIcon
              sx={{
                fontSize: 18,
              }}
            />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: -0.5 }}>
            To aid with cell type labeling, the <b>Match Markers</b> button will attempt to fuzzy
            match the name of the cell type with a hard-coded marker panel and its corresponding
            positive channels that are present in the current image.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <IconButton sx={{ width: '100%', borderRadius: 1, boxShadow: 1 }}>
            <PreviewIcon
              sx={{
                fontSize: 18,
              }}
            />
          </IconButton>
        </Grid>
        <Grid item xs={11}>
          <Typography sx={{ marginTop: -0.5 }}>
            If the matched cell type name and channels look correct, click the <b>Open Channels</b>{' '}
            button to automatically open the expected marker positive channels for the current
            image.
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h6'>Other Cell Type Components</Typography>
        </Grid>
        <Grid item xs={1}>
          <Checkbox
            defaultChecked
            sx={{
              width: '100%',
              color: 'rgb(50,230,100)',
              '&.Mui-checked': {
                color: 'rgb(50,230,100)',
              },
              borderRadius: 1,
              boxShadow: 1,
            }}
          />
        </Grid>
        <Grid item xs={11}>
          <Typography>
            The <b>cell type toggle</b> controls whether a color is displayed on the canvas or not.{' '}
            <br />
            There is also a <b>Toggle All</b> button to perform this operation across all cell
            types.
          </Typography>
        </Grid>
        <Grid item xs={1} sx={{ display: 'flex' }}>
          <Slider
            defaultValue={50}
            sx={{
              width: '100%',
              color: 'rgb(50,230,100)',
              '& .MuiSlider-thumb': {
                height: 15,
                width: 15,
              },
            }}
            size='small'
          />
        </Grid>
        <Grid item xs={11}>
          <Typography>
            Adjust the <b>opacity slider</b> to specify the opacity of a specific cell type on the
            canvas from 10% to 80%. Outlines will remain at 100%.
          </Typography>
        </Grid>
        <Grid item xs={1}>
          <Chip size='small' label={100} sx={{ width: '100%' }} />
        </Grid>
        <Grid item xs={11}>
          <Typography>
            The <b>cell count indicator</b> represents the number of cells in a given cell type
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CellTypeInstructions;
