import { useSelector } from '@xstate/react';
import { useReplace } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const red = [1, 0, 0, 1];

function ReplaceCanvas({ setBitmaps }) {
  const replace = useReplace();
  const cell = useSelector(replace, (state) => state.context.replaceCell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setBitmaps={setBitmaps} cell={cell} color={red} />;
}

export default ReplaceCanvas;
