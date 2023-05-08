import SpeakerNotesOffTwoToneIcon from '@mui/icons-material/SpeakerNotesOffTwoTone';
import SpeakerNotesTwoToneIcon from '@mui/icons-material/SpeakerNotesTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEditCellTypes } from '../../../../ProjectContext';

function HoverToggle() {
  const editCellTypes = useEditCellTypes();
  const hoveringCard = useSelector(editCellTypes, (state) => state.context.hoveringCard);
  const handleHovering = () => {
    editCellTypes.send('TOGGLE_HOVER');
  };

  return (
    <Tooltip title={hoveringCard ? 'Hover over cell for cell type(s)' : 'Hover disabled'}>
      <IconButton onClick={handleHovering} color='primary' sx={{ width: '100%', borderRadius: 1 }}>
        {hoveringCard ? <SpeakerNotesTwoToneIcon /> : <SpeakerNotesOffTwoToneIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default HoverToggle;
