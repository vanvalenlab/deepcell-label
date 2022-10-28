import Slider from '@mui/material/Slider';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useCellTypes, useEditCellTypes } from '../../../ProjectContext';

function CellTypeOpacitySlider({ color, id }) {

    const editCellTypes = useEditCellTypes();
    const cellTypes = useCellTypes();
    const opacities = useSelector(cellTypes, (state) => state.context.opacities);
    const [opacity, setOpacity] = useState(opacities[id]);

    const handleChange = (evt, newValue) => {
        editCellTypes.send({ type: 'OPACITY', opacity: newValue, cellType: id })
        setOpacity(newValue);
    };

    const handleDoubleClick = () => {
        editCellTypes.send({ type: 'OPACITY', opacity: 0.3, cellType: id })
        setOpacity(0.3);
    };

    return (
        <Slider 
            value={opacity}
            min={0.1}
            max={0.8}
            step={0.01}
            onClick={(e) => e.stopPropagation()}
            onChange={handleChange}
            onDoubleClick={handleDoubleClick}
            sx={{ position: 'absolute', 
                    width: 100,
                    marginTop: 5,
                    marginLeft: 4.95,
                    color: color,
                    '& .MuiSlider-thumb': { height: 15, width: 15 }
            }}
            size='small'
        />
    );
};

export default CellTypeOpacitySlider;
