import { Box, FormLabel, Grid, Typography } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useCellTypes, useEditCellTypes, useSelectedCell } from '../../../ProjectContext';
import CellTypeChip from '../CellTypeUI/CellTypeAccordion/CellTypeChip';
import AddCellTypeChip from './AddCellTypeChip';

function CellInfo() {
  const selected = useSelectedCell();
  const editCellTypes = useEditCellTypes();
  const cellTypes = useCellTypes();
  const feature = useSelector(cellTypes, (state) => state.context.feature);
  const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes);
  const currentCellTypes = cellTypesList.filter((cellType) => cellType.feature === feature);
  const selectedCellTypes = currentCellTypes.filter((cellType) =>
    cellType.cells.includes(selected)
  );

  const handleDelete = (cellType) => {
    editCellTypes.send({ type: 'REMOVE_LABEL', cell: selected, cellType: cellType });
  };

  return (
    <>
      <Grid item display='flex'>
        <Box>
          <FormLabel sx={{ display: 'inline-block', mr: 1, fontSize: 14 }}>
            Selected Cell:
          </FormLabel>
          <Typography sx={{ display: 'inline-block', fontWeight: 'bold' }}>
            {selected > 0 ? selected : null}
          </Typography>
        </Box>
      </Grid>
      <Grid item display='flex'>
        <FormLabel sx={{ width: '20%', mt: 0.4, fontSize: 14 }}>Label:</FormLabel>
        <Grid container direction='row' spacing={1}>
          {selectedCellTypes.map((cellType, i) => (
            <Grid item key={i}>
              <CellTypeChip
                name={cellType.name}
                color={cellType.color}
                onDelete={() => handleDelete(cellType.id)}
              />
            </Grid>
          ))}
          <Grid item xs={5}>
            {selected > 0 ? <AddCellTypeChip /> : null}
          </Grid>
        </Grid>
      </Grid>
      <Grid item>
        <FormLabel sx={{ fontSize: 14 }}>Expressions:</FormLabel>
      </Grid>
    </>
  );
}

export default CellInfo;
