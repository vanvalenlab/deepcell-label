// Canvas when adding cells to a cell type

import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const white = [1, 1, 1, 1];

function AddCellTypeCanvas({ setBitmaps }) {
  const editCellTypes = useEditCellTypes();
  const cell = useSelector(editCellTypes, (state) => state.context.cell);

  if (!cell) {
    return null;
  }

  return <OutlineCellCanvas setBitmaps={setBitmaps} cell={cell} color={white} />;
}

export default AddCellTypeCanvas;
