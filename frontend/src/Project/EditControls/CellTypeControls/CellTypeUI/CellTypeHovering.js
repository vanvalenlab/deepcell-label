import { Box, Typography, Paper } from '@mui/material';
import equal from 'fast-deep-equal';
import CircleIcon from '@mui/icons-material/Circle';
import { useSelector } from '@xstate/react';
import { useCanvas, useCellTypes, useHovering } from '../../../ProjectContext';

const getCellTypeList = (cell, cellTypes) => {
  const numCellTypes = cellTypes.length;
  let types = [];
  for (let i = 0; i < numCellTypes; i++) {
    if (cellTypes[i].cells.includes(cell)) {
      types.push(cellTypes[i]);
    }
  }
  return types;
};

function CellTypeHovering() {
  const cells = useHovering();
  const cellTypesRef = useCellTypes();
  const canvas = useCanvas();
  const cellTypes = useSelector(cellTypesRef, (state) => state.context.cellTypes);
  const feature = useSelector(cellTypesRef, (state) => state.context.feature);
  const currentCellTypes = cellTypes.filter((cellType) => cellType.feature === feature);

  const { sx, sy, x, y, width, height, zoom, scale } = useSelector(
    canvas,
    (state) => {
      const { sx, sy, x, y, width, height, zoom, scale } = state.context;
      return { sx, sy, x, y, width, height, zoom, scale };
    },
    equal
  );

  const noCells = !cells || cells.length === 0;

  return (
    <div
      style={{
        width: 130,
        position: 'relative',
        top: (y - sy) * zoom * scale,
        left: (x - sx) * zoom * scale,
        pointerEvents: 'none',
        zIndex: 1500,
      }}
    >
      {noCells || x === 0 || x === width - 1 || y === 0 || y === height - 1 ? null : (
        <Paper sx={{ wordWrap: 'break-word' }}>
          {cells.map((cell) =>
            getCellTypeList(cell, currentCellTypes).map((type) => (
              <Box key={type.id}>
                <CircleIcon
                  sx={{
                    fontSize: 10,
                    color: type.color,
                    display: 'inline-block',
                    marginBottom: 0.11,
                    marginLeft: 0.5,
                    marginRight: 0.75,
                  }}
                />
                <Typography sx={{ fontSize: 11, display: 'inline', position: 'relative', top: -2 }}>
                  {type.name} ({cell})
                </Typography>
                <br />
              </Box>
            ))
          )}
        </Paper>
      )}
    </div>
  );
}

export default CellTypeHovering;
