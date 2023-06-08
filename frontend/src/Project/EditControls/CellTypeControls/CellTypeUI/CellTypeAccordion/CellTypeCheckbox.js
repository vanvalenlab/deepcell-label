import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { useCellTypes, useEditCellTypes } from '../../../../ProjectContext';

const checkStyle = {
  marginTop: 40,
  marginBottom: 5,
};

function CellTypeCheckbox(props) {
  const { color, id, openColor } = props;
  const editCellTypes = useEditCellTypes();
  const cellTypes = useCellTypes();
  const isOn = useSelector(cellTypes, (state) => state.context.isOn)[id];

  const handleCheck = () => {
    // Handle MUI bug where checkbox is invisible above color popper
    if (!openColor) {
      editCellTypes.send({ type: 'TOGGLE', cellType: id });
    }
  };

  const handleClick = (evt) => {
    evt.stopPropagation();
  };

  return (
    <div style={checkStyle}>
      <Checkbox
        onChange={handleCheck}
        onClick={handleClick}
        checked={isOn}
        sx={{
          color: color,
          '&.Mui-checked': {
            color: color,
          },
          p: 0,
        }}
      />
    </div>
  );
}

export default CellTypeCheckbox;
