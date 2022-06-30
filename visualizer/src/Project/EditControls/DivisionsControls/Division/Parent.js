import { useTheme } from '@mui/material/styles';
import React from 'react';
import { ArcherElement } from 'react-archer';
import { useCells, useImage, useSelect } from '../../../ProjectContext';
import Cell from './Cell';

function Parent({ division }) {
  const { parent, daughters, t } = division;
  const cells = useCells();
  const times = cells.getTimes(parent);
  const theme = useTheme();
  const strokeColor = theme.palette.secondary.main;

  const relations = daughters.map((d) => ({
    targetId: `daughter${d}`,
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  }));
  relations.push({
    targetId: 'addDaughter',
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  });

  const select = useSelect();
  const image = useImage();

  const onClick = (e) => {
    select.send({ type: 'SELECT', cell: parent });
    image.send({
      type: 'SET_T',
      t: t ? t - 1 : times[times.length - 1],
    });
  };

  return (
    <ArcherElement id='parent' relations={relations}>
      <Cell cell={parent} onClick={onClick} />
    </ArcherElement>
  );
}

export default Parent;
