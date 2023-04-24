import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import Fuse from 'fuse.js';
import { useCellTypes, useRaw } from '../../../ProjectContext';

const getClosestType = (name, markerPanel) => {
  const fuse = new Fuse(markerPanel, {
    keys: ['names'],
  });
  const result = fuse.search(name);
  if (result.length === 0) {
    return { closestName: null, closestChannels: null };
  }
  const closestNames = result[0].item.names;
  const closestChannels = result[0].item.channels;
  const fuseSimple = new Fuse(closestNames);
  const closestName = fuseSimple.search(name)[0].item;
  return { closestName, closestChannels };
};

const findChannels = (fuse, matchedChannels, channelNames) => {
  let foundChannels = [];
  for (let i = 0; i < matchedChannels.length; i++) {
    const result = fuse.search(matchedChannels[i]);
    if (result.length > 0) {
      const index = channelNames.findIndex((e) => e === result[0].item);
      if (!foundChannels.includes(index)) {
        foundChannels.push(index);
      }
    }
  }
  return foundChannels;
};

function MatchMarkersButton(props) {
  const { name, setMatchedName, setMatchedChannels } = props;

  const raw = useRaw();
  const cellTypes = useCellTypes();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const markerPanel = useSelector(cellTypes, (state) => state.context.markerPanel);

  const handleLookUp = (name, markerPanel, channelNames) => {
    const { closestName, closestChannels } = getClosestType(name, markerPanel);
    const fuse = new Fuse(channelNames);
    const foundChannels = findChannels(fuse, closestChannels, channelNames);
    setMatchedName(closestName);
    setMatchedChannels(foundChannels);
  };

  return (
    <Tooltip title='Match Marker Panel' enterDelay={500} enterNextDelay={500}>
      <IconButton
        onClick={() => handleLookUp(name, markerPanel, channelNames)}
        sx={{ width: '100%', borderRadius: 1 }}
      >
        <ManageSearchIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );
}

export default MatchMarkersButton;
