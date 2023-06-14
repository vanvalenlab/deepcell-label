import { FormLabel, Grid } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useCellTypes, useSelectedCell } from '../../../ProjectContext';
import AddCellTypeChip from './AddCellTypeChip';
import CellLabelChip from './CellLabelChip';
import CellNavigation from './CellNavigation';

function CellInfo() {
  const selected = useSelectedCell();
  const cellTypes = useCellTypes();
  const feature = useSelector(cellTypes, (state) => state.context.feature);
  const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes);
  const currentCellTypes = cellTypesList.filter((cellType) => cellType.feature === feature);
  const selectedCellTypes = currentCellTypes.filter((cellType) =>
    cellType.cells.includes(selected)
  );

  return (
    <>
      <Grid item display='flex'>
        <CellNavigation currentCellTypes={currentCellTypes} />
      </Grid>
      <Grid item display='flex'>
        <FormLabel sx={{ width: '20%', mt: 0.4, fontSize: 14 }}>Label:</FormLabel>
        <Grid container direction='row' spacing={1}>
          {selectedCellTypes.map((cellType, i) => (
            <Grid item key={i}>
              <CellLabelChip name={cellType.name} color={cellType.color} id={cellType.id} />
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
