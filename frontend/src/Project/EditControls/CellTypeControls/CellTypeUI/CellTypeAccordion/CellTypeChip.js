import { Chip } from '@mui/material';
import { hexToRgb } from '../../../../service/labels/cellTypesMachine';

function CellTypeChip({ name, color }) {
  const rgb = hexToRgb(color);
  const backgroundColor = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.2)`;
  const textColor = `rgba(${rgb[0] * 200},${rgb[1] * 200},${rgb[2] * 200}, 1)`;

  return (
    <Chip
      label={name}
      size='small'
      style={{ minWidth: '4.6em' }}
      sx={{
        color: textColor,
        backgroundColor: backgroundColor,
        fontWeight: 500,
      }}
    />
  );
}

export default CellTypeChip;
