import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useSelector } from '@xstate/react';
import { useCellTypes } from '../../../ProjectContext';

function CellCountIndicator({ id }) {

    const cellTypes = useCellTypes();

    const cellTypeList = useSelector(cellTypes, (state) => state.context.cellTypes);
    const cellType = cellTypeList.filter(cellType => cellType.id === id)[0];
    const numCells = cellType.cells.length;
    
    let paperStyle = {
        position: 'absolute',
        height: 23,
        width: 23,
        backgroundColor: 'rgba(0,0,50,0.05)',
        marginLeft: 27,
        marginTop: 0.6,
        display: 'flex',
    };

    if (numCells > 999) {
        paperStyle.width = 30;
    };

    return (
        <Paper sx={paperStyle}>
            <Typography sx={{margin: 'auto', fontSize: 12}}>
            {numCells}
            </Typography>
        </Paper>
    );
}

export default CellCountIndicator;