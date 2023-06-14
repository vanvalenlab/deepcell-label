import { Chip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEditCellTypes, useSelectedCell } from '../../../ProjectContext';
import { hexToRgb } from '../../../service/labels/cellTypesMachine';

function CellLabelChip({ name, color, id }) {
  const editCellTypes = useEditCellTypes();
  const selected = useSelectedCell();
  const cellTypeOpen = useSelector(editCellTypes, (state) => state.context.cellTypeOpen);
  const rgb = hexToRgb(color);
  const backgroundColor = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.2)`;
  const textColor = `rgba(${rgb[0] * 200},${rgb[1] * 200},${rgb[2] * 200}, 1)`;

  // Open the cellType on click
  const handleClick = () => {
    editCellTypes.send({ type: 'SET_CELLTYPE_OPEN', cellType: id, name: name });
  };

  // Remove the selected cell from the cellType
  const handleDelete = () => {
    editCellTypes.send({ type: 'REMOVE_LABEL', cell: selected, cellType: id });
  };

  return (
    <Chip
      label={name}
      size='small'
      style={{ minWidth: '4.6em' }}
      onClick={handleClick}
      onDelete={handleDelete}
      sx={{
        // 1.5 border of textcolor if selected, otherwise no border
        border: cellTypeOpen === id ? `1.5px solid ${textColor}` : 'none',
        color: textColor,
        backgroundColor: backgroundColor,
        fontWeight: 500,
        '& .MuiChip-deleteIcon': {
          '&:hover': {
            color: textColor,
          },
          color: color,
        },
        '&:hover': {
          backgroundColor: backgroundColor,
        },
      }}
    />
  );
}

export default CellLabelChip;
