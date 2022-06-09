import { useSelector } from '@xstate/react';
import { useReplace } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

function ReplaceCanvas({ setCanvases }) {
  const replace = useReplace();
  const cell = useSelector(replace, (state) => state.context.replaceCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setCanvases={setCanvases} cell={cell} />;
}

export default ReplaceCanvas;
