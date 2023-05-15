import { Grid } from '@mui/material';
import Chip from '@mui/material/Chip';
import FormLabel from '@mui/material/FormLabel';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { useState } from 'react';
import { useLayers, useRaw } from '../../../../ProjectContext';
import { hexToRgb } from '../../../../service/labels/cellTypesMachine';
import AddCellsButton from './AddCellsButton';
import ChannelChip from './ChannelChip';
import ColoredChannelChip from './ColoredChannelChip';
import MatchMarkersButton from './MatchMarkersButton';
import RemoveCellsButton from './RemoveCellsButton';
import ViewChannelsButton from './ViewChannelsButton';

function CellAccordionContents(props) {
  const { id, name, color } = props;
  const raw = useRaw();
  const layers = useLayers();
  const openChannels = useSelector(raw, (state) => state.context.layersOpen, equal);
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const [matchedName, setMatchedName] = useState(null);
  const [matchedChannels, setMatchedChannels] = useState([]);
  const matchedClosed = matchedChannels.filter(
    (channel) => !openChannels.includes(channelNames[channel])
  );
  const rgb = hexToRgb(color);
  const backgroundColor = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.2)`;
  const textColor = `rgba(${rgb[0] * 200},${rgb[1] * 200},${rgb[2] * 200}, 1)`;

  return (
    <Grid container spacing={1}>
      <Grid item xs={3} align='center'>
        <AddCellsButton id={id} name={name} />
      </Grid>
      <Grid item xs={3} align='center'>
        <RemoveCellsButton id={id} name={name} />
      </Grid>
      <Grid item xs={3} align='center'>
        <MatchMarkersButton
          name={name}
          setMatchedName={setMatchedName}
          setMatchedChannels={setMatchedChannels}
        />
      </Grid>
      <Grid item xs={3} align='center'>
        <ViewChannelsButton name={name} matchedChannels={matchedChannels} />
      </Grid>
      <Grid item xs={12}>
        <FormLabel sx={{ fontSize: 14 }}>Matched Name: </FormLabel>
      </Grid>
      {matchedName ? (
        <Grid item xs={12}>
          <Chip
            label={matchedName}
            size='small'
            style={{ minWidth: '4.6em' }}
            sx={{
              color: textColor,
              backgroundColor: backgroundColor,
              fontWeight: 500,
            }}
          />
        </Grid>
      ) : null}
      <Grid item xs={12}>
        <FormLabel sx={{ fontSize: 14 }}>Matched Channels: </FormLabel>
      </Grid>
      {layers.map((layer, i) => (
        <ColoredChannelChip layer={layer} matchedChannels={matchedChannels} key={i} />
      ))}
      {matchedClosed.map((channel, i) => (
        <Grid item xs={3} key={i}>
          <ChannelChip channel={channel} />
        </Grid>
      ))}
    </Grid>
  );
}

export default CellAccordionContents;
