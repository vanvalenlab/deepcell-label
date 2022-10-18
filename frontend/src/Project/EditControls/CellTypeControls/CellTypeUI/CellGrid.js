import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, IconButton } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useEditCellTypes } from '../../../ProjectContext';
import Cell from './Cell';


function CellGrid(props) {
    const { id, color, name, cells } = props;
    const editCellTypesRef = useEditCellTypes();
    const [remove, setRemove] = useState(-1);
    const addingCell = useSelector(editCellTypesRef, (state) => state.matches('addingCell'));

    const handleAdd = () => {
        if (addingCell) {
            editCellTypesRef.send({ type: 'RESET' });
        }
        else {
            editCellTypesRef.send({ type: 'ADD', cellType: id, color: color, name: name });
        }
    };

    const handleRemoveCell = (cell) => () => {
        editCellTypesRef.send({ type: 'REMOVE_ONE', cellType: id, cell: cell });
    };

    return (
        <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
            {cells.map((cell) => 
                <Box 
                    gridColumn="span 1"
                    key={cell}
                    onMouseEnter={() => setRemove(cell)}
                    onMouseLeave={() => setRemove(-1)}
                >
                    <Cell cell={cell}/>
                        <IconButton
                            sx={{ position: 'relative', top: -55, left: 34,  p: 0 }}
                            size='small'
                            onClick={handleRemoveCell(cell)}
                        >
                        { remove === cell
                            ? <ClearIcon/>
                            : <ClearIcon sx={{opacity: 0, '&:hover': {opacity: 100}}}/>
                        }
                        </IconButton>
                </Box>)
            }
            <Box gridColumn="span 1">
                <IconButton onClick={handleAdd}>
                    { addingCell
                        ? <CheckCircleOutlineIcon />
                        : <AddCircleOutlineIcon />
                    }
                </IconButton>
            </Box>
        </Box>
    );
};

export default CellGrid;
