import { useSelector } from '@xstate/react';
import { useSwap } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const red = [1, 0, 0, 1];

function SwapCanvas({ setBitmaps }) {
  const swap = useSwap();
  const cell = useSelector(swap, (state) => state.context.swapCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setBitmaps={setBitmaps} cell={cell} color={red} />;
}

export default SwapCanvas;
