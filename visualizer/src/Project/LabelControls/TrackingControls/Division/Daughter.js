import { Box } from '@mui/material';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';
import DaughterMenu from './DaughterMenu';

function Daughter({ label, daughter, divisionFrame }) {
  const select = useSelect();
  const image = useImage();

  const onClick = () => {
    select.send({ type: 'SET_FOREGROUND', foreground: daughter });
    image.send({ type: 'SET_FRAME', frame: divisionFrame });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ArcherElement id={`daughter${daughter}`}>
        <Cell label={daughter} onClick={onClick} />
      </ArcherElement>
      <DaughterMenu parent={label} daughter={daughter} />
    </Box>
  );
}

export default Daughter;
