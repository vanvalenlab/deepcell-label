import Chip from '@mui/material/Chip';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../ProjectContext';

function ColoredChannelChip({ matchedChannels, layer }) {
  const channel = useSelector(layer, (state) => state.context.layer);
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const color = useSelector(layer, (state) => state.context.color);

  return matchedChannels.includes(channel) ? (
    <Chip
      size='small'
      variant='outlined'
      label={channelNames[channel]}
      sx={{ color: color, borderColor: color }}
    />
  ) : null;
}

export default ColoredChannelChip;
