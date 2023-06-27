import { Grid } from '@mui/material';
import AddCellTypeLabel from './ToolBar/AddCellTypeLabel';
import HighlightMultiLabel from './ToolBar/HighlightMultiLabel';
import HoverToggle from './ToolBar/HoverToggle';
import ModeToggle from './ToolBar/ModeToggle';
import OpenMarkerPanel from './ToolBar/OpenMarkerPanel';

function ToolBar(props) {
  return (
    <Grid sx={props.sx} container spacing={1}>
      <Grid item xs={2.4}>
        <AddCellTypeLabel />
      </Grid>
      <Grid item xs={2.4}>
        <OpenMarkerPanel />
      </Grid>
      <Grid item xs={2.4}>
        <ModeToggle />
      </Grid>
      <Grid item xs={2.4}>
        <HoverToggle />
      </Grid>
      <Grid item xs={2.4}>
        <HighlightMultiLabel />
      </Grid>
    </Grid>
  );
}

export default ToolBar;
