import { Box } from '@mui/material';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useEditing, useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';
import DaughterMenu from './DaughterMenu';

function Daughter({ label, daughter, divisionFrame }) {
  const lineage = useSelect();
  const image = useImage();
  const editing = useEditing();

  const onClick = () => {
    lineage.send({ type: 'SET_CELL', cell: daughter });
    image.send({ type: 'SET_FRAME', frame: divisionFrame });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ArcherElement id={`daughter${daughter}`}>
        <Cell label={daughter} onClick={onClick} />
      </ArcherElement>
      {editing && <DaughterMenu parent={label} daughter={daughter} />}
    </Box>
  );
}

export default Daughter;
