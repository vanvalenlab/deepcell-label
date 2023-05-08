import { Grid } from '@mui/material';
import AddCellTypeLabel from './ToolBar/AddCellTypeLabel';
import HoverToggle from './ToolBar/HoverToggle';
import ModeToggle from './ToolBar/ModeToggle';
import OpenMarkerPanel from './ToolBar/OpenMarkerPanel';

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
        <ModeToggle />
      </Grid>
      <Grid item xs={3}>
        <HoverToggle />
      </Grid>
    </Grid>
  );
}

export default ToolBar;
