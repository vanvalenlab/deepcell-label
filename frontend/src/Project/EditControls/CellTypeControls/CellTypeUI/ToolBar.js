import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import SpeakerNotesTwoToneIcon from '@mui/icons-material/SpeakerNotesTwoTone';
import { Grid, IconButton } from '@mui/material';
import AddCellTypeLabel from './AddCellTypeLabel';
import OpenMarkerPanel from './OpenMarkerPanel';

function ToolBar(props) {
  return (
    <Grid sx={props.sx} container spacing={1}>
      <Grid item xs={3}>
        <AddCellTypeLabel toggleArray={props.toggleArray} setToggleArray={props.setToggleArray} />
      </Grid>
      <Grid item xs={3}>
        <OpenMarkerPanel />
      </Grid>
      <Grid item xs={3}>
        <IconButton color='primary' sx={{ width: '100%', borderRadius: 1 }}>
          <LayersTwoToneIcon />
        </IconButton>
      </Grid>
      <Grid item xs={3}>
        <IconButton color='primary' sx={{ width: '100%', borderRadius: 1 }}>
          <SpeakerNotesTwoToneIcon />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default ToolBar;
