import Checkbox from '@mui/material/Checkbox';
import { useEditCellTypes } from '../../../ProjectContext';

const checkStyle = {
  marginTop: 40,
  marginBottom: 5,
}

function CellTypeCheckbox(props) {

    const { color, id, openColor, toggleArray, setToggleArray } = props;
    const editCellTypes = useEditCellTypes();
    const isOn = toggleArray[id];

    const handleCheck = () => { 
      // Handle MUI bug where checkbox is invisible above color popper
      if (!openColor) {
        editCellTypes.send({type: 'TOGGLE', cellType: id});
        setToggleArray(toggleArray.map((t, i) => i == id ? !isOn : t));
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
