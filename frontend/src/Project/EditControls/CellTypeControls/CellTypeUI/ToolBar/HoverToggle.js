import SpeakerNotesOffTwoToneIcon from '@mui/icons-material/SpeakerNotesOffTwoTone';
import SpeakerNotesTwoToneIcon from '@mui/icons-material/SpeakerNotesTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { useCallback, useEffect } from 'react';
import { useEditCellTypes } from '../../../../ProjectContext';

function HoverToggle() {
  const editCellTypes = useEditCellTypes();
  const hoveringCard = useSelector(editCellTypes, (state) => state.context.hoveringCard);
  const handleHovering = useCallback(() => {
    editCellTypes.send('TOGGLE_HOVER');
  }, [editCellTypes]);

  useEffect(() => {
    bind('x', handleHovering);
    return () => {
      unbind('x', handleHovering);
    };
  }, [handleHovering]);

  return (
    <Tooltip
      title={
        hoveringCard ? (
          <span>
            Hover for cell type(s) <kbd>X</kbd>
          </span>
        ) : (
          <span>
            Hover disabled <kbd>X</kbd>
          </span>
        )
      }
      placement='top'
    >
      <IconButton onClick={handleHovering} color='primary' sx={{ width: '100%', borderRadius: 1 }}>
        {hoveringCard ? <SpeakerNotesTwoToneIcon /> : <SpeakerNotesOffTwoToneIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default HoverToggle;
