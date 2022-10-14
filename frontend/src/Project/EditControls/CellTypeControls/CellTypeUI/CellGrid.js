import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { useState } from 'react';
import { useEditCellTypes } from '../../../ProjectContext';
import Cell from './Cell';


function EditNameField(props) {
    const { id, name, cells } = props;
    const editCellTypesRef = useEditCellTypes();
    const [remove, setRemove] = useState(-1);

    const handleAdd = () => {
        editCellTypesRef.send({ type: 'ADD', cellType: id, name: name });
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
                            : <ClearIcon sx={{opacity: 0}}/>
                        }
                        </IconButton>
                </Box>)
            }
            <Box gridColumn="span 1">
                <IconButton onClick={handleAdd}>
                    <AddCircleOutlineIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default EditNameField;
