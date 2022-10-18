import { Box, IconButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import EditIcon from '@mui/icons-material/Edit';
import Popper from '@mui/material/Popper';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import { TwitterPicker } from 'react-color';
import { useReducer, useRef, useState } from 'react';
import { useEditCellTypes } from '../../../ProjectContext';

function EditNameField(props) {
    const { id, color } = props;
    const editCellTypesRef = useEditCellTypes();
    const anchorRef = useRef(null)
    const [editIcon, setEditIcon] = useState(0);
    const [openColor, toggleColor] = useReducer((v) => !v, false);

    // Handler for when the color box is clicked
    const handleClickColor = (e) => {
        e.stopPropagation();
        toggleColor(); 
    };

    // Handler for when the color is changed
    const handleColor = (color, event) => {
        event.stopPropagation();
        editCellTypesRef.send({ type: 'COLOR', cellType: id, color: color.hex });
        toggleColor();
    }

    // Handler to ensure hotkeys don't get used + Enter to finish typing
    const handlePopper = (event) => {
        event.stopPropagation();
    };

    return (
        <Box sx={{position: 'relative', right: 15, bottom: 9}}>
            <IconButton 
                onClick={handleClickColor}
                ref={anchorRef}
                sx = {{
                position: 'relative',
                }}
                onMouseEnter={() => setEditIcon(100)}
                onMouseLeave={() => setEditIcon(0)}
            > 
            <SquareRoundedIcon sx = {{
                left: 0,
                fontSize: 35,
                color: color,
                }}
            />
            <EditIcon 
                sx = {{
                    position: 'absolute',
                    color: 'white',
                    fontSize: 18,
                    opacity: editIcon,
                }}   
            />
            </IconButton> 
            <Popper open={openColor} anchorEl={anchorRef.current} placement='bottom-start'>
                <ClickAwayListener onClickAway={toggleColor}>
                    <div onKeyDown={handlePopper} onClick={handlePopper}>
                        <TwitterPicker
                            color={ color }
                            onChange={ handleColor }
                        />
                    </div>
                </ClickAwayListener>
            </Popper>
        </Box>
    );
};

export default EditNameField;
