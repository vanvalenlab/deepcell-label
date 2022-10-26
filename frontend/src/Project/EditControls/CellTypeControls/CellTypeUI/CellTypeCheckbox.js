import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes, useEditCellTypes } from '../../../ProjectContext';

const checkStyle = {
  marginTop: 40,
  marginBottom: 5,
}

function CellTypeCheckbox({ color, id, openColor }) {

    const editCellTypes = useEditCellTypes();
    const cellTypes = useCellTypes();
    const isOnArray = useSelector(cellTypes, (state) => state.context.isOn);
    const [isOn, setIsOn] = useState(isOnArray[id]);

    const handleCheck = () => {
      // Handle MUI bug where checkbox is invisible above color popper
      if (!openColor) {
        editCellTypes.send({type: 'TOGGLE', cellType: id});
        setIsOn(!isOn);
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
