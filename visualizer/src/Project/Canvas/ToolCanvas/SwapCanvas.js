import { useSelector } from '@xstate/react';
import { useSwap } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

function SwapCanvas({ setCanvases }) {
  const swap = useSwap();
  const cell = useSelector(swap, (state) => state.context.swapCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setCanvases={setCanvases} cell={cell} />;
}

export default SwapCanvas;
