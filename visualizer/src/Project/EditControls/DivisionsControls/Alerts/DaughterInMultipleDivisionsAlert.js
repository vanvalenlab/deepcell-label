import Alert from '@mui/material/Alert';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useDivisions, useSelect } from '../../../ProjectContext';
import AlertGroup, { alertStyle } from './AlertGroup';

function DaughterInMultipleDivisionsAlert({ cell }) {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);
  const withDaughter = divisions.filter((d) => d.daughters.includes(cell));

  const select = useSelect();
  const onClick = () => {
    select.send({ type: 'SET_CELL', cell });
  };

  return (
    <Alert sx={alertStyle} severity='error' onClick={onClick}>
      Daughter {cell} in {withDaughter.length} divisions.
    </Alert>
  );
}

function DaughterInMultipleDivisionsAlerts() {
  const divisionsMachine = useDivisions();
  const divisions = useSelector(divisionsMachine, (state) => state.context.divisions);

  const count = divisions.reduce((acc, curr) => {
    for (const daughter of curr.daughters) {
      acc[daughter] = daughter in acc ? acc[daughter] + 1 : 1;
    }
    return acc;
  }, {});

  const multiple = Object.entries(count)
    .filter(([_, count]) => count > 1)
    .map(([cell, _]) => Number(cell));

  const header =
    multiple.length === 1
      ? `1 daughter in multiple divisions`
      : `${multiple.length} daughters in multiple divisions`;
  return (
    multiple.length > 0 && (
      <AlertGroup header={header} severity={'error'}>
        {multiple.map((cell) => (
          <DaughterInMultipleDivisionsAlert cell={cell} key={cell} />
        ))}
      </AlertGroup>
    )
  );
}

export default DaughterInMultipleDivisionsAlerts;
