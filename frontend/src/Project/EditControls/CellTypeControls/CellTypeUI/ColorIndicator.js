import { Box, IconButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper from '@mui/material/Popper';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import ColorizeIcon from '@mui/icons-material/Colorize';
import { TwitterPicker } from 'react-color';
import { useRef, useState } from 'react';
import { useEditCellTypes } from '../../../ProjectContext';

const colorStyle = {
    position: 'absolute',
    marginTop: -6.2,
    marginLeft: -9.7,
    marginBottom: 10,
}

function ColorIndicator(props) {
    const { id, color, openColor, toggleColor } = props;
    
    const editCellTypesRef = useEditCellTypes();
    const anchorRef = useRef(null);
    const [editIcon, setEditIcon] = useState(0);

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

    // Handler to ensure click away and hotkeys don't get used
    const handlePopper = (event) => {
        event.stopPropagation();
    };

    return (
        <Box style={colorStyle}>
            <IconButton 
                onClick={handleClickColor}
                ref={anchorRef}
                onMouseEnter={() => setEditIcon(100)}
                onMouseLeave={() => setEditIcon(0)}
                size='large'
            > 
            <SquareRoundedIcon sx = {{
                position: 'absolute',
                fontSize: 35,
                color: color,
                }}
            />
            <ColorizeIcon 
                sx = {{
                    position: 'relative',
                    color: 'white',
                    fontSize: 20,
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

export default ColorIndicator;
