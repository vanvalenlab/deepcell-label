import PreviewIcon from '@mui/icons-material/Preview';
import { IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { useRaw } from '../../../../ProjectContext';

function ViewChannelsButton(props) {
  const { matchedChannels } = props;
  const raw = useRaw();

  const handleGetChannels = (channels) => {
    if (channels.length > 0) {
      raw.send({ type: 'FETCH_LAYERS', channels: channels });
    }
  };

  return (
    <Tooltip title='Open Channels' enterDelay={500} enterNextDelay={500}>
      <IconButton
        onClick={() => handleGetChannels(matchedChannels)}
        disabled={!matchedChannels}
        sx={{ width: '100%', borderRadius: 1 }}
      >
        <PreviewIcon
          sx={{
            fontSize: 18,
          }}
        />
      </IconButton>
    </Tooltip>
  );
}

export default ViewChannelsButton;
