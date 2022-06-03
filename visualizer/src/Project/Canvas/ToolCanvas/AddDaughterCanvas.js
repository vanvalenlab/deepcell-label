import { useSelector } from '@xstate/react';
import { useEditDivisions } from '../../ProjectContext';
import OutlineCellCanvas from './OutlineCellCanvas';

const white = [1, 1, 1, 1];

function AddDaughterCanvas({ setCanvases }) {
  const editDivisions = useEditDivisions();
  const daughter = useSelector(editDivisions, (state) => state.context.daughter);

  if (!daughter) {
    return null;
  }

  return <OutlineCellCanvas setCanvases={setCanvases} cell={daughter} color={white} />;
}

export default AddDaughterCanvas;
