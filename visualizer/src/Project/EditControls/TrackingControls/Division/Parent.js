import { useTheme } from '@mui/material/styles';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useCells, useEditing, useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';

function Parent({ division }) {
  const { parent, daughters, t } = division;
  const cellsMachine = useCells();
  const cells = useSelector(cellsMachine, (state) => state.context.cells);
  const frames = cells.getFrames(parent);
  const theme = useTheme();
  const strokeColor = theme.palette.secondary.main;
  const editing = useEditing();

  const relations = daughters.map((d) => ({
    targetId: `daughter${d}`,
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
    select.send({ type: 'SELECT', cell: parent });
    image.send({
      type: 'SET_FRAME',
      frame: t ? t - 1 : frames[frames.length - 1],
    });
  };

  return (
    <ArcherElement id='parent' relations={relations}>
      <Cell cell={parent} onClick={onClick} />
    </ArcherElement>
  );
}

export default Parent;
