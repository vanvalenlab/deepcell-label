import { useSelector } from '@xstate/react';
import OutlineCellCanvas from './OutlineCellCanvas';

function FloodCanvas({ setCanvases }) {
  const flood = useFlood();
  const cell = useSelector(flood, (state) => state.context.floodedCell);

  return <OutlineCellCanvas setCanvases={setCanvases} cell={cell} />;
}

export default FloodCanvas;
