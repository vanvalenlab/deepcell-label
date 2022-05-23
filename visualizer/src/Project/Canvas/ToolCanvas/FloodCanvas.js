import { useSelector } from '@xstate/react';
import { useFlood } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

function FloodCanvas({ setCanvases }) {
  const flood = useFlood();
  const cell = useSelector(flood, (state) => state.context.floodedCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setCanvases={setCanvases} cell={cell} />;
}

export default FloodCanvas;
