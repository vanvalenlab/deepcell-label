import { useSelector } from '@xstate/react';
import { useEditDivisions } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const white = [1, 1, 1, 1];

function AddDaughterCanvas({ setBitmaps }) {
  const editDivisions = useEditDivisions();
  const daughter = useSelector(editDivisions, (state) => state.context.daughter);

  return <OutlineCellCanvas setBitmaps={setBitmaps} cell={daughter} color={white} />;
}

export default AddDaughterCanvas;
