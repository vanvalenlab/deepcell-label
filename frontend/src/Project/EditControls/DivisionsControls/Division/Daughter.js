import { Box } from '@mui/material';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';
import DaughterMenu from './DaughterMenu';

function Daughter({ division, daughter }) {
  const { parent, t } = division;
  const image = useImage();
  const select = useSelect();

  const onClick = () => {
    select.send({ type: 'SELECT', cell: daughter });
    image.send({ type: 'SET_T', t });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ArcherElement id={`daughter${daughter}`}>
        <Cell cell={daughter} onClick={onClick} />
      </ArcherElement>
      <DaughterMenu parent={parent} daughter={daughter} />
    </Box>
  );
}

export default Daughter;
