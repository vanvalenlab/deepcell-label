import { useTheme } from '@mui/material/styles';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useEditing, useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';

function Parent({ division }) {
  const { label, daughters, divisionFrame, frames } = division;
  const theme = useTheme();
  const strokeColor = theme.palette.secondary.main;
  const editing = useEditing();

  const relations = daughters.map((label) => ({
    targetId: `daughter${label}`,
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  }));
  if (editing) {
    relations.push({
      targetId: 'addDaughter',
      targetAnchor: 'left',
      sourceAnchor: 'right',
      style: { strokeColor, strokeWidth: 1, noCurves: true },
    });
  }

  const select = useSelect();
  const image = useImage();

  const onClick = (e) => {
    select.send({ type: 'SET_CELL', cell: label });
    image.send({
      type: 'SET_FRAME',
      frame: divisionFrame ? divisionFrame - 1 : frames[frames.length - 1],
    });
  };

  return (
    <ArcherElement id='parent' relations={relations}>
      <Cell label={label} onClick={onClick} />
    </ArcherElement>
  );
}

export default Parent;
