import { Box, Typography, Paper } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { useCellTypeList, useHovering } from '../../../ProjectContext';

const getCellTypeList = (cell, cellTypes) => {
	const numCellTypes = cellTypes.length;
	let types = [];
	for (let i = 0; i < numCellTypes; i++) {
		if (cellTypes[i].cells.includes(cell)) {
			types.push(cellTypes[i]);
		}
	}
	return types;
}

function CellTypeHovering() {
  const cells = useHovering();
  const cellTypes = useCellTypeList();

  const noCells = !cells || cells.length === 0;

  return (
    noCells ? (
      <Box sx={{visibility: 'hidden' }}/>
    ) : (
      <Paper sx={{minWidth: 100, wordWrap: 'break-word'}}>
          {cells.map((cell) => (
              getCellTypeList(cell, cellTypes).map((type) => (
                <Box>
                  <CircleIcon sx={{ fontSize: 10, color: type.color, display: 'inline-block', marginBottom: 0.11, marginLeft: 0.5, marginRight: 0.75 }}/>
                  <Typography key={type.id} sx={{ fontSize: 11, display: 'inline', position: 'relative', top: -2 }}>
                    {type.name} ({cell})
                  </Typography>
                  <br/>
                </Box>
                ))
            ))}
      </Paper>
    )
  );
}

export default CellTypeHovering;
