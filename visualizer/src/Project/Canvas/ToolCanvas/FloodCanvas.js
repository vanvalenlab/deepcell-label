import { useSelector } from '@xstate/react';
import { useFlood } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const red = [1, 0, 0, 1];

function FloodCanvas({ setCanvases }) {
  const flood = useFlood();
  const cell = useSelector(flood, (state) => state.context.floodCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setCanvases={setCanvases} cell={cell} color={red} />;
}

export default FloodCanvas;
