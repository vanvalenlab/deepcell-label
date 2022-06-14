import { useSelector } from '@xstate/react';
import { useFlood } from '../../ProjectContext';
import OuterOutlineCanvas from './OuterOutlineCanvas';
import OutlineCellCanvas from './OutlineCellCanvas';

const red = [1, 0, 0, 1];

function FloodCanvas({ setBitmaps }) {
  const flood = useFlood();
  const cell = useSelector(flood, (state) => state.context.floodCell);
  const selected = useSelector(flood, (state) => state.context.selected);

  if (!cell) {
    return null;
  }

  if (cell === selected) {
    return <OuterOutlineCanvas setBitmaps={setBitmaps} cell={cell} color={red} />;
  }

  return <OutlineCellCanvas setBitmaps={setBitmaps} cell={cell} color={red} />;
}

export default FloodCanvas;
