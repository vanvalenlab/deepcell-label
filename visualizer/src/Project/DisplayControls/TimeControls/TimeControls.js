import { FormLabel } from '@mui/material';
import { Box } from '@mui/system';
import { useHovering, useOtherSelectedCell, useSelectedCell } from '../../ProjectContext';
import CellTimeline from './CellTimeline';
import TimeSlider from './TimeSlider';

function TimeControls() {
  const cell = useSelectedCell();
  const hoveringCells = useHovering();
  const otherCell = useOtherSelectedCell();

  let numCells = hoveringCells.length + 1;
  if (otherCell) {
    numCells += 1;
  }
  const height = '0.5rem';

  return (
    <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
      <FormLabel>Time</FormLabel>
      <TimeSlider />
      <CellTimeline cell={cell} height={height} />
      {hoveringCells.map((c) => (
        <CellTimeline cell={c} height={height} key={c} />
      ))}
      {/* Reserve space for 3 timelines*/}
      {numCells < 3 && <Box sx={{ height: `calc(${3 - numCells} * ${height})` }} />}
      {!!otherCell && <CellTimeline cell={otherCell} />}
    </Box>
  );
}

export default TimeControls;
