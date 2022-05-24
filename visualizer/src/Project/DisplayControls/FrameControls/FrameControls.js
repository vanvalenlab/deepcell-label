import { FormLabel } from '@mui/material';
import { Box } from '@mui/system';
import { useSelector } from '@xstate/react';
import { useHoveringCells, useOtherSelectedCell, useSelect } from '../../ProjectContext';
import CellTimeline from './CellTimeline';
import FrameSlider from './FrameSlider';

function FrameControls() {
  const select = useSelect();
  const cell = useSelector(select, (state) => state.context.selected);
  const hoveringCells = useHoveringCells();
  const otherCell = useOtherSelectedCell();

  let numCells = hoveringCells.length + 1;
  if (otherCell) {
    numCells += 1;
  }

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel>Frame</FormLabel>
      <FrameSlider />
      <CellTimeline cell={cell} />
      {hoveringCells.map((c) => (
        <CellTimeline cell={c} key={c} />
      ))}
      {/* Render hidden timelines to reserve space for them */}
      {numCells < 3 &&
        Array(3 - numCells)
          .fill(0)
          .map((_, i) => (
            <Box sx={{ visibility: 'hidden' }} key={i}>
              <CellTimeline cell={cell} />
            </Box>
          ))}
      {!!otherCell && <CellTimeline cell={otherCell} />}
    </Box>
  );
}

export default FrameControls;
