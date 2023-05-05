import Chip from '@mui/material/Chip';
import { useSelector } from '@xstate/react';
import { useRaw } from '../../../../ProjectContext';

function ChannelChip({ channel }) {
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);

  return (
    <Chip
      size='small'
      label={channelNames[channel]}
      sx={{
        width: '100%',
        fontWeight: 500,
      }}
    />
  );
}

export default ChannelChip;
