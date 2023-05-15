import { Grid } from '@mui/material';
import Chip from '@mui/material/Chip';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../../ProjectContext';
import { hexToRgb } from '../../../../service/labels/cellTypesMachine';

function ColoredChannelChip({ layer, matchedChannels }) {
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const channel = useSelector(layer, (state) => state.context.channel);
  const color = useSelector(layer, (state) => state.context.color);
  const rgb = hexToRgb(color);
  const backgroundColor = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.2)`;
  const textColor = `rgba(${rgb[0] * 150},${rgb[1] * 150},${rgb[2] * 150}, 1)`;

  return matchedChannels.includes(channel) ? (
    <Grid item xs={3}>
      <Chip
        size='small'
        label={channelNames[channel]}
        sx={{
          width: '100%',
          fontWeight: 500,
          color: textColor,
          backgroundColor: backgroundColor,
        }}
      />
    </Grid>
  ) : null;
}

export default ColoredChannelChip;
