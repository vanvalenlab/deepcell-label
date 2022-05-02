import { Box } from '@mui/material';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useEditing, useImage, useLineage } from '../../../ProjectContext';
import Cell from './Cell';
import DaughterMenu from './DaughterMenu';

function Daughter({ parent, daughter, divisionFrame }) {
  const lineage = useLineage();
  const image = useImage();
  const editing = useEditing();

  const onClick = () => {
    console.log('daughter', daughter);
    lineage.send({ type: 'SET_CELL', cell: daughter });
    image.send({ type: 'SET_FRAME', frame: divisionFrame });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ArcherElement id={`daughter${daughter}`}>
        <Cell label={daughter} onClick={onClick} />
      </ArcherElement>
      {editing && <DaughterMenu parent={parent} daughter={daughter} />}
    </Box>
  );
}

export default Daughter;
