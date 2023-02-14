import { Grid } from '@mui/material';
import Chip from '@mui/material/Chip';
import FormLabel from '@mui/material/FormLabel';
import { useState } from 'react';
import AddCellsButton from './AddCellsButton';
import ChannelChip from './ChannelChip';
import MatchMarkersButton from './MatchMarkersButton';
import RemoveCellsButton from './RemoveCellsButton';
import ViewChannelsButton from './ViewChannelsButton';

function CellGrid(props) {
  const { id, name, color } = props;
  const [matchedName, setMatchedName] = useState(null);
  const [matchedChannels, setMatchedChannels] = useState(null);

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
            variant='outlined'
            size='small'
            style={{ minWidth: '4.6em' }}
            sx={{ color: color, borderColor: color }}
          />
        </Grid>
      ) : null}
      <Grid item xs={12}>
        <FormLabel sx={{ fontSize: 14 }}>Matched Channels: </FormLabel>
      </Grid>
      {matchedChannels
        ? matchedChannels.map((channel) => (
            <Grid item xs={3}>
              <ChannelChip channel={channel} />
            </Grid>
          ))
        : null}
    </Grid>
  );
}

export default CellGrid;
